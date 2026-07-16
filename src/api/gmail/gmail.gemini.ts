import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "../../utils/logger.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "PLACEHOLDER";

export interface EmailExtractionResult {
    company: string | null;
    jobTitle: string | null;
    intent:
        | "APPLICATION_CONFIRMATION"
        | "INTERVIEW_INVITE"
        | "REJECTION"
        | "OFFER"
        | "FOLLOW_UP"
        | "STATUS_UPDATE"
        | "OTHER";
    summary: string | null;
    contacts: { name: string; email: string; phone?: string }[] | null;
    matchedApplicationId: string | null;
    matchConfidence: number | null;
}

const EXTRACTION_PROMPT = `You are a job application email analyzer. Given an email and a list of the user's job applications, extract information and match the email to an application.

EMAIL:
Subject: {subject}
From: {senderName} <{sender}>
Body:
{body}

USER'S JOB APPLICATIONS:
{applicationsJson}

TASK:
1. Extract company name, job title, intent, summary, and contacts from the email.
2. Match the email to one of the user's applications by company name and/or job title.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "company": "string or null — company name extracted from email",
  "jobTitle": "string or null — job title extracted from email",
  "intent": "ONE OF: APPLICATION_CONFIRMATION, INTERVIEW_INVITE, REJECTION, OFFER, FOLLOW_UP, STATUS_UPDATE, OTHER",
  "summary": "string or null — 1-2 sentence summary of the email",
  "contacts": [{"name": "...", "email": "...", "phone": "..."}] or null,
  "matchedApplicationId": "string — the id of the matched application, or null if no match",
  "matchConfidence": "number 0-1 — confidence in the match, null if no match"
}

INTENT GUIDELINES:
- APPLICATION_CONFIRMATION: "We received your application", "Application received", acknowledgement
- INTERVIEW_INVITE: Schedule/interview request, "Let's set up a call", screening invite
- REJECTION: "We've decided to move forward with other candidates", "Unfortunately", "not selected"
- OFFER: "We're pleased to offer", "Job offer", "Congratulations"
- FOLLOW_UP: Reminder or follow-up from recruiter/hiring manager
- STATUS_UPDATE: General status update that doesn't fit other categories
- OTHER: Newsletter, marketing, unrelated

MATCHING RULES:
- Match by comparing extracted company to application company (case-insensitive, fuzzy)
- Also compare job title if available
- Return null matchedApplicationId if confidence < 0.5
- If email is clearly not job-related, set intent to OTHER and leave rest null

RULES:
- Return ONLY the JSON object. No markdown, no explanations.
- If you cannot determine a field, use null.
- Contacts should only include people mentioned in the email signature or body (recruiters, hiring managers).`;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

function buildPrompt(
    subject: string,
    sender: string,
    senderName: string,
    body: string,
    applications: { id: string; company: string; jobTitle: string }[]
): string {
    const appsJson = JSON.stringify(
        applications.map((a) => ({
            id: a.id,
            company: a.company,
            jobTitle: a.jobTitle
        })),
        null,
        2
    );

    return EXTRACTION_PROMPT
        .replace("{subject}", subject)
        .replace("{sender}", sender)
        .replace("{senderName}", senderName || "(unknown)")
        .replace("{body}", body.slice(0, 2000))
        .replace("{applicationsJson}", appsJson);
}

export async function extractAndMatch(
    subject: string,
    sender: string,
    senderName: string,
    body: string,
    applications: { id: string; company: string; jobTitle: string }[]
): Promise<EmailExtractionResult | null> {
    if (GEMINI_API_KEY === "PLACEHOLDER") {
        // Mock for development
        return {
            company: null,
            jobTitle: null,
            intent: "OTHER",
            summary: null,
            contacts: null,
            matchedApplicationId: null,
            matchConfidence: null
        };
    }

    const prompt = buildPrompt(subject, sender, senderName, body, applications);

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            logger.warn({ subject }, "Gemini returned non-JSON response");
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]) as EmailExtractionResult;

        // Validate intent enum
        const validIntents = [
            "APPLICATION_CONFIRMATION",
            "INTERVIEW_INVITE",
            "REJECTION",
            "OFFER",
            "FOLLOW_UP",
            "STATUS_UPDATE",
            "OTHER"
        ] as const;
        if (!validIntents.includes(parsed.intent as any)) {
            parsed.intent = "OTHER";
        }

        // Clamp confidence
        if (parsed.matchConfidence !== null) {
            parsed.matchConfidence = Math.max(0, Math.min(1, parsed.matchConfidence));
            if (parsed.matchConfidence < 0.5) {
                parsed.matchedApplicationId = null;
                parsed.matchConfidence = null;
            }
        }

        return parsed;
    } catch (err: any) {
        logger.error({ err, subject }, "Gemini extraction failed");
        return null;
    }
}
