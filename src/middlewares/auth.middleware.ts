import { type Request, type Response, type NextFunction } from 'express';
import { auth } from '../utils/auth.js';
import {
    AuthenticationError
} from '../utils/response.js';
import { asyncHandler } from './error.middleware.js';
import { fromNodeHeaders } from 'better-auth/node';

export type AuthenticatedRequest = Request & {
    user: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        emailVerified: boolean;
        name: string;
        image?: string | null | undefined;
    };
    session: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        expiresAt: Date;
        token: string;
        ipAddress?: string | null | undefined;
        userAgent?: string | null | undefined;
    };
};

export const protect = asyncHandler<AuthenticatedRequest>(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers)
        });

        if (!session) {
            throw new AuthenticationError(
                'Authentication required. Please log in.'
            );
        }

        req.user = session.user;
        req.session = session.session;

        next();
    }
);
