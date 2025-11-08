import { Module } from "@nestjs/common";
import { RabbitMQConsumerService } from "../services/rabbitmq-consumer.service";

/**
 * RabbitMQ Module
 * Configures RabbitMQ consumer service
 */
@Module({
    providers: [RabbitMQConsumerService],
    exports: [RabbitMQConsumerService],
})
export class RabbitMQModule {}
