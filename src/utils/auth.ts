import { betterAuth } from "better-auth";
import "dotenv/config";
import { bearer } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma.js";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";

/**
 * better Auth initializer
 */
export const auth = betterAuth({
    baseURL: "http://localhost:5726",
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),
    emailAndPassword: {
        enabled: true
    },
    trustedOrigins: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000"
    ],
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }
    },
    advanced: {
        disableCSRFCheck: true
    },
    plugins: [bearer()]
});

/**
 * Retrieve the current authentication session from request headers.
 *
 * @param headers Request headers containing authentication credentials.
 * @returns The resolved session payload from Better Auth.
 */
export const getAuthContext = async (headers: Request["headers"]) => {
    const session = await auth.api.getSession({
        headers: fromNodeHeaders(headers)
    });
    return session;
};
