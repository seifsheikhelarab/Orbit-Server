export function generateOpenAPISpec(): {
    openapi: string;
    info: { title: string; description: string; version: string };
    servers: { url: string; description: string }[];
    tags: { name: string; description: string }[];
    paths: Record<string, unknown>;
    components: Record<string, unknown>;
} {
    return {
        openapi: "3.0.0",
        info: {
            title: "Orbit API",
            description: "API for managing job applications, documents, and authentication",
            version: "1.0.0"
        },
        servers: [
            { url: "http://localhost:5726", description: "Development server" }
        ],
        tags: [
            { name: "Auth", description: "Authentication endpoints" },
            { name: "Applications", description: "Job application management" },
            { name: "Application Documents", description: "Document attachments to applications" },
            { name: "Documents", description: "Document management and versioning" }
        ],
        paths: {
            // ================== AUTH ==================
            "/api/auth/sign-up": {
                post: {
                    tags: ["Auth"],
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
                                        email: { type: "string", format: "email" },
                                        password: { type: "string", format: "password", minLength: 8 },
                                        name: { type: "string" }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: { description: "User created successfully" },
                        400: { description: "Validation error" }
                    }
                }
            },
            "/api/auth/sign-in": {
                post: {
                    tags: ["Auth"],
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
                                        email: { type: "string", format: "email" },
                                        password: { type: "string", format: "password" }
                                    }
                                }
                            }
                        }
                    },
                    responses: { 200: { description: "Authentication successful" } }
                }
            },
            "/api/auth/sign-out": {
                post: {
                    tags: ["Auth"],
                    summary: "Sign out",
                    description: "Sign out the current user",
                    operationId: "signout",
                    responses: { 200: { description: "Signed out successfully" } }
                }
            },
            "/api/auth/get-session": {
                get: {
                    tags: ["Auth"],
                    summary: "Get session",
                    description: "Retrieve the current user's session",
                    operationId: "getSession",
                    responses: { 200: { description: "Session retrieved successfully" } }
                }
            },
            "/api/auth/me": {
                get: {
                    tags: ["Auth"],
                    summary: "Get current user",
                    description: "Get the currently authenticated user",
                    operationId: "getMe",
                    responses: { 200: { description: "User retrieved successfully" } },
                    security: [{ bearerAuth: [] }]
                }
            },

            // ================== APPLICATIONS ==================
            "/api/v1/applications": {
                get: {
                    tags: ["Applications"],
                    summary: "Get all applications",
                    description: "Retrieve a paginated list of job applications",
                    operationId: "getApplications",
                    parameters: [
                        { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "Page number" },
                        { name: "limit", in: "query", schema: { type: "integer", default: 20 }, description: "Items per page (max 50)" },
                        { name: "status", in: "query", schema: { type: "string" }, description: "Filter by status" },
                        { name: "search", in: "query", schema: { type: "string" }, description: "Search in company and job title" },
                        { name: "location", in: "query", schema: { type: "string" }, description: "Filter by location" }
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
                                            data: { type: "array", items: { $ref: "#/components/schemas/Application" } },
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
                    tags: ["Applications"],
                    summary: "Create application",
                    description: "Add a new job application to track",
                    operationId: "createApplication",
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/CreateApplicationInput" } } }
                    },
                    responses: {
                        201: { description: "Application created successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/Application" } } } },
                        400: { description: "Validation error" }
                    },
                    security: [{ bearerAuth: [] }]
                }
            },
            "/api/v1/applications/document-counts": {
                get: {
                    tags: ["Applications"],
                    summary: "Get document counts",
                    description: "Get the number of documents attached to specified applications",
                    operationId: "getDocumentCounts",
                    parameters: [
                        { name: "ids", in: "query", required: true, schema: { type: "string" }, description: "Comma-separated application IDs" }
                    ],
                    responses: {
                        200: {
                            description: "Document counts retrieved successfully",
                            content: { "application/json": { schema: { type: "object", properties: { data: { type: "object", additionalProperties: { type: "integer" } } } } } }
                        }
                    },
                    security: [{ bearerAuth: [] }]
                }
            },
            "/api/v1/applications/{id}": {
                get: {
                    tags: ["Applications"],
                    summary: "Get application details",
                    description: "Retrieve full details for a single job application",
                    operationId: "getApplicationDetails",
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "Application ID" }],
                    responses: {
                        200: { description: "Application retrieved successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/Application" } } } },
                        404: { description: "Application not found" }
                    },
                    security: [{ bearerAuth: [] }]
                },
                patch: {
                    tags: ["Applications"],
                    summary: "Update application",
                    description: "Modify an existing job application",
                    operationId: "updateApplication",
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "Application ID" }],
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateApplicationInput" } } }
                    },
                    responses: {
                        200: { description: "Application updated successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/Application" } } } }
                    },
                    security: [{ bearerAuth: [] }]
                },
                delete: {
                    tags: ["Applications"],
                    summary: "Delete application",
                    description: "Remove a job application from tracking",
                    operationId: "deleteApplication",
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "Application ID" }],
                    responses: { 200: { description: "Application deleted successfully" } },
                    security: [{ bearerAuth: [] }]
                }
            },

            // ================== APPLICATION DOCUMENTS ==================
            "/api/v1/applications/{id}/documents": {
                get: {
                    tags: ["Application Documents"],
                    summary: "Get attached documents",
                    description: "List all documents attached to an application",
                    operationId: "getAttachedDocuments",
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "Application ID" }],
                    responses: {
                        200: {
                            description: "Documents retrieved successfully",
                            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/AttachedDocument" } } } }
                        }
                    },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    tags: ["Application Documents"],
                    summary: "Attach document",
                    description: "Attach a document version to an application",
                    operationId: "attachDocument",
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "Application ID" }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["documentVersionId"],
                                    properties: { documentVersionId: { type: "string", description: "ID of the document version to attach" } }
                                }
                            }
                        }
                    },
                    responses: { 201: { description: "Document attached successfully" } },
                    security: [{ bearerAuth: [] }]
                }
            },
            "/api/v1/applications/{id}/documents/{attachmentId}": {
                delete: {
                    tags: ["Application Documents"],
                    summary: "Detach document",
                    description: "Remove a document attachment from an application",
                    operationId: "detachDocument",
                    parameters: [
                        { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Application ID" },
                        { name: "attachmentId", in: "path", required: true, schema: { type: "string" }, description: "Attachment ID" }
                    ],
                    responses: { 200: { description: "Document detached successfully" } },
                    security: [{ bearerAuth: [] }]
                }
            },

            // ================== DOCUMENTS ==================
            "/api/v1/documents": {
                get: {
                    tags: ["Documents"],
                    summary: "Get all documents",
                    description: "Retrieve a paginated list of user's documents",
                    operationId: "getDocuments",
                    parameters: [
                        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
                        { name: "type", in: "query", schema: { type: "string" }, description: "Filter by document type (CV, COVER_LETTER, OTHER)" }
                    ],
                    responses: { 200: { description: "Documents retrieved successfully" } },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    tags: ["Documents"],
                    summary: "Upload document",
                    description: "Upload a new document",
                    operationId: "uploadDocument",
                    requestBody: {
                        required: true,
                        content: {
                            "multipart/form-data": {
                                schema: {
                                    type: "object",
                                    required: ["name", "type", "file"],
                                    properties: {
                                        name: { type: "string" },
                                        type: { type: "string", enum: ["CV", "COVER_LETTER", "OTHER"] },
                                        file: { type: "string", format: "binary" }
                                    }
                                }
                            }
                        }
                    },
                    responses: { 201: { description: "Document uploaded successfully" } },
                    security: [{ bearerAuth: [] }]
                }
            },
            "/api/v1/documents/{id}": {
                get: {
                    tags: ["Documents"],
                    summary: "Get document details",
                    description: "Retrieve full details for a single document",
                    operationId: "getDocumentDetails",
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "Document ID" }],
                    responses: { 200: { description: "Document retrieved successfully" } },
                    security: [{ bearerAuth: [] }]
                },
                patch: {
                    tags: ["Documents"],
                    summary: "Update document",
                    description: "Modify document metadata",
                    operationId: "updateDocument",
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "Document ID" }],
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        type: { type: "string", enum: ["CV", "COVER_LETTER", "OTHER"] },
                                        activeVersionId: { type: "string" }
                                    }
                                }
                            }
                        }
                    },
                    responses: { 200: { description: "Document updated successfully" } },
                    security: [{ bearerAuth: [] }]
                },
                delete: {
                    tags: ["Documents"],
                    summary: "Delete document",
                    description: "Remove a document and all its versions",
                    operationId: "deleteDocument",
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "Document ID" }],
                    responses: { 200: { description: "Document deleted successfully" } },
                    security: [{ bearerAuth: [] }]
                }
            },
            "/api/v1/documents/{id}/versions": {
                post: {
                    tags: ["Documents"],
                    summary: "Upload new version",
                    description: "Upload a new version of an existing document",
                    operationId: "uploadNewVersion",
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "Document ID" }],
                    requestBody: {
                        required: true,
                        content: {
                            "multipart/form-data": {
                                schema: { type: "object", required: ["file"], properties: { file: { type: "string", format: "binary" } } }
                            }
                        }
                    },
                    responses: { 201: { description: "Version uploaded successfully" } },
                    security: [{ bearerAuth: [] }]
                }
            },
            "/api/v1/documents/{id}/versions/{versionId}/download": {
                get: {
                    tags: ["Documents"],
                    summary: "Download document version",
                    description: "Download a specific version of a document",
                    operationId: "downloadVersion",
                    parameters: [
                        { name: "id", in: "path", required: true, schema: { type: "string" } },
                        { name: "versionId", in: "path", required: true, schema: { type: "string" } }
                    ],
                    responses: {
                        200: {
                            description: "File downloaded successfully",
                            content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } }
                        }
                    },
                    security: [{ bearerAuth: [] }]
                }
            },
            "/api/v1/documents/{id}/versions/{versionId}/preview": {
                get: {
                    tags: ["Documents"],
                    summary: "Preview document version",
                    description: "Get a preview URL for a specific version of a document",
                    operationId: "previewVersion",
                    parameters: [
                        { name: "id", in: "path", required: true, schema: { type: "string" } },
                        { name: "versionId", in: "path", required: true, schema: { type: "string" } }
                    ],
                    responses: { 200: { description: "Preview URL retrieved successfully" } },
                    security: [{ bearerAuth: [] }]
                }
            }
        },
        components: {
            securitySchemes: {
                bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
            },
            schemas: {
                Application: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        userId: { type: "string" },
                        company: { type: "string" },
                        jobTitle: { type: "string" },
                        applicationStatus: { type: "string", enum: ["SAVED", "APPLIED", "PHONE_SCREEN", "INTERVIEW", "OFFER", "CLOSED"] },
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
                        applicationStatus: { type: "string", enum: ["SAVED", "APPLIED", "PHONE_SCREEN", "INTERVIEW", "OFFER", "CLOSED"] },
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
                        applicationStatus: { type: "string", enum: ["SAVED", "APPLIED", "PHONE_SCREEN", "INTERVIEW", "OFFER", "CLOSED"] },
                        jobURL: { type: "string", format: "uri" },
                        location: { type: "string", maxLength: 200 },
                        salaryMin: { type: "number" },
                        salaryMax: { type: "number" },
                        appliedDate: { type: "string", format: "date-time" },
                        notes: { type: "string" }
                    }
                },
                AttachedDocument: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        documentId: { type: "string" },
                        documentName: { type: "string" },
                        documentType: { type: "string" },
                        versionId: { type: "string" },
                        versionNumber: { type: "integer" },
                        originalFilename: { type: "string" },
                        fileSizeBytes: { type: "integer" },
                        mimeType: { type: "string" },
                        attachedAt: { type: "string", format: "date-time" }
                    }
                }
            }
        }
    };
}

export default generateOpenAPISpec;