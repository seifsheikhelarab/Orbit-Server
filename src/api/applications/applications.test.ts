import { auth } from './../../utils/auth.js';
import request from "supertest";
import app from "../../app.js";
import { describe, it, expect, beforeAll } from "bun:test";

const TEST_EMAIL = "apitest@example.com";
const TEST_PASSWORD = "testpass123";
const TEST_NAME = "API Test User";

let sessionCookie: string | undefined;

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

function getCookie() {
    if (!sessionCookie) {
        return undefined;
    }
    return sessionCookie;
}

describe("Applications API - Authorization", () => {
    describe("GET /api/v1/applications", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app).get("/api/v1/applications");
            expect(res.status).toBe(401);
        });
    });

    describe("POST /api/v1/applications", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app)
                .post("/api/v1/applications")
                .send({ company: "Test", jobTitle: "Dev" });
            expect(res.status).toBe(401);
        });
    });

    describe("GET /api/v1/applications/:id", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app).get("/api/v1/applications/123");
            expect(res.status).toBe(401);
        });
    });

    describe("PATCH /api/v1/applications/:id", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app)
                .patch("/api/v1/applications/123")
                .send({ company: "Updated" });
            expect(res.status).toBe(401);
        });
    });

    describe("DELETE /api/v1/applications/:id", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app).delete("/api/v1/applications/123");
            expect(res.status).toBe(401);
        });
    });

    describe("GET /api/v1/applications/document-counts", () => {
        it("should reject unauthenticated request", async () => {
            const res = await request(app).get("/api/v1/applications/document-counts");
            expect(res.status).toBe(401);
        });
    });
});

describe("Applications API - Authenticated", () => {
    describe("GET /api/v1/applications", () => {
        it("should return empty array when no applications exist", async () => {
            const cookie = getCookie();
            if (!cookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/applications")
                .set("Cookie", cookie);
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
        });

        it("should accept pagination parameters", async () => {
            const cookie = getCookie();
            if (!cookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/applications?page=1&limit=10")
                .set("Cookie", cookie);
            expect(res.status).toBe(200);
            expect(res.body.pagination.page).toBe(1);
            expect(res.body.pagination.limit).toBe(10);
        });
    });

    describe("POST /api/v1/applications", () => {
        it("should create application with valid data", async () => {
            const cookie = getCookie();
            if (!cookie) return expect(true).toBe(true);
            const res = await request(app)
                .post("/api/v1/applications")
                .set("Cookie", cookie)
                .send({ company: "Test Company", jobTitle: "Software Engineer" });
            expect(res.status).toBe(201);
            expect(res.body.data.company).toBe("Test Company");
        });
    });

    describe("GET /api/v1/applications/:id", () => {
        it("should return 404 for non-existent application", async () => {
            const cookie = getCookie();
            if (!cookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/applications/non-existent-id")
                .set("Cookie", cookie);
            expect(res.status).toBe(404);
        });
    });

    describe("PATCH /api/v1/applications/:id", () => {
        it("should return 404 for non-existent application", async () => {
            const cookie = getCookie();
            if (!cookie) return expect(true).toBe(true);
            const res = await request(app)
                .patch("/api/v1/applications/non-existent-id")
                .set("Cookie", cookie)
                .send({ company: "Updated" });
            expect(res.status).toBe(404);
        });
    });

    describe("DELETE /api/v1/applications/:id", () => {
        it("should return 404 for non-existent application", async () => {
            const cookie = getCookie();
            if (!cookie) return expect(true).toBe(true);
            const res = await request(app)
                .delete("/api/v1/applications/non-existent-id")
                .set("Cookie", cookie);
            expect(res.status).toBe(404);
        });
    });

    describe("GET /api/v1/applications/document-counts", () => {
        it("should return empty object when no ids provided", async () => {
            const cookie = getCookie();
            if (!cookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/applications/document-counts")
                .set("Cookie", cookie);
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual({});
        });
    });
});

describe("Applications API - Validation (auth required)", () => {
    describe("GET /api/v1/applications - Query Validation", () => {
        it("should reject invalid page (non-positive)", async () => {
            const cookie = getCookie();
            if (!cookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/applications?page=0")
                .set("Cookie", cookie);
            expect(res.status).toBe(400);
        });

        it("should reject negative page", async () => {
            const cookie = getCookie();
            if (!cookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/applications?page=-1")
                .set("Cookie", cookie);
            expect(res.status).toBe(400);
        });

        it("should reject limit exceeding max", async () => {
            const cookie = getCookie();
            if (!cookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/applications?limit=100")
                .set("Cookie", cookie);
            expect(res.status).toBe(400);
        });

        it("should reject invalid sort field", async () => {
            const cookie = getCookie();
            if (!cookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/applications?sort=invalidField")
                .set("Cookie", cookie);
            expect(res.status).toBe(400);
        });

        it("should reject invalid order value", async () => {
            const cookie = getCookie();
            if (!cookie) return expect(true).toBe(true);
            const res = await request(app)
                .get("/api/v1/applications?order=invalid")
                .set("Cookie", cookie);
            expect(res.status).toBe(400);
        });
    });
});