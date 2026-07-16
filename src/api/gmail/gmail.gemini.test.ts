import { describe, it, expect } from "bun:test";
import { extractAndMatch, type EmailExtractionResult } from "./gmail.gemini.js";

describe("Gmail Gemini - extractAndMatch (mock mode)", () => {
    it("should return OTHER intent with null fields when GEMINI_API_KEY is PLACEHOLDER", async () => {
        const result = await extractAndMatch(
            "Test Subject",
            "test@example.com",
            "Test Sender",
            "Test body content",
            [{ id: "app1", company: "Acme Corp", jobTitle: "Engineer" }]
        );

        expect(result).not.toBeNull();
        expect(result!.intent).toBe("OTHER");
        expect(result!.company).toBeNull();
        expect(result!.jobTitle).toBeNull();
        expect(result!.matchedApplicationId).toBeNull();
    });

    it("should handle empty applications list", async () => {
        const result = await extractAndMatch(
            "Test",
            "a@b.com",
            "",
            "Body",
            []
        );

        expect(result).not.toBeNull();
        expect(result!.intent).toBe("OTHER");
    });
});
