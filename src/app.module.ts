import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { RabbitMQConsumerService, PiqSoftApiService, RegistrationService } from "./services";
import { DbModule } from "./modules/db.module";

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

        // Database module
        DbModule,
    ],
    providers: [RabbitMQConsumerService, PiqSoftApiService, RegistrationService],
})
export class AppModule {}
