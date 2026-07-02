import { type Response } from "express";
import logger from "./logger.js";

export enum HttpStatus {
    // Success
    OK = 200,
    CREATED = 201,

    // Client errors
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    IM_A_TEAPOT = 418,
    TOO_MANY_REQUESTS = 429,

    // Server errors
    INTERNAL_SERVER_ERROR = 500,
    NOT_IMPLEMENTED = 501
}

export enum ErrorCode {
    // Auth errors
    INVALID_CREDENTIALS = "AUTH_OO1",
    USER_NOT_FOUND = "AUTH_OO2",
    USER_ALREADY_EXISTS = "AUTH_OO3",
    INVALID_TOKEN = "AUTH_OO4",
    EXPIRED_TOKEN = "AUTH_OO5",

    // Validation errors
    VALIDATION_ERROR = "VAL_OO1",
    INVALID_INPUT = "VAL_OO2",
    MISSING_INPUT = "VAL_OO3",

    // Resource errors
    RESOURCE_NOT_FOUND = "RES_OO1",
    RESOURCE_ALREADY_EXISTS = "RES_OO2",
    RESOURCE_CONFLICT = "RES_OO3",
    RESOURCE_LIMIT_REACHED = "RES_OO4",
    RESOURCE_NOT_ALLOWED = "RES_OO5",

    // Server errors
    SERVER_ERROR = "SRV_OO1",
    NOT_IMPLEMENTED = "SRV_OO2",
    DATABASE_ERROR = "SRV_OO3"
}

export interface SuccessResponse<T> {
    message: string;
    data?: T;
    timestamp: Date;
    path?: string;
}

export interface ErrorResponse {
    message: string;
    code: ErrorCode;
    status: HttpStatus;
    timestamp: Date;
    path?: string;
    details?: Record<string, unknown>;
}

export function success<T>(res: Response, message: string, status: HttpStatus, data?: T, path?: string): Response {
    return res.status(status).json({ message, data, timestamp: new Date(), path });
}

export function error(
    res: Response,
    message: string,
    code: ErrorCode,
    status: HttpStatus,
    path?: string,
    details?: Record<string, unknown>
): Response {
    return res.status(status).json({ message, code, status, timestamp: new Date(), path, details });
}

export function paginated<T>(res: Response, data: T[], message: string, page: number, limit: number, total: number, path?: string): Response {
    return res.status(HttpStatus.OK).json({
        success: true, message, data,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        timestamp: new Date().toISOString(), path
    });
}

export function created<T>(res: Response, message: string, data: T, path?: string): Response {
    return success(res, message, HttpStatus.CREATED, data, path);
}

export class AppError extends Error {
    constructor(
        message: string,
        public status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
        public code: ErrorCode | string = ErrorCode.SERVER_ERROR,
        public details?: Record<string, unknown>
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}


