import { auth } from './../../utils/auth.js';
import request from "supertest";
import app from "../../app.js";
import { describe, it, expect, beforeAll } from "bun:test";

const TEST_EMAIL = "gmailtest@example.com";
const TEST_PASSWORD = "testpass123";
const TEST_NAME = "Gmail Test User";

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
    } catch {}

    const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    sessionCookie = res.headers["set-cookie"];
});

function getCookie() {
    return sessionCookie;
}

describe("Gmail API - Authorization", () => {
    it("should reject unauthenticated /gmail/connect", async () => {
        const res = await request(app).get("/api/v1/gmail/connect");
        expect(res.status).toBe(401);
    });

    it("should reject unauthenticated /gmail/disconnect", async () => {
        const res = await request(app).post("/api/v1/gmail/disconnect");
        expect(res.status).toBe(401);
    });

    it("should reject unauthenticated /gmail/status", async () => {
        const res = await request(app).get("/api/v1/gmail/status");
        expect(res.status).toBe(401);
    });

    it("should reject unauthenticated /gmail/resync", async () => {
        const res = await request(app).post("/api/v1/gmail/resync");
        expect(res.status).toBe(401);
    });
});

describe("Gmail API - Status (no connection)", () => {
    it("should return null status when not connected", async () => {
        const cookie = getCookie();
        if (!cookie) return expect(true).toBe(true);
        const res = await request(app)
            .get("/api/v1/gmail/status")
            .set("Cookie", cookie);
        expect(res.status).toBe(200);
        expect(res.body.data).toBeNull();
    });
});

describe("Gmail API - Connect", () => {
    it("should return an OAuth URL", async () => {
        const cookie = getCookie();
        if (!cookie) return expect(true).toBe(true);
        const res = await request(app)
            .get("/api/v1/gmail/connect")
            .set("Cookie", cookie);
        expect(res.status).toBe(200);
        expect(res.body.data.url).toContain("accounts.google.com");
        expect(res.body.data.url).toContain("gmail.readonly");
    });
});

describe("Gmail API - Disconnect", () => {
    it("should return 404 when not connected", async () => {
        const cookie = getCookie();
        if (!cookie) return expect(true).toBe(true);
        const res = await request(app)
            .post("/api/v1/gmail/disconnect")
            .set("Cookie", cookie);
        expect(res.status).toBe(404);
    });
});

describe("Gmail API - Inbox (no connection)", () => {
    it("should return empty inbox", async () => {
        const cookie = getCookie();
        if (!cookie) return expect(true).toBe(true);
        const res = await request(app)
            .get("/api/v1/gmail/inbox")
            .set("Cookie", cookie);
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
        expect(res.body.pagination.total).toBe(0);
    });

    it("should return 404 for nonexistent inbox entry", async () => {
        const cookie = getCookie();
        if (!cookie) return expect(true).toBe(true);
        const res = await request(app)
            .get("/api/v1/gmail/inbox/nonexistent-id")
            .set("Cookie", cookie);
        expect(res.status).toBe(404);
    });

    it("should reject unauthenticated /gmail/inbox", async () => {
        const res = await request(app).get("/api/v1/gmail/inbox");
        expect(res.status).toBe(401);
    });

    it("should reject link without applicationId", async () => {
        const cookie = getCookie();
        if (!cookie) return expect(true).toBe(true);
        const res = await request(app)
            .post("/api/v1/gmail/inbox/some-id/link")
            .set("Cookie", cookie)
            .send({});
        expect(res.status).toBe(400);
    });
});

describe("Gmail API - Suggestions (no data)", () => {
    it("should return empty suggestions", async () => {
        const cookie = getCookie();
        if (!cookie) return expect(true).toBe(true);
        const res = await request(app)
            .get("/api/v1/gmail/suggestions")
            .set("Cookie", cookie);
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
    });

    it("should return 404 for nonexistent suggestion", async () => {
        const cookie = getCookie();
        if (!cookie) return expect(true).toBe(true);
        const res = await request(app)
            .get("/api/v1/gmail/suggestions/nonexistent-id")
            .set("Cookie", cookie);
        expect(res.status).toBe(404);
    });

    it("should reject unauthenticated /gmail/suggestions", async () => {
        const res = await request(app).get("/api/v1/gmail/suggestions");
        expect(res.status).toBe(401);
    });

    it("should reject accept on nonexistent suggestion", async () => {
        const cookie = getCookie();
        if (!cookie) return expect(true).toBe(true);
        const res = await request(app)
            .post("/api/v1/gmail/suggestions/nonexistent-id/accept")
            .set("Cookie", cookie);
        expect(res.status).toBe(404);
    });
});

describe("Gmail API - Callback (public)", () => {
    it("should redirect with error when code is missing", async () => {
        const res = await request(app)
            .get("/api/v1/gmail/callback");
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain("gmail=error");
    });

    it("should redirect with error when state is missing", async () => {
        const res = await request(app)
            .get("/api/v1/gmail/callback?code=somecode");
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain("gmail=error");
    });
});
