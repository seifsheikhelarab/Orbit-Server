import { afterEach, describe, it } from "bun:test";
import request from "supertest";
import app from "../../app.js";

describe("POST /login", () => {
    it("returns 200", (done) => {
        request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "seofiasf@gmail.com",
                password: "password123"
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err) {
                if (err) return done(err);
                return done();
            });
    });

    it("returns an error", (done) => {
        request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "df@gmail.com",
                password: "password123"
            })
            .expect("Content-Type", /json/)
            .expect(401)
            .end(function (err) {
                if (err) return done(err);
                return done();
            });
    });
});

afterEach(() => {
    request(app).post("/api/v1/auth/logout");
});
