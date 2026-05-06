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
                    ...profileData,
                    basics: {
                        ...profileData.basics,
                        summary: "Tailored AI Summary..."
                    }
                },
                coverLetter:
                    "Dear Hiring Manager,\n\nI am writing to express my interest..."
            };
        }

        const prompt = `You are an expert career coach specializing in ATS-optimized resume tailoring and compelling cover letter writing.

        TASK: Analyze the user's professional profile and the target job description. Generate a tailored resume and cover letter that strategically highlights relevant experience, skills, and achievements while maintaining factual accuracy.

        OUTPUT SCHEMA (strict JSON):
        {
          "resumeContent": {
            "basics": {
              "name": "string",
              "email": "string",
              "phone": "string",
              "location": "string",
              "url": "string",
              "summary": "string - 2-3 sentence professional summary tailored to this role"
            },
            "skills": ["string - prioritized by relevance to JD, max 12"],
            "experience": [
              {
                "company": "string",
                "position": "string",
                "startDate": "string",
                "endDate": "string",
                "highlights": ["string - 3-5 bullet points emphasizing JD-relevant achievements"]
              }
            ],
            "education": [
              {
                "institution": "string",
                "degree": "string",
                "field": "string",
                "graduationDate": "string"
              }
            ],
            "projects": [
              {
                "name": "string",
                "description": "string",
                "technologies": ["string"],
                "highlights": ["string"]
              }
            ],
            "volunteer": [
              {
                "organization": "string",
                "role": "string",
                "description": "string"
              }
            ],
            "languages": [
              {
                "language": "string",
                "proficiency": "string"
              }
            ]
          },
          "coverLetter": "string - 3-4 paragraph professional cover letter tailored to the role and company"
        }

        CRITICAL RULES:
        1. Return ONLY valid JSON. No markdown, no code fences, no explanations.
        2. Do NOT fabricate experience, skills, or qualifications. Only reorganize and emphasize existing profile data.
        3. Map profile skills to JD keywords where applicable. Prioritize JD-relevant skills first.
        4. Tailor the professional summary to directly address the role's primary requirements.
        5. Experience highlights should quantify achievements where possible (metrics, impact).
        6. Cover letter must reference specific company, role, and 2-3 relevant achievements.
        7. Maintain chronological order in experience/education sections.
        8. If profile lacks a section, return an empty array [] - never null.

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
