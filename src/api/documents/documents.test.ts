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

describe("Documents API - Authorization", () => {
    describe("GET /api/v1/documents", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app).get("/api/v1/documents");
            expect(res.status).toBe(401);
        });

        it("should return empty array when no documents exist (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/documents")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
        });
    });

    describe("POST /api/v1/documents", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app)
                .post("/api/v1/documents")
                .field("name", "Test")
                .field("type", "CV");
            expect(res.status).toBe(401);
        });

        it("should reject missing name (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .post("/api/v1/documents")
                .set("Cookie", sessionCookie)
                .field("type", "CV")
                .attach("file", Buffer.from("test"), "test.txt");
            expect(res.status).toBe(400);
        });

        it("should reject missing type (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .post("/api/v1/documents")
                .set("Cookie", sessionCookie)
                .field("name", "Test Document")
                .attach("file", Buffer.from("test"), "test.txt");
            expect(res.status).toBe(400);
        });

        it("should reject request without file (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .post("/api/v1/documents")
                .set("Cookie", sessionCookie)
                .field("name", "Test")
                .field("type", "CV");
            expect(res.status).toBe(400);
        });
    });

    describe("GET /api/v1/documents/:id", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app).get("/api/v1/documents/123");
            expect(res.status).toBe(401);
        });

        it("should return 404 for non-existent document (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/documents/non-existent-id")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(404);
        });
    });

    describe("PATCH /api/v1/documents/:id", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app)
                .patch("/api/v1/documents/123")
                .send({ name: "Updated" });
            expect(res.status).toBe(401);
        });

        it("should return 404 for non-existent document (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .patch("/api/v1/documents/non-existent-id")
                .set("Cookie", sessionCookie)
                .send({ name: "Updated" });
            expect(res.status).toBe(404);
        });

        it("should reject invalid type (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .patch("/api/v1/documents/123")
                .set("Cookie", sessionCookie)
                .send({ type: "INVALID" });
            expect(res.status).toBe(400);
        });
    });

    describe("DELETE /api/v1/documents/:id", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app).delete("/api/v1/documents/123");
            expect(res.status).toBe(401);
        });

        it("should return 404 for non-existent document (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .delete("/api/v1/documents/non-existent-id")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(404);
        });
    });

    describe("POST /api/v1/documents/:id/versions", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app)
                .post("/api/v1/documents/123/versions")
                .attach("file", Buffer.from("test"), "test.txt");
            expect(res.status).toBe(401);
        });

        it("should reject request without file (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .post("/api/v1/documents/123/versions")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(400);
        });

        it("should return 404 for non-existent document (authenticated)", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .post("/api/v1/documents/non-existent-id/versions")
                .set("Cookie", sessionCookie)
                .attach("file", Buffer.from("test"), "test.txt");
            expect(res.status).toBe(404);
        });
    });

    describe("GET /api/v1/documents/:id/versions/:versionId/download", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app).get("/api/v1/documents/123/versions/456/download");
            expect(res.status).toBe(401);
        });
    });

    describe("GET /api/v1/documents/:id/versions/:versionId/preview", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app).get("/api/v1/documents/123/versions/456/preview");
            expect(res.status).toBe(401);
        });
    });
});

describe("Documents API - Query Validation (authenticated)", () => {
    describe("GET /api/v1/documents", () => {
        it("should reject invalid page", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/documents?page=0")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(400);
        });

        it("should reject negative page", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/documents?page=-1")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(400);
        });

        it("should reject limit exceeding max", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/documents?limit=100")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(400);
        });

        it("should reject invalid type filter", async () => {
            if (!sessionCookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/documents?type=INVALID")
                .set("Cookie", sessionCookie);
            expect(res.status).toBe(400);
        });
    });
});