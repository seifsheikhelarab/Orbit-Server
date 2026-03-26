export function generateOpenAPISpec(): {
    openapi: string;
    info: { title: string; description: string; version: string };
    servers: { url: string; description: string }[];
    paths: Record<string, unknown>;
    components: Record<string, unknown>;
} {
    return {
        openapi: "3.0.0",
        info: {
            title: "Orbit API",
            description: "API for managing job applications and authentication",
            version: "1.0.0"
        },
        servers: [
            {
                url: "http://localhost:5726",
                description: "Development server"
            }
        ],
        paths: {
            "/api/v1/applications": {
                get: {
                    summary: "Get all applications",
                    description:
                        "Retrieve a paginated list of job applications for the authenticated user",
                    operationId: "getApplications",
                    parameters: [
                        {
                            name: "page",
                            in: "query",
                            schema: { type: "integer", default: 1 },
                            description: "Page number"
                        },
                        {
                            name: "limit",
                            in: "query",
                            schema: { type: "integer", default: 20 },
                            description: "Items per page (max 50)"
                        },
                        {
                            name: "status",
                            in: "query",
                            schema: { type: "string" },
                            description: "Filter by status"
                        },
                        {
                            name: "search",
                            in: "query",
                            schema: { type: "string" },
                            description: "Search in company and job title"
                        },
                        {
                            name: "location",
                            in: "query",
                            schema: { type: "string" },
                            description: "Filter by location"
                        }
                    ],
                    responses: {
                        200: {
                            description: "Applications retrieved successfully",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: { type: "boolean" },
                                            message: { type: "string" },
                                            data: {
                                                type: "array",
                                                items: {
                                                    $ref: "#/components/schemas/Application"
                                                }
                                            },
                                            pagination: {
                                                type: "object",
                                                properties: {
                                                    page: { type: "integer" },
                                                    limit: { type: "integer" },
                                                    total: { type: "integer" },
                                                    pages: { type: "integer" }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: "Create application",
                    description: "Add a new job application to track",
                    operationId: "createApplication",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/CreateApplicationInput"
                                }
                            }
                        }
                    },
                    responses: {
                        201: {
                            description: "Application created successfully",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/Application"
                                    }
                                }
                            }
                        },
                        400: {
                            description: "Validation error"
                        }
                    },
                    security: [{ bearerAuth: [] }]
                }
            },
            "/api/v1/applications/{id}": {
                get: {
                    summary: "Get application details",
                    description:
                        "Retrieve full details for a single job application",
                    operationId: "getApplicationDetails",
                    parameters: [
                        {
                            name: "id",
                            in: "path",
                            required: true,
                            schema: { type: "string" },
                            description: "Application ID"
                        }
                    ],
                    responses: {
                        200: {
                            description: "Application retrieved successfully",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/Application"
                                    }
                                }
                            }
                        },
                        404: {
                            description: "Application not found"
                        }
                    },
                    security: [{ bearerAuth: [] }]
                },
                patch: {
                    summary: "Update application",
                    description: "Modify an existing job application",
                    operationId: "updateApplication",
                    parameters: [
                        {
                            name: "id",
                            in: "path",
                            required: true,
                            schema: { type: "string" },
                            description: "Application ID"
                        }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/UpdateApplicationInput"
                                }
                            }
                        }
                    },
                    responses: {
                        200: {
                            description: "Application updated successfully",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/Application"
                                    }
                                }
                            }
                        }
                    },
                    security: [{ bearerAuth: [] }]
                },
                delete: {
                    summary: "Delete application",
                    description: "Remove a job application from tracking",
                    operationId: "deleteApplication",
                    parameters: [
                        {
                            name: "id",
                            in: "path",
                            required: true,
                            schema: { type: "string" },
                            description: "Application ID"
                        }
                    ],
                    responses: {
                        200: {
                            description: "Application deleted successfully"
                        }
                    },
                    security: [{ bearerAuth: [] }]
                }
            },
            "/api/auth/signup": {
                post: {
                    summary: "Sign up",
                    description: "Register a new user account",
                    operationId: "signup",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["email", "password"],
                                    properties: {
                                        email: {
                                            type: "string",
                                            format: "email"
                                        },
                                        password: {
                                            type: "string",
                                            format: "password"
                                        },
                                        name: { type: "string" }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: {
                            description: "User created successfully"
                        },
                        400: {
                            description: "Validation error"
                        }
                    }
                }
            },
            "/api/auth/signin": {
                post: {
                    summary: "Sign in",
                    description: "Authenticate an existing user",
                    operationId: "signin",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["email", "password"],
                                    properties: {
                                        email: {
                                            type: "string",
                                            format: "email"
                                        },
                                        password: {
                                            type: "string",
                                            format: "password"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: {
                            description: "Authentication successful"
                        }
                    }
                }
            },
            "/api/auth/getSession": {
                get: {
                    summary: "Get session",
                    description: "Retrieve the current user's session",
                    operationId: "getSession",
                    responses: {
                        200: {
                            description: "Session retrieved successfully"
                        }
                    },
                    security: [{ bearerAuth: [] }]
                }
            }
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            },
            schemas: {
                Application: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        userId: { type: "string" },
                        company: { type: "string" },
                        jobTitle: { type: "string" },
                        applicationStatus: {
                            type: "string",
                            enum: [
                                "SAVED",
                                "APPLIED",
                                "PHONE_SCREEN",
                                "INTERVIEW",
                                "OFFER",
                                "CLOSED"
                            ]
                        },
                        jobURL: { type: "string" },
                        location: { type: "string" },
                        salaryMin: { type: "number" },
                        salaryMax: { type: "number" },
                        appliedDate: { type: "string", format: "date-time" },
                        notes: { type: "string" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" }
                    }
                },
                CreateApplicationInput: {
                    type: "object",
                    required: ["company", "jobTitle"],
                    properties: {
                        company: { type: "string", maxLength: 200 },
                        jobTitle: { type: "string", maxLength: 200 },
                        applicationStatus: {
                            type: "string",
                            enum: [
                                "SAVED",
                                "APPLIED",
                                "PHONE_SCREEN",
                                "INTERVIEW",
                                "OFFER",
                                "CLOSED"
                            ]
                        },
                        jobURL: { type: "string", format: "uri" },
                        location: { type: "string", maxLength: 200 },
                        salaryMin: { type: "number" },
                        salaryMax: { type: "number" },
                        appliedDate: { type: "string", format: "date-time" },
                        notes: { type: "string" }
                    }
                },
                UpdateApplicationInput: {
                    type: "object",
                    properties: {
                        company: { type: "string", maxLength: 200 },
                        jobTitle: { type: "string", maxLength: 200 },
                        applicationStatus: {
                            type: "string",
                            enum: [
                                "SAVED",
                                "APPLIED",
                                "PHONE_SCREEN",
                                "INTERVIEW",
                                "OFFER",
                                "CLOSED"
                            ]
                        },
                        jobURL: { type: "string", format: "uri" },
                        location: { type: "string", maxLength: 200 },
                        salaryMin: { type: "number" },
                        salaryMax: { type: "number" },
                        appliedDate: { type: "string", format: "date-time" },
                        notes: { type: "string" }
                    }
                }
            }
        }
    };
}

export default generateOpenAPISpec;
