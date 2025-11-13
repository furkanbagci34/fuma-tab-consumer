import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import * as amqpConnectionManager from "amqp-connection-manager";
import { ChannelWrapper } from "amqp-connection-manager";
import { ConfirmChannel, ConsumeMessage } from "amqplib";
import { RegistrationService } from "./registration.service";

@Injectable()
export class RabbitMQConsumerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RabbitMQConsumerService.name);
    private connection: amqpConnectionManager.AmqpConnectionManager | null = null;
    private channelWrapper: ChannelWrapper | null = null;

    constructor(private readonly registrationService: RegistrationService) {}

    async onModuleInit(): Promise<void> {
        try {
            await this.connect();
            this.logger.log("RabbitMQ Consumer Service initialized successfully");
        } catch (error) {
            this.logger.error(`Failed to initialize RabbitMQ Consumer Service - error: ${error.message}`);
            this.logger.warn("Service will continue running without RabbitMQ connection");
        }
    }

    async onModuleDestroy(): Promise<void> {
        await this.disconnect();
        this.logger.log("RabbitMQ Consumer Service destroyed");
    }

    private async connect(): Promise<void> {
        try {
            const rabbitmqUrl =
                process.env.RABBITMQ_URL ||
                "amqp://1gawz7H9ApwrYNSo:nNlnv8kNT37ESJvJVQy8Ifb3tWblDLKy@rabbitmq.fumagpt.com:5672";
            this.logger.log(`Connecting to RabbitMQ... - url: ${rabbitmqUrl.replace(/\/\/.*@/, "//***:***@")}`);

            this.connection = amqpConnectionManager.connect([rabbitmqUrl], {
                heartbeatIntervalInSeconds: 30,
                reconnectTimeInSeconds: 5,
            });

            this.connection.on("connect", () => {
                this.logger.log("Successfully connected to RabbitMQ");
            });

            this.connection.on("connectFailed", (error) => {
                this.logger.error(`RabbitMQ connection failed - ${error.err?.message || "Unknown error"}`);
            });

            this.connection.on("disconnect", (error) => {
                this.logger.warn(`RabbitMQ connection disconnected - ${error.err?.message || "Connection lost"}`);
            });

            this.channelWrapper = this.connection.createChannel({
                json: false,
                setup: async (channel: ConfirmChannel) => {
                    await this.setupChannel(channel);
                },
            });

            this.channelWrapper.on("connect", () => {
                this.logger.log("RabbitMQ channel connected");
            });

            this.channelWrapper.on("error", (error) => {
                this.logger.error(`RabbitMQ channel error - ${error.message}`);
            });

            this.channelWrapper.on("close", () => {
                this.logger.warn("RabbitMQ channel closed");
            });

            await this.channelWrapper.waitForConnect();
            this.logger.log("RabbitMQ channel is ready");
        } catch (error) {
            this.logger.error(`Failed to connect to RabbitMQ - ${error.message}`);
            throw error;
        }
    }

    private async setupChannel(channel: ConfirmChannel): Promise<void> {
        try {
            const exchange = process.env.RABBITMQ_EXCHANGE || "fuma-tab-exchange";
            const queue = process.env.RABBITMQ_QUEUE || "tab-integration-queue";
            const routingKey = process.env.RABBITMQ_ROUTING_KEY || "tab-integration";
            const prefetchCount = parseInt(process.env.RABBITMQ_PREFETCH_COUNT || "1", 10);

            await channel.assertExchange(exchange, "topic", {
                durable: true,
            });

            await channel.assertQueue(queue, {
                durable: true,
            });

            await channel.bindQueue(queue, exchange, routingKey);

            await channel.prefetch(prefetchCount);

            this.logger.log(
                `RabbitMQ queue setup completed - exchange: ${exchange}, queue: ${queue}, routingKey: ${routingKey}, prefetchCount: ${prefetchCount}`,
            );

            await channel.consume(
                queue,
                (message: ConsumeMessage | null) => {
                    if (message) {
                        this.handleMessage(message, channel);
                    } else {
                        this.logger.warn("Received null message from queue");
                    }
                },
                {
                    noAck: false,
                },
            );

            this.logger.log(`Started consuming messages from queue - queue: ${queue}`);
        } catch (error) {
            this.logger.error(`Failed to setup RabbitMQ channel - ${error.message}`);
            throw error;
        }
    }

    private async handleMessage(message: ConsumeMessage, channel: ConfirmChannel): Promise<void> {
        const messageId = message.properties.messageId || "unknown";
        const retryCount = message.properties.headers?.["x-retry-count"] || 1;
        const rawContent = message.content.toString();

        try {
            const queue = process.env.RABBITMQ_QUEUE || "tab-integration-queue";
            this.logger.log(
                `Raw message received from queue - messageId: ${messageId}, retryCount: ${retryCount}, queue: ${queue}`,
            );

            const parsedContent = JSON.parse(rawContent);

            await this.registrationService.processMessage({ ...parsedContent, messageId }, retryCount);

            channel.ack(message);

            this.logger.debug(`Message processed successfully - messageId: ${messageId}, retryCount: ${retryCount}`);
        } catch (error) {
            await this.handleMessageError(message, error, messageId, channel, retryCount);
        }
    }

    private async handleMessageError(
        message: ConsumeMessage,
        error: Error,
        messageId: string,
        channel: ConfirmChannel,
        retryCount: number,
    ): Promise<void> {
        this.logger.error(
            `Message processing failed - messageId: ${messageId}, retryCount: ${retryCount}, error: ${error.message}`,
        );

        const maxRetryCount = parseInt(process.env.MAX_RETRY_COUNT || "3", 10);
        if (retryCount >= maxRetryCount) {
            this.logger.error(
                `Max retry attempts reached, message will be rejected - messageId: ${messageId}, retryCount: ${retryCount}, maxRetries: ${maxRetryCount}`,
            );
        } else {
            this.logger.log(
                `Retrying message with incremented retryCount - messageId: ${messageId}, retryCount: ${retryCount + 1}, maxRetries: ${maxRetryCount}`,
            );

            const rawContent = message.content.toString();
            const parsedContent = JSON.parse(rawContent);

            await this.publishMessage(parsedContent, messageId, retryCount + 1);
        }
        channel.nack(message, false, false);
    }

    private async disconnect(): Promise<void> {
        try {
            if (this.channelWrapper) {
                await this.channelWrapper.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            this.logger.log("Disconnected from RabbitMQ");
        } catch (error) {
            this.logger.error(`Error during RabbitMQ disconnection - ${error.message}`);
        }
    }

    isConnected(): boolean {
        return this.connection?.isConnected() || false;
    }

    async publishMessage(data: any, messageId: string, retryCount: number = 0): Promise<void> {
        if (!this.channelWrapper) {
            throw new Error("RabbitMQ channel is not available");
        }

        try {
            const message = JSON.stringify(data);

            const exchange = process.env.RABBITMQ_EXCHANGE || "fuma-tab-exchange";
            const routingKey = process.env.RABBITMQ_ROUTING_KEY || "tab-integration";
            await this.channelWrapper.publish(exchange, routingKey, Buffer.from(message), {
                messageId,
                persistent: true,
                contentType: "application/json",
                headers: {
                    "x-retry-count": retryCount,
                },
            });

            this.logger.log(
                `Message published to queue for retry - messageId: ${messageId}, retryCount: ${retryCount}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to publish retry message - messageId: ${messageId}, retryCount: ${retryCount}, error: ${error.message}`,
            );
            throw error;
        }
    }
}
