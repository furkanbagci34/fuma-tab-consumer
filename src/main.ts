import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

const logger = new Logger("Bootstrap");

/**
 * Bootstrap the Fuma Tab Consumer application
 */
async function bootstrap(): Promise<void> {
    try {
        // Create NestJS application context (no HTTP server)
        const app = await NestFactory.createApplicationContext(AppModule, {
            logger: ["error", "warn", "log", "debug", "verbose"],
        });

        const environment = process.env.NODE_ENV || "development";

        // Enable graceful shutdown
        app.enableShutdownHooks();

        logger.log(
            `Fuma Tab Consumer application started successfully - environment: ${environment}, timestamp: ${new Date().toISOString()}`,
        );

        // Handle process signals for graceful shutdown
        process.on("SIGTERM", async () => {
            logger.log("SIGTERM received, shutting down gracefully");
            await app.close();
            process.exit(0);
        });

        process.on("SIGINT", async () => {
            logger.log("SIGINT received, shutting down gracefully");
            await app.close();
            process.exit(0);
        });

        // Keep the process running indefinitely
        setInterval(
            () => {
                // This keeps the process alive
            },
            1000 * 60 * 60,
        ); // Check every hour
    } catch (error) {
        logger.error(`Failed to start application - error: ${error.message}, stack: ${error.stack}`);
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
    logger.error(`Unhandled Promise Rejection - reason: ${reason}, promise: ${promise}`);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
    logger.error(`Uncaught Exception - error: ${error.message}, stack: ${error.stack}`);
    process.exit(1);
});

bootstrap();
