import { beforeAll, describe, expect, it } from "bun:test";
import request from "supertest";
import app from "../../app.js";

const TEST_USER_EMAIL = "test@example.com";
const TEST_USER_PASSWORD = "password123";
const TEST_USER_NAME = "Test User";

describe("POST /login", () => {
    beforeAll(async () => {
        await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: TEST_USER_NAME,
                email: TEST_USER_EMAIL,
                password: TEST_USER_PASSWORD
            });
    });

    it("returns 200 with valid credentials", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: TEST_USER_EMAIL,
                password: TEST_USER_PASSWORD
            });
        expect(res.status).toBe(200);
    });

    it("returns 401 with invalid credentials", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "nonexistent@example.com",
                password: "wrongpassword"
            });
        expect(res.status).toBe(401);
    });
});
