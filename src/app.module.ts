import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { WinstonModule } from "nest-winston";
import { RabbitMQConsumerService, PiqSoftApiService, RegistrationService } from "./services";
import { DbModule } from "./modules/db.module";
import { logger } from "./common/logger";

/**
 * Main application module
 * Configures all services and dependencies for the Fuma Tab Consumer
 */
@Module({
    imports: [
        // HTTP client for API calls
        HttpModule.register({
            timeout: 30000,
            maxRedirects: 3,
        }),

        // Winston logger integration
        WinstonModule.forRoot({
            instance: logger,
        }),

        // Database module
        DbModule,
    ],
    providers: [RabbitMQConsumerService, PiqSoftApiService, RegistrationService],
})
export class AppModule {}
