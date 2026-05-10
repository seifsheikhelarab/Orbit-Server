import { betterAuth } from "better-auth";
import "dotenv/config";
import { bearer } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma.js";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";

/**
 * better Auth initializer
 */
export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5726",
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false
    },
    trustedOrigins: [
        "http://localhost:5173",
        "https://orbit-applications.vercel.app",
        "orbitapp://",
        "exp://",
        "exp://**",
        "exp://192.168.*.*:*/**"
    ],
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!
        }
    },
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60 * 60 * 24
        }
    },
    advanced: {
        disableCSRFCheck: true,
    },
    plugins: [bearer(), expo()]
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
