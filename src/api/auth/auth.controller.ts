import { asyncHandler } from "./../../middlewares/error.middleware.js";
import { type Request, type Response } from "express";
import * as Auth from "./auth.service.js";
import { success, created, AppError, HttpStatus, ErrorCode } from "../../utils/response.js";

/**
 * Register a new user account.
 *
 * @param req Express request containing validated registration input.
 * @param res Express response used to return the created user payload.
 * @returns A created response with the registration result.
 */
export const handleSignUp = asyncHandler(
    async (req: Request, res: Response) => {
        const result = await Auth.signUp(req.body);

        return created(
            res,
            "User registered successfully",
            result,
            req.originalUrl
        );
    }
);

/**
 * Authenticate a user with email and password.
 *
 * @param req Express request containing validated login credentials.
 * @param res Express response used to return the authenticated session.
 * @returns A success response with the login result.
 */
export const handleSignIn = asyncHandler(
    async (req: Request, res: Response) => {
        const result = await Auth.signIn(req.body);

        return success(res, "Login successful", HttpStatus.OK, result, req.originalUrl);
    }
);

/**
 * Sign out the current authenticated user.
 *
 * @param req Express request containing authentication headers.
 * @param res Express response used to confirm logout.
 * @returns A success response with no payload.
 */
export const handleSignOut = asyncHandler(
    async (req: Request, res: Response) => {
        await Auth.signOut(req.headers);

        return success(res, "Logout successful", HttpStatus.OK, null, req.originalUrl);
    }
);

/**
 * Return the currently authenticated session.
 *
 * @param req Express request containing authentication headers.
 * @param res Express response used to return session data.
 * @returns A success response with the current session.
 * @throws AppError When no active session exists.
 */
export const handleGetMe = asyncHandler(async (req: Request, res: Response) => {
    const session = await Auth.getSession(req.headers);

    if (!session) {
        throw new AppError("No active session found", HttpStatus.UNAUTHORIZED, ErrorCode.INVALID_CREDENTIALS);
    }

    return success(res, "Current user session retrieved", HttpStatus.OK, session, req.originalUrl);
});
