import { asyncHandler } from "./../../middlewares/error.middleware.js";
import { type Request, type Response } from "express";
import { AuthService } from "./auth.service.js";
import {
    ResponseHandler,
    HttpStatus,
    AuthenticationError
} from "../../utils/response.js";

/**
 * Register a new user account.
 *
 * @param req Express request containing validated registration input.
 * @param res Express response used to return the created user payload.
 * @returns A created response with the registration result.
 */
export const handleSignUp = asyncHandler(
    async (req: Request, res: Response) => {
        const result = await AuthService.signUp(req.body);

        return ResponseHandler.created(
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
        const result = await AuthService.signIn(req.body);

        return ResponseHandler.success(
            res,
            "Login successful",
            HttpStatus.OK,
            result,
            req.originalUrl
        );
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
        await AuthService.signOut(req.headers);

        return ResponseHandler.success(
            res,
            "Logout successful",
            HttpStatus.OK,
            null,
            req.originalUrl
        );
    }
);

/**
 * Return the currently authenticated session.
 *
 * @param req Express request containing authentication headers.
 * @param res Express response used to return session data.
 * @returns A success response with the current session.
 * @throws AuthenticationError When no active session exists.
 */
export const handleGetMe = asyncHandler(async (req: Request, res: Response) => {
    const session = await AuthService.getSession(req.headers);

    if (!session) {
        throw new AuthenticationError("No active session found");
    }

    return ResponseHandler.success(
        res,
        "Current user session retrieved",
        HttpStatus.OK,
        session,
        req.originalUrl
    );
});
