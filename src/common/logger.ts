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
    ],
});

if (process.env.NODE_ENV !== "production") {
    logger.add(
        new transports.Console({
            format: format.combine(
                format.colorize({
                    all: true,
                    colors: {
                        info: "blue",
                        warn: "yellow",
                        error: "red",
                        debug: "green",
                    },
                }),
                format.printf(({ timestamp, level, message, service, ...meta }) => {
                    let logMessage = `[${timestamp}] ${level}: ${message}`;
                    if (service) {
                        logMessage += ` (${service})`;
                    }
                    if (Object.keys(meta).length > 0) {
                        logMessage += `\n${JSON.stringify(meta, null, 2)}`;
                    }
                    return logMessage;
                }),
            ),
        }),
    );
}
