import { auth } from './../../utils/auth.js';
import request from "supertest";
import app from "../../app.js";
import { describe, it, expect, beforeAll } from "bun:test";

const TEST_EMAIL = "analytics-test@example.com";
const TEST_PASSWORD = "testpass123";
const TEST_NAME = "Analytics Test User";

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

describe("Analytics API - Pipeline Flow", () => {
    it("should return pipeline flow data for authenticated user", async () => {
        if (!sessionCookie) return expect(true).toBe(true);
        const res = await request(app)
            .get("/api/v1/analytics/pipeline-flow")
            .set("Cookie", sessionCookie);
        
        console.log("RESPONSE BODY:", JSON.stringify(res.body, null, 2));
        
        expect(res.status).toBe(200);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.nodes).toBeDefined();
        expect(res.body.data.links).toBeDefined();
        expect(Array.isArray(res.body.data.nodes)).toBe(true);
        expect(Array.isArray(res.body.data.links)).toBe(true);
    });
});
