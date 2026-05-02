import { auth } from './../../utils/auth.js';
import request from "supertest";
import app from "../../app.js";
import { describe, it, expect, beforeAll } from "bun:test";

const TEST_EMAIL = "resumetest@example.com";
const TEST_PASSWORD = "testpass123";
const TEST_NAME = "Resume Test User";

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
    } catch (e) {
        // console.log("SignUp error (likely user exists):", e);
    }

    const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    
    // console.log("Login response:", res.status, res.body);
    if (res.headers["set-cookie"]) {
        const cookies = res.headers["set-cookie"];
        sessionCookie = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    } else {
        console.error("DEBUG: Login failed or no cookie returned:", res.status, res.body);
    }
});

function getCookie() {
    return sessionCookie;
}

describe("Resumes API", () => {
    describe("POST /api/v1/resumes", () => {
        it("should create a new resume", async () => {
            const loginRes = await request(app)
                .post("/api/v1/auth/login")
                .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
            
            const token = loginRes.body.data.token;

            const res = await request(app)
                .post("/api/v1/resumes")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    name: "Test Resume",
                    content: { basics: { name: "Test User" } },
                    settings: { template: "modern" }
                });

            if (res.status === 500) {
                console.error("DEBUG: 500 Error Response Body:", JSON.stringify(res.body, null, 2));
            }

            expect(res.status).toBe(201);
            expect(res.body.data.name).toBe("Test Resume");
        });
    });
});
