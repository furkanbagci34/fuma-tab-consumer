import { createLogger, format, transports } from "winston";

const logFormat = format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.json(),
);

export const logger = createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: logFormat,
    defaultMeta: { service: "fuma-tab-consumer" },
    transports: [
        new transports.File({ filename: "logs/error.log", level: "error" }),
        new transports.File({ filename: "logs/combined.log" }),
        // Always add console transport for Docker logs
        new transports.Console({
            format: format.combine(
                format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
                format.printf(({ timestamp, level, message, service, ...meta }) => {
                    let logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
                    if (service) {
                        logMessage += ` (${service})`;
                    }
                    if (Object.keys(meta).length > 0) {
                        logMessage += ` ${JSON.stringify(meta)}`;
                    }
                    return logMessage;
                }),
            ),
        }),
    ],
});
