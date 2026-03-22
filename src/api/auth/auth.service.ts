import { auth } from "../../utils/auth.js";
import {
    AuthenticationError,
    AppError,
    HttpStatus,
    ErrorCode
} from "../../utils/response.js";
import type { RegisterInput, LoginInput } from "./auth.schemas.js";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";

export class AuthService {
    /**
     * Create a new user account using email/password credentials.
     *
     * @param data Validated registration payload.
     * @returns The Better Auth sign-up result.
     * @throws AppError When registration fails or the user already exists.
     */
    static async signUp(data: RegisterInput) {
        try {
            const result = await auth.api.signUpEmail({
                body: {
                    email: data.email,
                    password: data.password,
                    name: data.name,
                    image: data.image
                }
            });
            return result;
        } catch (error: unknown) {
            const err = error as { 
                status?: number; 
                code?: string; 
                message?: string;
            };
            if (
                err.code === "USER_ALREADY_EXISTS" ||
                err.message?.includes("already exists")
            ) {
                throw new AppError(
                    "User with this email already exists",
                    HttpStatus.BAD_REQUEST,
                    ErrorCode.RESOURCE_ALREADY_EXISTS
                );
            }
            throw new AppError(
                err.message || "Failed to sign up",
                err.status || HttpStatus.INTERNAL_SERVER_ERROR,
                ErrorCode.SERVER_ERROR
            );
        }
    }

    /**
     * Authenticate an existing user with email/password credentials.
     *
     * @param data Validated login payload.
     * @returns The Better Auth sign-in result.
     * @throws AuthenticationError When credentials are invalid.
     * @throws AppError When sign-in fails for other reasons.
     */
    static async signIn(data: LoginInput) {
        try {
            const result = await auth.api.signInEmail({
                body: {
                    email: data.email,
                    password: data.password
                }
            });
            return result;
        } catch (error: unknown) {
            const err = error as { 
                status?: number; 
                code?: string; 
                message?: string;
            };
            if (
                err.status === 401 ||
                err.code === "INVALID_EMAIL_OR_PASSWORD" ||
                err.message === "Invalid email or password"
            ) {
                throw new AuthenticationError("Invalid email or password");
            }
            throw new AppError(
                err.message || "Failed to sign in",
                err.status || HttpStatus.INTERNAL_SERVER_ERROR,
                ErrorCode.SERVER_ERROR
            );
        }
    }

    /**
     * Revoke the current authenticated session.
     *
     * @param headers Request headers containing session credentials.
     * @returns A promise that resolves when sign-out succeeds.
     * @throws AppError When sign-out fails.
     */
    static async signOut(headers: Request["headers"]) {
        try {
            await auth.api.signOut({
                headers: fromNodeHeaders(headers)
            });
        } catch {
            throw new AppError(
                "Failed to sign out",
                HttpStatus.INTERNAL_SERVER_ERROR,
                ErrorCode.SERVER_ERROR
            );
        }
    }

    /**
     * Fetch the current authenticated session.
     *
     * @param headers Request headers containing session credentials.
     * @returns The active session or `null` when session retrieval fails.
     */
    static async getSession(headers: Request["headers"]) {
        try {
            const session = await auth.api.getSession({
                headers: fromNodeHeaders(headers)
            });
            return session;
        } catch {
            return null;
        }
    }
}
