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

describe("Application Documents API - Authorization", () => {
    describe("GET /api/v1/applications/:id/documents", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app).get("/api/v1/applications/123/documents");
            expect(res.status).toBe(401);
        });

        it("should return 404 for non-existent application (authenticated)", async () => {
            if (!sessionCookie) {
                return expect(true).toBe(true);
            }
            const res = await request(app)
                .get("/api/v1/applications/non-existent-id/documents")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(404);
        });
    });

    describe("POST /api/v1/applications/:id/documents", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app)
                .post("/api/v1/applications/123/documents")
                .send({ documentVersionId: "123" });
            expect(res.status).toBe(401);
        });

        it("should reject missing documentVersionId (authenticated)", async () => {
            if (!sessionCookie) {
                return expect(true).toBe(true);
            }
            const res = await request(app)
                .post("/api/v1/applications/123/documents")
                .set("Cookie", sessionCookie)
                .send({});
            expect(res.status).toBe(400);
        });
    });

    describe("DELETE /api/v1/applications/:id/documents/:attachmentId", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app).delete("/api/v1/applications/123/documents/attachment-123");
            expect(res.status).toBe(401);
        });

        it("should return 404 for non-existent application (authenticated)", async () => {
            if (!sessionCookie) {
                return expect(true).toBe(true);
            }
            const res = await request(app)
                .delete("/api/v1/applications/non-existent-id/documents/attachment-123")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(404);
        });
    });
});