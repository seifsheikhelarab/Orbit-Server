import { describe, it, expect } from "bun:test";

// Test the decodeHeader and extractSender helper logic directly
// These are internal to gmail.sync.ts, so we test the patterns

function decodeHeader(value: string): string {
    if (!value) return "";
    const encodedMatch = value.match(/=\?([^\?]+)\?([QB])\?([^\?]+)\?=/gi);
    if (encodedMatch) {
        return value
            .replace(/=\?([^\?]+)\?([QB])\?([^\?]+)\?=/gi, (_: string, __: string, encoding: string, data: string) => {
                try {
                    if (encoding.toUpperCase() === "B") {
                        return Buffer.from(data, "base64").toString("utf-8");
                    }
                    return decodeURIComponent(
                        data.replace(/_/g, " ").replace(/=/g, "%")
                    );
                } catch {
                    return data;
                }
            })
            .trim();
    }
    return value.replace(/<[^>]*>/g, "").trim();
}

function extractSender(fromHeader: string): { email: string; name: string } {
    const match = fromHeader.match(/"?([^"<]*)"?\s*<([^>]+)>/);
    if (match?.[1] && match?.[2]) {
        return { name: match[1].trim(), email: match[2].trim() };
    }
    return { email: fromHeader.trim(), name: "" };
}

describe("Gmail Sync - decodeHeader", () => {
    it("should handle plain ASCII headers", () => {
        expect(decodeHeader("Hello World")).toBe("Hello World");
    });

    it("should handle empty/undefined headers", () => {
        expect(decodeHeader("")).toBe("");
    });

    it("should strip HTML tags", () => {
        expect(decodeHeader("<b>Bold</b> text")).toBe("Bold text");
    });

    it("should decode Base64 encoded words", () => {
        // "Hello World" in Base64
        const encoded = "=?UTF-8?B?SGVsbG8gV29ybGQ=?=";
        expect(decodeHeader(encoded)).toBe("Hello World");
    });
});

describe("Gmail Sync - extractSender", () => {
    it("should parse standard From format", () => {
        const result = extractSender("John Doe <john@example.com>");
        expect(result.name).toBe("John Doe");
        expect(result.email).toBe("john@example.com");
    });

    it("should handle bare email", () => {
        const result = extractSender("john@example.com");
        expect(result.email).toBe("john@example.com");
        expect(result.name).toBe("");
    });

    it("should handle quoted names", () => {
        const result = extractSender('"Doe, John" <john@example.com>');
        expect(result.email).toBe("john@example.com");
    });
});
