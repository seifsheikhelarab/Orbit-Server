export const applicationsDocs = {
    "/applications": {
        get: {
            summary: "Get all applications",
            description: "Retrieve a paginated list of job applications for the current user.",
            query: ["status", "page", "limit"],
            responses: {
                200: "Applications retrieved successfully"
            }
        },
        post: {
            summary: "Create application",
            description: "Add a new job application to track.",
            body: "CreateApplicationInput",
            responses: {
                201: "Application created successfully"
            }
        }
    },
    "/applications/:id": {
        get: {
            summary: "Get application details",
            description: "Retrieve full details for a single job application.",
            responses: {
                200: "Application retrieved successfully",
                404: "Application not found"
            }
        },
        patch: {
            summary: "Update application",
            description: "Modify an existing job application.",
            body: "UpdateApplicationInput",
            responses: {
                200: "Application updated successfully"
            }
        },
        delete: {
            summary: "Delete application",
            description: "Remove a job application from tracking.",
            responses: {
                200: "Application deleted successfully"
            }
        }
    }
};
