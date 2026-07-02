import { auth } from "../../utils/auth.js";
import { AppError, HttpStatus, ErrorCode } from "../../utils/response.js";
import type { RegisterInput, LoginInput } from "./auth.schemas.js";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";

export async function signUp(data: RegisterInput) {
    try {
        return await auth.api.signUpEmail({ body: { email: data.email, password: data.password, name: data.name, image: data.image } });
    } catch (error: unknown) {
        const err = error as { status?: number; code?: string; message?: string };
        if (err.code === "USER_ALREADY_EXISTS" || err.message?.includes("already exists"))
            throw new AppError("User with this email already exists", HttpStatus.BAD_REQUEST, ErrorCode.RESOURCE_ALREADY_EXISTS);
        throw new AppError(err.message || "Failed to sign up", err.status || HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.SERVER_ERROR);
    }
}

export async function signIn(data: LoginInput) {
    try {
        return await auth.api.signInEmail({ body: { email: data.email, password: data.password } });
    } catch (error: unknown) {
        const err = error as { status?: number; code?: string; message?: string };
        if (err.status === 401 || err.code === "INVALID_EMAIL_OR_PASSWORD" || err.message === "Invalid email or password")
            throw new AppError("Invalid email or password", HttpStatus.UNAUTHORIZED, ErrorCode.INVALID_CREDENTIALS);
        throw new AppError(err.message || "Failed to sign in", err.status || HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.SERVER_ERROR);
    }
}

export async function signOut(headers: Request["headers"]) {
    try { await auth.api.signOut({ headers: fromNodeHeaders(headers) }); }
    catch { throw new AppError("Failed to sign out", HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.SERVER_ERROR); }
}

export async function getSession(headers: Request["headers"]) {
    try { return await auth.api.getSession({ headers: fromNodeHeaders(headers) }); }
    catch { return null; }
}
