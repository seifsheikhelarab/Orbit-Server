import { google, type gmail_v1 } from "googleapis";
import prisma from "../../utils/prisma.js";
import { extractAndMatch } from "./gmail.gemini.js";
import logger from "../../utils/logger.js";
import type { gmailIntent, applicationStatusType } from "../../generated/prisma/index.js";

const INITIAL_SYNC_DAYS = 7;

// ── Auto-transition rules ──────────────────────────────────────────

const AUTO_TRANSITIONS: Partial<Record<gmailIntent, applicationStatusType>> = {
    REJECTION: "CLOSED",
    OFFER: "OFFER"
};

const SUGGEST_INTENTS: gmailIntent[] = [
    "INTERVIEW_INVITE",
    "APPLICATION_CONFIRMATION",
    "FOLLOW_UP"
];

// ── Email decoding ──────────────────────────────────────────────────

interface DecodedEmail {
    messageId: string;
    subject: string;
    sender: string;
    senderName: string;
    snippet: string;
    body: string;
    receivedAt: Date;
    threadId: string;
}

function decodeHeader(value: string | undefined | null): string {
    if (!value) return "";
    // Handle RFC 2047 encoded words: =?UTF-8?B?...?=
    const encodedMatch = value.match(/=\?([^\?]+)\?([QB])\?([^\?]+)\?=/gi);
    if (encodedMatch) {
        return value
            .replace(/=\?([^\?]+)\?([QB])\?([^\?]+)\?=/gi, (_, charset, encoding, data) => {
                try {
                    if (encoding.toUpperCase() === "B") {
                        return Buffer.from(data, "base64").toString("utf-8");
                    }
                    // Q encoding
                    return decodeURIComponent(
                        data.replace(/_/g, " ").replace(/=/g, "%")
                    );
                } catch {
                    return data;
                }
            })
            .trim();
    }
    return value.replace(/<[^>]*>/g, "").trim();
}

function extractSender(fromHeader: string): { email: string; name: string } {
    const match = fromHeader.match(/"?([^"<]*)"?\s*<([^>]+)>/);
    if (match?.[1] && match?.[2]) {
        return { name: match[1].trim(), email: match[2].trim() };
    }
    return { email: fromHeader.trim(), name: "" };
}

function decodeBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
    if (!payload) return "";

    let text = "";

    // Check if this part is the body
    if (payload.body?.data) {
        text += Buffer.from(payload.body.data, "base64").toString("utf-8");
    }

    // Recurse into parts
    if (payload.parts) {
        for (const part of payload.parts) {
            if (part.mimeType === "text/plain" && part.body?.data) {
                text += Buffer.from(part.body.data, "base64").toString("utf-8");
            } else if (part.mimeType === "multipart/alternative" && part.parts) {
                text += decodeBody(part);
            }
        }
    }

    return text;
}

// ── Sync logic ──────────────────────────────────────────────────────

async function fetchMessageIds(
    gmail: gmail_v1.Gmail,
    historyId: string | null,
    fullSync: boolean
): Promise<string[]> {
    const messageIds: string[] = [];
    let pageToken: string | undefined;

    if (!historyId || fullSync) {
        // Initial or full sync: search by date range
        const afterDate = new Date();
        afterDate.setDate(afterDate.getDate() - INITIAL_SYNC_DAYS);
        const after = afterDate.toISOString().split("T")[0]!.replace(/-/g, "/");

        do {
            const res = await gmail.users.messages.list({
                userId: "me",
                q: `after:${after}`,
                maxResults: 100,
                pageToken
            });

            if (res.data.messages) {
                messageIds.push(...res.data.messages.map((m) => m.id!));
            }
            pageToken = res.data.nextPageToken ?? undefined;
        } while (pageToken);
    } else {
        // Incremental sync: use history API
        try {
            let historyToken: string | undefined;
            do {
                const res = await gmail.users.history.list({
                    userId: "me",
                    startHistoryId: historyId,
                    historyTypes: ["messageAdded"],
                    maxResults: 100,
                    pageToken: historyToken
                });

                if (res.data.history) {
                    for (const record of res.data.history) {
                        if (record.messagesAdded) {
                            for (const added of record.messagesAdded) {
                                if (added.message?.id) {
                                    messageIds.push(added.message.id);
                                }
                            }
                        }
                    }
                }
                historyToken = res.data.nextPageToken ?? undefined;
            } while (historyToken);
        } catch (err: any) {
            // historyId too old — fall back to full sync
            if (err?.code === 400 || err?.message?.includes("history")) {
                logger.warn("historyId expired, falling back to full sync");
                return fetchMessageIds(gmail, null, true);
            }
            throw err;
        }
    }

    return messageIds;
}

async function decodeMessage(
    gmail: gmail_v1.Gmail,
    messageId: string
): Promise<DecodedEmail | null> {
    try {
        const msg = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: "full"
        });

        if (!msg.data || !msg.data.payload) return null;

        const headers = msg.data.payload.headers || [];
        const getHeader = (name: string) =>
            headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;

        const subject = decodeHeader(getHeader("Subject")) || "(no subject)";
        const from = getHeader("From") || "";
        const { email, name } = extractSender(from);
        const body = decodeBody(msg.data.payload);
        const snippet = msg.data.snippet || "";
        const receivedAt = new Date(
            parseInt(msg.data.internalDate || "0")
        );

        return {
            messageId,
            subject,
            sender: email,
            senderName: name,
            snippet,
            body,
            receivedAt,
            threadId: msg.data.threadId || ""
        };
    } catch (err: any) {
        logger.error({ err, messageId }, "Failed to decode Gmail message");
        return null;
    }
}

async function processEmail(
    userId: string,
    email: DecodedEmail,
    applications: { id: string; company: string; jobTitle: string }[]
) {
    // Skip if already synced
    const existing = await prisma.inboxEntry.findUnique({
        where: { gmailMessageId: email.messageId }
    });
    if (existing) return;

    // Gemini extract + match
    const extraction = await extractAndMatch(
        email.subject,
        email.sender,
        email.senderName,
        email.body,
        applications
    );

    if (!extraction) {
        // Gemini failed — store raw email with parseFailed
        await prisma.inboxEntry.create({
            data: {
                userId,
                gmailMessageId: email.messageId,
                subject: email.subject,
                sender: email.sender,
                senderName: email.senderName,
                snippet: email.snippet || null,
                receivedAt: email.receivedAt,
                syncedAt: new Date(),
                parseFailed: true,
                matched: false
            }
        });
        return;
    }

    const intent = extraction.intent as gmailIntent;

    // Upsert InboxEntry
    const entry = await prisma.inboxEntry.upsert({
        where: { gmailMessageId: email.messageId },
        create: {
            userId,
            gmailMessageId: email.messageId,
            subject: email.subject,
            sender: email.sender,
            senderName: email.senderName,
            snippet: email.snippet || null,
            receivedAt: email.receivedAt,
            extractedCompany: extraction.company,
            extractedJobTitle: extraction.jobTitle,
            extractedIntent: intent,
            extractedSummary: extraction.summary,
            extractedContacts: extraction.contacts ?? undefined,
            matchedApplicationId: extraction.matchedApplicationId,
            matched: !!extraction.matchedApplicationId,
            matchConfidence: extraction.matchConfidence,
            processedAt: new Date(),
            syncedAt: new Date()
        },
        update: {
            extractedCompany: extraction.company,
            extractedJobTitle: extraction.jobTitle,
            extractedIntent: intent,
            extractedSummary: extraction.summary,
            extractedContacts: extraction.contacts ?? undefined,
            matchedApplicationId: extraction.matchedApplicationId,
            matched: !!extraction.matchedApplicationId,
            matchConfidence: extraction.matchConfidence,
            processedAt: new Date(),
            syncedAt: new Date(),
            parseFailed: false
        }
    });

    if (!extraction.matchedApplicationId) return;

    const appId = extraction.matchedApplicationId;

    // ── Auto-transitions (REJECTION→CLOSED, OFFER→OFFER) ──────────
    const autoStatus = AUTO_TRANSITIONS[intent];
    if (autoStatus) {
        const currentApp = await prisma.jobApplication.findUnique({
            where: { id: appId },
            select: { applicationStatus: true }
        });

        if (currentApp && currentApp.applicationStatus !== autoStatus) {
            await prisma.jobApplication.update({
                where: { id: appId },
                data: { applicationStatus: autoStatus }
            });

            await prisma.statusHistory.create({
                data: {
                    applicationId: appId,
                    fromStatus: currentApp.applicationStatus,
                    toStatus: autoStatus,
                    note: `Auto-transitioned by Gmail: ${email.subject}`
                }
            });

            logger.info(
                { appId, intent, from: currentApp.applicationStatus, to: autoStatus },
                "Auto-transitioned application"
            );
        }
    }

    // ── Pending suggestions (INTERVIEW_INVITE, APPLICATION_CONFIRMATION, FOLLOW_UP) ──
    if (SUGGEST_INTENTS.includes(intent)) {
        const currentApp = await prisma.jobApplication.findUnique({
            where: { id: appId },
            select: { applicationStatus: true }
        });

        // Determine suggested status
        let suggestedStatus: applicationStatusType | null = null;
        if (intent === "INTERVIEW_INVITE") {
            suggestedStatus = "INTERVIEW";
        } else if (intent === "APPLICATION_CONFIRMATION" && currentApp?.applicationStatus === "SAVED") {
            suggestedStatus = "APPLIED";
        }

        // Skip stale suggestions (decision #40)
        if (suggestedStatus && currentApp?.applicationStatus === suggestedStatus) {
            // Don't create — already at suggested status
        } else if (suggestedStatus) {
            await prisma.pendingSuggestion.create({
                data: {
                    applicationId: appId,
                    type: "STATUS_TRANSITION",
                    suggestedValue: { status: suggestedStatus, reason: intent },
                    sourceInboxEntryId: entry.id
                }
            });
        }

        // INTERVIEW_INVITE also suggests creating an interview round
        if (intent === "INTERVIEW_INVITE") {
            // Check no duplicate suggestion
            const existingSuggestion = await prisma.pendingSuggestion.findFirst({
                where: {
                    sourceInboxEntryId: entry.id,
                    type: "INTERVIEW_CREATE"
                }
            });

            if (!existingSuggestion) {
                await prisma.pendingSuggestion.create({
                    data: {
                        applicationId: appId,
                        type: "INTERVIEW_CREATE",
                        suggestedValue: {
                            roundType: "OTHER",
                            notes: extraction.summary || email.subject
                        },
                        sourceInboxEntryId: entry.id
                    }
                });
            }
        }
    }

    // ── Auto-create Contact from extraction ───────────────────────
    if (extraction.contacts && extraction.contacts.length > 0) {
        for (const contact of extraction.contacts) {
            if (!contact.name && !contact.email) continue;

            // Skip if contact with same email already exists
            if (contact.email) {
                const dupe = await prisma.contact.findFirst({
                    where: { applicationId: appId, email: contact.email }
                });
                if (dupe) continue;
            }

            await prisma.contact.create({
                data: {
                    applicationId: appId,
                    name: contact.name || "Unknown",
                    email: contact.email || null,
                    phone: contact.phone || null,
                    source: "gmail-auto"
                }
            });
        }
    }

    // ── Create notification for OFFER and INTERVIEW_INVITE ────────
    if (intent === "OFFER" || intent === "INTERVIEW_INVITE") {
        const app = await prisma.jobApplication.findUnique({
            where: { id: appId },
            select: { company: true, jobTitle: true }
        });

        if (app) {
            const title =
                intent === "OFFER"
                    ? `Offer received from ${app.company}`
                    : `Interview invite from ${app.company}`;

            await prisma.notification.create({
                data: {
                    userId,
                    applicationId: appId,
                    type: "FOLLOW_UP_DUE",
                    title,
                    body: email.subject
                }
            });
        }
    }
}

// ── Main sync entry point ───────────────────────────────────────────

export async function runGmailSync(userId: string, fullSync: boolean): Promise<void> {
    const connection = await prisma.gmailConnection.findUnique({
        where: { userId }
    });

    if (!connection || !connection.isActive) {
        logger.warn({ userId }, "Skipping sync: no active Gmail connection");
        return;
    }

    // Get OAuth client (refreshes token if needed)
    const oauth2 = getOAuth2ClientInternal();
    oauth2.setCredentials({
        access_token: connection.accessToken,
        refresh_token: connection.refreshToken
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2 });

    // Fetch message IDs
    const messageIds = await fetchMessageIds(
        gmail,
        fullSync ? null : connection.historyId,
        fullSync
    );

    logger.info({ userId, count: messageIds.length, fullSync }, "Gmail sync started");

    // Update progress
    await prisma.gmailConnection.update({
        where: { userId },
        data: {
            syncTotal: messageIds.length,
            syncProcessed: 0,
            lastError: null
        }
    });

    // Get user's applications for matching
    const applications = await prisma.jobApplication.findMany({
        where: { userId },
        select: { id: true, company: true, jobTitle: true }
    });

    // Process emails sequentially
    let processed = 0;
    for (const messageId of messageIds) {
        try {
            const email = await decodeMessage(gmail, messageId);
            if (email) {
                await processEmail(userId, email, applications);
            }
        } catch (err: any) {
            logger.error({ err, messageId, userId }, "Failed to process email");
        }

        processed++;
        if (processed % 10 === 0 || processed === messageIds.length) {
            await prisma.gmailConnection.update({
                where: { userId },
                data: { syncProcessed: processed }
            });
        }
    }

    // Get latest historyId from a message
    let newHistoryId = connection.historyId;
    if (messageIds.length > 0) {
        try {
            const lastMsg = await gmail.users.messages.get({
                userId: "me",
                id: messageIds[messageIds.length - 1],
                format: "minimal"
            });
            newHistoryId = lastMsg.data.historyId?.toString() || connection.historyId;
        } catch {
            // Non-critical — next sync will try again
        }
    }

    // Finalize
    await prisma.gmailConnection.update({
        where: { userId },
        data: {
            historyId: newHistoryId,
            lastSyncAt: new Date(),
            syncProcessed: messageIds.length,
            lastError: null
        }
    });

    logger.info(
        { userId, processed: messageIds.length, fullSync },
        "Gmail sync completed"
    );
}

// ── Reset for re-sync ───────────────────────────────────────────────

export async function resetForResync(userId: string): Promise<void> {
    await prisma.gmailConnection.update({
        where: { userId },
        data: {
            historyId: null,
            syncTotal: 0,
            syncProcessed: 0
        }
    });
}

// ── Helper: internal OAuth client (same as gmail.service.ts) ────────

function getOAuth2ClientInternal() {
    const redirectUri =
        process.env.GMAIL_REDIRECT_URI ||
        `${process.env.BETTER_AUTH_URL || "http://localhost:5726"}/api/v1/gmail/callback`;
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
    );
}
