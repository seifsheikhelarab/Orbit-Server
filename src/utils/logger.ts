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
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level: (label) => {
            return { level: label.toUpperCase() };
        }
    },
    base: {
        env: process.env.NODE_ENV,
        service: 'Orbit-Server',
    },
    transport: process.env.LOCAL ? { target: "pino-pretty", options: { colorize: true } } : undefined
});

export default logger;
