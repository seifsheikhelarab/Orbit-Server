import { google } from "googleapis";
import prisma from "../../utils/prisma.js";
import { AppError, HttpStatus, ErrorCode } from "../../utils/response.js";
import logger from "../../utils/logger.js";
import { getGmailSyncQueue } from "./queue.js";
import type { GmailConnection } from "../../generated/prisma/index.js";

const GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify"
];

const TOKEN_BUFFER_MS = 5 * 60 * 1000; // refresh if <5min remaining

function getOAuth2Client() {
    const redirectUri = process.env.GMAIL_REDIRECT_URI || `${process.env.BETTER_AUTH_URL || "http://localhost:5726"}/api/v1/gmail/callback`;
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
    );
}

export function getConnectUrl(userId: string): string {
    const oauth2 = getOAuth2Client();
    return oauth2.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: GMAIL_SCOPES,
        state: userId
    });
}

export async function handleCallback(userId: string, code: string): Promise<GmailConnection> {
    const oauth2 = getOAuth2Client();

    let tokens;
    try {
        const { tokens: t } = await oauth2.getToken(code);
        tokens = t;
    } catch (err) {
        logger.error({ err }, "Gmail OAuth token exchange failed");
        throw new AppError("Failed to exchange OAuth code", HttpStatus.BAD_REQUEST, "GMAIL_OAUTH_FAILED");
    }

    if (!tokens.access_token || !tokens.refresh_token) {
        throw new AppError("Incomplete tokens from Google", HttpStatus.BAD_REQUEST, "GMAIL_OAUTH_INCOMPLETE");
    }

    // Default to 1 hour from now — refresh logic will trigger if wrong
    const tokenExpiry = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 60 * 60 * 1000);

    const connection = await prisma.gmailConnection.upsert({
        where: { userId },
        create: {
            userId,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiry,
            connectedAt: new Date()
        },
        update: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiry,
            isActive: true,
            lastError: undefined
        }
    });

    logger.info({ userId, connectionId: connection.id }, "Gmail connected");

    // Enqueue initial sync
    try {
        const queue = getGmailSyncQueue();
        await queue.add(`initial-${userId}`, { userId, fullSync: true }, {
            jobId: `gmail-sync-${userId}`,
            removeOnComplete: true
        });
    } catch (err) {
        // Non-critical — user can re-sync manually
        logger.error({ err, userId }, "Failed to enqueue initial sync");
    }

    return connection;
}

export async function disconnect(userId: string): Promise<void> {
    const connection = await prisma.gmailConnection.findUnique({ where: { userId } });

    if (!connection) {
        throw new AppError("Gmail not connected", HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
    }

    await prisma.gmailConnection.update({
        where: { userId },
        data: { isActive: false }
    });

    logger.info({ userId }, "Gmail disconnected");
}

export async function getStatus(userId: string): Promise<{
    connected: boolean;
    lastSyncAt: Date | null;
    isActive: boolean;
    historyId: string | null;
    syncTotal: number;
    syncProcessed: number;
} | null> {
    const connection = await prisma.gmailConnection.findUnique({
        where: { userId },
        select: { isActive: true, lastSyncAt: true, historyId: true, syncTotal: true, syncProcessed: true }
    });

    if (!connection) return null;

    return {
        connected: true,
        lastSyncAt: connection.lastSyncAt,
        isActive: connection.isActive,
        historyId: connection.historyId,
        syncTotal: connection.syncTotal,
        syncProcessed: connection.syncProcessed
    };
}

export async function ensureValidToken(userId: string): Promise<string> {
    const connection = await prisma.gmailConnection.findUnique({ where: { userId } });

    if (!connection) {
        throw new AppError("Gmail not connected", HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
    }

    if (!connection.isActive) {
        throw new AppError("Gmail connection is inactive", HttpStatus.BAD_REQUEST, "GMAIL_INACTIVE");
    }

    const now = Date.now();
    const expiryMs = connection.tokenExpiry?.getTime() ?? 0;
    const bufferMs = now + TOKEN_BUFFER_MS;

    if (expiryMs > bufferMs) {
        return connection.accessToken;
    }

    // Token expiring — refresh it
    try {
        const oauth2 = getOAuth2Client();
        oauth2.setCredentials({
            access_token: connection.accessToken,
            refresh_token: connection.refreshToken
        });

        const { credentials } = await oauth2.refreshAccessToken();

        const updated = await prisma.gmailConnection.update({
            where: { userId },
            data: {
                accessToken: credentials.access_token!,
                tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(Date.now() + 60 * 60 * 1000)
            }
        });

        return updated.accessToken;
    } catch (err) {
        logger.error({ err, userId }, "Gmail token refresh failed");

        await prisma.gmailConnection.update({
            where: { userId },
            data: { isActive: false, lastError: "Token refresh failed" }
        });

        // Create notification
        try {
            await prisma.notification.create({
                data: {
                    userId,
                    type: "FOLLOW_UP_DUE",
                    title: "Gmail connection expired",
                    body: "Your Gmail connection needs to be re-authenticated. Please reconnect in Settings."
                }
            });
        } catch {
            // Best-effort notification
        }

        throw new AppError("Gmail token refresh failed", HttpStatus.UNAUTHORIZED, "GMAIL_TOKEN_EXPIRED");
    }
}

export async function getOAuthClientForApi(userId: string) {
    const token = await ensureValidToken(userId);
    const connection = await prisma.gmailConnection.findUnique({ where: { userId } });

    const oauth2 = getOAuth2Client();
    oauth2.setCredentials({
        access_token: token,
        refresh_token: connection?.refreshToken
    });

    return oauth2;
}

export async function resync(userId: string): Promise<void> {
    const connection = await prisma.gmailConnection.findUnique({ where: { userId } });

    if (!connection) {
        throw new AppError("Gmail not connected", HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
    }

    if (!connection.isActive) {
        throw new AppError("Gmail connection is inactive", HttpStatus.BAD_REQUEST, "GMAIL_INACTIVE");
    }

    // Reset historyId for full sync
    await prisma.gmailConnection.update({
        where: { userId },
        data: { historyId: null, syncTotal: 0, syncProcessed: 0 }
    });

    // Enqueue full sync
    const queue = getGmailSyncQueue();
    await queue.add(`resync-${userId}`, { userId, fullSync: true }, {
        jobId: `gmail-sync-${userId}`,
        removeOnComplete: true
    });

    logger.info({ userId }, "Gmail re-sync queued");
}
