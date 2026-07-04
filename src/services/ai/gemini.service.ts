import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "../../utils/logger.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "PLACEHOLDER";

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        // Using Gemini 1.5 Flash for speed and efficiency in CV tailoring
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite"
        });
    }

    /**
     * Scrapes job application data from a raw job description
     */
    async scrapeJobData(jobDescription: string) {
        if (GEMINI_API_KEY === "PLACEHOLDER") {
            return {
                company: "Example Corp",
                jobTitle: "Software Engineer",
                location: "Remote",
                salaryMin: 80000,
                salaryMax: 120000
            };
        }

        const prompt = `You are a job data extraction specialist. Extract the following fields from the job description below and return ONLY valid JSON.

        REQUIRED SCHEMA:
        {
          "company": "Company name (string, required)",
          "jobTitle": "Exact job title (string, required)",
          "location": "City/Region or 'Remote' (string, required)",
          "salaryMin": "Minimum annual salary in USD (number, null if not specified)",
          "salaryMax": "Maximum annual salary in USD (number, null if not specified)"
        }

        RULES:
        - Return ONLY the JSON object. No markdown, no explanations, no code blocks.
        - If salaryMin/salaryMax cannot be determined, use null.
        - If company is not explicitly stated, infer from context or use "Unknown".
        - Normalize salary ranges to annual USD if given in different formats.

        JOB DESCRIPTION:
        ${jobDescription}`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            // Basic JSON extraction from markdown if needed
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch (error: any) {
            logger.error(`Gemini scrapeJobData error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generates a tailored CV and Cover Letter
     */
    async generateTailoredDocs(profileData: any, jobDescription: string) {
        if (GEMINI_API_KEY === "PLACEHOLDER") {
            return {
                resumeContent: {
                    settings: { template: "modern", color: "#1e3a8a", fontSize: "medium", lineSpacing: "normal", margin: "normal" },
                    basics: {
                        ...(profileData?.basics || {}),
                        label: profileData?.basics?.label || "Target Role",
                        summary: "Tailored professional summary highlighting relevant experience for this role.",
                        profiles: []
                    },
                    work: (profileData?.work || []).map((w: any) => ({ ...w })),
                    education: (profileData?.education || []).map((e: any) => ({ ...e })),
                    skills: (profileData?.skills || []).map((s: any) => ({ ...s })),
                    projects: (profileData?.projects || []).map((p: any) => ({ ...p })),
                    volunteer: (profileData?.volunteer || []).map((v: any) => ({ ...v })),
                    languages: (profileData?.languages || []).map((l: any) => ({ ...l })),
                    certifications: (profileData?.certifications || []).map((c: any) => ({ ...c })),
                },
                coverLetter: {
                    senderName: profileData?.basics?.name || "Your Name",
                    recipientName: "Hiring Manager",
                    recipientTitle: "",
                    company: "Example Corp",
                    address: "",
                    email: "",
                    opening: "I am writing to express my enthusiastic interest in the open position at Example Corp.",
                    body: "With my background in software development and passion for building great products, I believe I would be a strong addition to your team.",
                    closing: "Thank you for considering my application. I look forward to the opportunity to discuss how I can contribute to your team's success.",
                    signature: "Best regards,",
                    jobPostingUrl: ""
                }
            };
        }

        const prompt = `You are an expert career coach specializing in ATS-optimized resume tailoring and compelling cover letter writing.

        TASK: Analyze the user's professional profile and the target job description. Generate a tailored resume and cover letter that strategically highlights relevant experience, skills, and achievements while maintaining factual accuracy.

        OUTPUT SCHEMA (strict JSON):
        {
          "resumeContent": {
            "settings": {
              "template": "modern",
              "color": "#1e3a8a",
              "fontSize": "medium",
              "lineSpacing": "normal",
              "margin": "normal"
            },
            "basics": {
              "name": "string (user's full name)",
              "label": "string (target job title)",
              "email": "string",
              "phone": "string",
              "url": "string",
              "summary": "string (2-3 sentence professional summary tailored to this role)",
              "location": "string",
              "profiles": []
            },
            "work": [
              {
                "company": "string",
                "position": "string",
                "startDate": "string (e.g. Jan 2020)",
                "endDate": "string (e.g. Present or Dec 2023)",
                "highlights": "string (each bullet point on a new line, separated by \\n. 3-5 achievements emphasizing JD-relevant impact.)"
              }
            ],
            "education": [
              {
                "institution": "string",
                "studyType": "string (degree type, e.g. BSc, MBA)",
                "area": "string (field of study, e.g. Computer Science)",
                "startDate": "string",
                "endDate": "string",
                "score": "string (GPA or grade, if available)"
              }
            ],
            "skills": [
              {
                "name": "string (skill name)",
                "level": "string (proficiency level, or empty string)",
                "keywords": "string (comma-separated related keywords, or empty)"
              }
            ],
            "projects": [
              {
                "name": "string",
                "description": "string",
                "highlights": "string (each bullet on a new line separated by \\n)",
                "url": "string (project URL, or empty)",
                "startDate": "string",
                "endDate": "string"
              }
            ],
            "volunteer": [
              {
                "organization": "string",
                "position": "string",
                "startDate": "string",
                "endDate": "string",
                "highlights": "string"
              }
            ],
            "languages": [
              {
                "name": "string",
                "fluency": "string (e.g. Native, Fluent, Intermediate)",
                "highlights": "string (optional details, or empty)",
                "startDate": "string (or empty)"
              }
            ],
            "certifications": [
              {
                "name": "string",
                "issuer": "string",
                "startDate": "string",
                "endDate": "string",
                "url": "string",
                "highlights": "string"
              }
            ]
          },
          "coverLetter": {
            "senderName": "string (user's full name)",
            "recipientName": "string (hiring manager or recipient name extracted from JD or 'Hiring Manager')",
            "recipientTitle": "string (recipient's title if known, or empty)",
            "company": "string (company name)",
            "address": "string (company address if available, or empty)",
            "email": "string (recipient email if available, or empty)",
            "opening": "string (opening paragraph referencing the role and company)",
            "body": "string (1-2 body paragraphs highlighting relevant achievements and skills, use \\n between paragraphs)",
            "closing": "string (closing paragraph with call to action and thank you)",
            "signature": "string (e.g. Best regards,)",
            "jobPostingUrl": "string (or empty)"
          }
        }

        CRITICAL RULES:
        1. Return ONLY valid JSON. No markdown, no code fences, no explanations.
        2. Do NOT fabricate experience, skills, or qualifications. Only reorganize and emphasize existing profile data.
        3. Map profile skills to JD keywords where applicable. Prioritize JD-relevant skills first.
        4. Tailor the professional summary to directly address the role's primary requirements.
        5. Experience highlights should quantify achievements where possible (metrics, impact). Use actual \\n characters to separate bullet points in the highlights string.
        6. Cover letter must reference specific company, role, and 2-3 relevant achievements.
        7. Maintain chronological order in work/education sections.
        8. If profile lacks a section, return an empty array [] - never null.
        9. For string fields that are optional, return an empty string "".
        10. Keep the cover letter opening separate from "Dear {recipientName}," — do NOT include the salutation in the opening field.

        USER PROFILE:
        ${JSON.stringify(profileData)}

        TARGET JOB DESCRIPTION:
        ${jobDescription}`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch (error: any) {
            logger.error(`Gemini generateTailoredDocs error: ${error.message}`);
            throw error;
        }
    }
}

export const geminiService = new GeminiService();
