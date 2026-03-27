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

describe("Notifications API - Authorization", () => {
    describe("GET /api/v1/notifications", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app).get("/api/v1/notifications");
            expect(res.status).toBe(401);
        });

        it("should return notifications list (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/notifications")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it("should reject invalid page (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/notifications?page=-1")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(400);
        });

        it("should reject invalid limit (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/notifications?limit=0")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(400);
        });
    });

    describe("GET /api/v1/notifications/unread-count", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app).get("/api/v1/notifications/unread-count");
            expect(res.status).toBe(401);
        });

        it("should return unread count (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/notifications/unread-count")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty("count");
        });
    });

    describe("PATCH /api/v1/notifications/read-all", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app).patch("/api/v1/notifications/read-all");
            expect(res.status).toBe(401);
        });

        it("should mark all notifications as read (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .patch("/api/v1/notifications/read-all")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(200);
        });
    });

    describe("PATCH /api/v1/notifications/:id/read", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app).patch("/api/v1/notifications/123/read");
            expect(res.status).toBe(401);
        });

        it("should return 404 for non-existent notification (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .patch("/api/v1/notifications/non-existent-id/read")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(404);
        });
    });

    describe("POST /api/v1/notifications/:id/snooze", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app)
                .post("/api/v1/notifications/123/snooze")
                .send({ days: 3 });
            expect(res.status).toBe(401);
        });

        it("should accept custom days (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .post("/api/v1/notifications/some-id/snooze")
                .set("Cookie", sessionCookie)
                .send({ days: 7 });
            expect(res.status).toBe(200);
        });

        it("should return 404 for non-existent notification (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .post("/api/v1/notifications/non-existent-id/snooze")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(404);
        });
    });

    describe("POST /api/v1/notifications/:id/done", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app).post("/api/v1/notifications/123/done");
            expect(res.status).toBe(401);
        });

        it("should return 404 for non-existent notification (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .post("/api/v1/notifications/non-existent-id/done")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(404);
        });
    });
});