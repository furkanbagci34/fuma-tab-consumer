import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import * as amqpConnectionManager from "amqp-connection-manager";
import { ChannelWrapper } from "amqp-connection-manager";
import { ConfirmChannel, ConsumeMessage } from "amqplib";
import { RegistrationService } from "./registration.service";
import { logger } from "../common/logger";

@Injectable()
export class RabbitMQConsumerService implements OnModuleInit, OnModuleDestroy {
    private connection: amqpConnectionManager.AmqpConnectionManager | null = null;
    private channelWrapper: ChannelWrapper | null = null;

    constructor(private readonly registrationService: RegistrationService) {}

    async onModuleInit(): Promise<void> {
        try {
            await this.connect();
            logger.info("RabbitMQ Consumer Service initialized successfully");
        } catch (error) {
            logger.error("Failed to initialize RabbitMQ Consumer Service", {
                error: error.message,
            });
            logger.warn("Service will continue running without RabbitMQ connection");
        }
    }

    async onModuleDestroy(): Promise<void> {
        await this.disconnect();
        logger.info("RabbitMQ Consumer Service destroyed");
    }

    private async connect(): Promise<void> {
        try {
            const rabbitmqUrl =
                process.env.RABBITMQ_URL ||
                "amqp://1gawz7H9ApwrYNSo:nNlnv8kNT37ESJvJVQy8Ifb3tWblDLKy@rabbitmq.fumagpt.com:5672";
            logger.info("Connecting to RabbitMQ...", {
                url: rabbitmqUrl.replace(/\/\/.*@/, "//***:***@"),
            });

            this.connection = amqpConnectionManager.connect([rabbitmqUrl], {
                heartbeatIntervalInSeconds: 30,
                reconnectTimeInSeconds: 5,
            });

            this.connection.on("connect", () => {
                logger.info("Successfully connected to RabbitMQ");
            });

            this.connection.on("connectFailed", (error) => {
                logger.error("RabbitMQ connection failed", error.err?.message || "Unknown error");
            });

            this.connection.on("disconnect", (error) => {
                logger.warn("RabbitMQ connection disconnected", error.err?.message || "Connection lost");
            });

            this.channelWrapper = this.connection.createChannel({
                json: false,
                setup: async (channel: ConfirmChannel) => {
                    await this.setupChannel(channel);
                },
            });

            this.channelWrapper.on("connect", () => {
                logger.info("RabbitMQ channel connected");
            });

            this.channelWrapper.on("error", (error) => {
                logger.error("RabbitMQ channel error", error.message);
            });

            this.channelWrapper.on("close", () => {
                logger.warn("RabbitMQ channel closed");
            });

            await this.channelWrapper.waitForConnect();
            logger.info("RabbitMQ channel is ready");
        } catch (error) {
            logger.error("Failed to connect to RabbitMQ", error.message);
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

            logger.info("RabbitMQ queue setup completed", {
                exchange,
                queue,
                routingKey,
                prefetchCount,
            });

            await channel.consume(
                queue,
                (message: ConsumeMessage | null) => {
                    if (message) {
                        // Handle message asynchronously and catch any unhandled errors
                        this.handleMessage(message, channel).catch((error) => {
                            logger.error("Unhandled error in handleMessage", {
                                error: error instanceof Error ? error.message : String(error),
                                stack: error instanceof Error ? error.stack : undefined,
                            });
                            // Nack the message to prevent it from being lost
                            try {
                                channel.nack(message, false, false);
                            } catch (nackError) {
                                logger.error("Failed to nack message after error", {
                                    error: nackError instanceof Error ? nackError.message : String(nackError),
                                });
                            }
                        });
                    } else {
                        logger.warn("Received null message from queue");
                    }
                },
                {
                    noAck: false,
                },
            );

            logger.info("Started consuming messages from queue", {
                queue,
            });
        } catch (error) {
            logger.error("Failed to setup RabbitMQ channel", error.message);
            throw error;
        }
    }

    private async handleMessage(message: ConsumeMessage, channel: ConfirmChannel): Promise<void> {
        const messageId = message.properties.messageId || "unknown";
        const retryCount = message.properties.headers?.["x-retry-count"] || 1;
        const rawContent = message.content.toString();

        try {
            const queue = process.env.RABBITMQ_QUEUE || "tab-integration-queue";
            logger.info("Raw message received from queue", {
                messageId,
                retryCount,
                queue,
                messageLength: rawContent.length,
            });

            // Log raw content for debugging (first 500 chars to avoid huge logs)
            if (rawContent.length > 0) {
                logger.debug("Message content preview", {
                    messageId,
                    preview: rawContent.substring(0, 500),
                });
            }

            let parsedContent: any;
            try {
                parsedContent = JSON.parse(rawContent);
            } catch (parseError) {
                logger.error("Failed to parse message as JSON", {
                    messageId,
                    retryCount,
                    error: parseError instanceof Error ? parseError.message : String(parseError),
                    rawContent: rawContent.substring(0, 500), // Log first 500 chars for debugging
                });
                // Re-throw as a more descriptive error
                throw new Error(
                    `Invalid JSON format: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
                );
            }

            await this.registrationService.processMessage({ ...parsedContent, messageId }, retryCount);

            channel.ack(message);

            logger.debug("Message processed successfully", {
                messageId,
                retryCount,
            });
        } catch (error) {
            await this.handleMessageError(message, error, messageId, channel, retryCount);
        }
    }

    private async handleMessageError(
        message: ConsumeMessage,
        error: Error | unknown,
        messageId: string,
        channel: ConfirmChannel,
        retryCount: number,
    ): Promise<void> {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("Message processing failed", {
            messageId,
            retryCount,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
        });

        const maxRetryCount = parseInt(process.env.MAX_RETRY_COUNT || "3", 10);
        if (retryCount >= maxRetryCount) {
            logger.error("Max retry attempts reached, message will be rejected", {
                messageId,
                retryCount,
                maxRetries: maxRetryCount,
            });
            // Reject message permanently
            channel.nack(message, false, false);
            return;
        }

        // Try to retry the message
        try {
            logger.info("Retrying message with incremented retryCount", {
                messageId,
                retryCount: retryCount + 1,
                maxRetries: maxRetryCount,
            });

            const rawContent = message.content.toString();
            let parsedContent: any;

            try {
                parsedContent = JSON.parse(rawContent);
            } catch (parseError) {
                logger.error("Failed to parse message for retry - message will be rejected", {
                    messageId,
                    retryCount,
                    parseError: parseError instanceof Error ? parseError.message : String(parseError),
                });
                // If we can't parse, reject the message
                channel.nack(message, false, false);
                return;
            }

            // Publish retry message
            await this.publishMessage(parsedContent, messageId, retryCount + 1);
            // Nack original message (don't requeue, we've published a new one)
            channel.nack(message, false, false);
        } catch (retryError) {
            logger.error("Failed to retry message - message will be rejected", {
                messageId,
                retryCount,
                error: retryError instanceof Error ? retryError.message : String(retryError),
                stack: retryError instanceof Error ? retryError.stack : undefined,
            });
            // If retry fails, reject the message
            channel.nack(message, false, false);
        }
    }

    private async disconnect(): Promise<void> {
        try {
            if (this.channelWrapper) {
                await this.channelWrapper.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            logger.info("Disconnected from RabbitMQ");
        } catch (error) {
            logger.error("Error during RabbitMQ disconnection", error.message);
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

            logger.info("Message published to queue for retry", {
                messageId,
                retryCount,
            });
        } catch (error) {
            logger.error("Failed to publish retry message", {
                messageId,
                retryCount,
                error: error.message,
            });
            throw error;
        }
    }
}
