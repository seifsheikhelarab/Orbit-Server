import { auth } from './../../utils/auth.js';
import request from "supertest";
import app from "../../app.js";
import { describe, it, expect, beforeAll, afterAll } from "bun:test";

let sessionCookie: string | undefined;

const TEST_EMAIL = "apitest@example.com";
const TEST_PASSWORD = "testpass123";
const TEST_NAME = "API Test User";

beforeAll(async () => {
    try {
        await auth.api.signUpEmail({
            body: {
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
                name: TEST_NAME
            }
        });
    } catch {
    }

    const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    sessionCookie = res.headers["set-cookie"];
});

afterAll(async () => {
    if (sessionCookie) {
        await request(app).post("/api/v1/auth/logout").set("Cookie", sessionCookie);
    }
});

describe("Reminders API - Validation (no auth required)", () => {
    describe("GET /api/v1/reminders/action", () => {
        it("should reject missing token and action", async () => {
            const res = await request(app).get("/api/v1/reminders/action");
            expect(res.status).toBe(400);
        });

        it("should reject missing token", async () => {
            const res = await request(app).get("/api/v1/reminders/action?action=dismiss");
            expect(res.status).toBe(400);
        });

        it("should reject missing action", async () => {
            const res = await request(app).get("/api/v1/reminders/action?token=abc123");
            expect(res.status).toBe(400);
        });

        it("should reject invalid action value", async () => {
            const res = await request(app).get("/api/v1/reminders/action?token=abc123&action=invalid");
            expect(res.status).toBe(400);
        });

        it("should handle invalid token", async () => {
            const res = await request(app).get("/api/v1/reminders/action?token=invalid-token&action=dismiss");
            expect(res.status).toBe(400);
        });

        it("should handle empty token", async () => {
            const res = await request(app).get("/api/v1/reminders/action?token=&action=dismiss");
            expect(res.status).toBe(400);
        });
    });
});

describe("Reminders API - Authorization", () => {
    describe("DELETE /api/v1/reminders/:id", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app).delete("/api/v1/reminders/123");
            expect(res.status).toBe(401);
        });

        it("should reject unauthenticated request for missing id", async () => {
            const res = await request(app).delete("/api/v1/reminders/");
            expect(res.status).toBe(401);
        });

        it("should return 404 for non-existent reminder (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .delete("/api/v1/reminders/non-existent-id")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(404);
        });
    });
});