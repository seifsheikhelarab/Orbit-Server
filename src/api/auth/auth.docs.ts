export const authDocs = {
    "/auth/register": {
        post: {
            summary: "Register a new user",
            description: "Creates a new user account with email and password.",
            body: "RegisterInput",
            responses: {
                201: "User registered successfully",
                400: "User already exists or invalid input"
            }
        }
    },
    "/auth/login": {
        post: {
            summary: "Login",
            description: "Authenticate a user and create a session.",
            body: "LoginInput",
            responses: {
                200: "Login successful",
                401: "Invalid credentials"
            }
        }
    },
    "/auth/logout": {
        post: {
            summary: "Logout",
            description: "End the current user session.",
            responses: {
                200: "Logout successful"
            }
        }
    },
    "/auth/me": {
        get: {
            summary: "Get current user",
            description: "Retrieve the currently authenticated user's profile.",
            responses: {
                200: "User profile retrieved",
                401: "Not authenticated"
            }
        }
    }
};
