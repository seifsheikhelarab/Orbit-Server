import { pino, type Logger } from "pino";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

/**
 * Pino logger configuration.
 * Provides structured logging throughout the application.
 * Configured to use pino-pretty for development.
 */
const logger: Logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            singleLine: false,
            ignore: "pid,hostname"
        }
    },
    timestamp: pino.stdTimeFunctions.isoTime
});

export default logger;
