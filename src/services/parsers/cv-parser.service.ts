import fs from "fs/promises";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "../../utils/logger.js";
import type { ResumeData } from "../types/resume.types.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "PLACEHOLDER";

/**
 * Service for parsing CV/resume files (PDF, DOCX) into structured profile data.
 */
export class CvParserService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
    });
  }

  /**
   * Extract raw text from a CV file.
   * Supports PDF (.pdf) and Word (.docx) formats.
   */
  async extractText(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case ".pdf": {
        const { PDFParse } = await import("pdf-parse");
        const fileBuffer = await fs.readFile(filePath);
        const parser = new PDFParse({ data: fileBuffer });
        const result = await parser.getText();
        await parser.destroy().catch(() => {});
        return result.text;
      }
      case ".docx": {
        const mammoth = await import("mammoth");
        const fileBuffer = await fs.readFile(filePath);
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        return result.value;
      }
      default:
        throw new Error(`Unsupported file format: ${ext}. Please upload a PDF or DOCX file.`);
    }
  }

  /**
   * Parse extracted CV text into a structured ResumeData object using Gemini AI.
   */
  async parseCvToResumeData(cvText: string): Promise<ResumeData> {
    if (GEMINI_API_KEY === "PLACEHOLDER") {
      logger.warn("GEMINI_API_KEY not set — returning mock parsed CV data");
      return this.getMockParsedData(cvText);
    }

    const prompt = `You are an expert resume parser. Extract structured professional profile data from the CV text below.
Return ONLY valid JSON — no markdown, no code fences, no explanations.

OUTPUT SCHEMA:
{
  "settings": {
    "template": "modern",
    "color": "#1e3a8a",
    "fontSize": "medium",
    "lineSpacing": "normal",
    "margin": "normal"
  },
  "basics": {
    "name": "string (full name)",
    "label": "string (current/past job title or career objective)",
    "email": "string (email address, or empty)",
    "phone": "string (phone number, or empty)",
    "url": "string (personal website/portfolio URL, or empty)",
    "summary": "string (professional summary/objective — extract what's available)",
    "location": "string (city, country or remote)",
    "profiles": [{ "network": "LinkedIn/GitHub/etc", "username": "handle", "url": "profile URL" }]
  },
  "work": [{
    "company": "string",
    "position": "string",
    "startDate": "string (e.g. Jan 2020)",
    "endDate": "string (e.g. Present or Dec 2023)",
    "highlights": "string (each bullet point on a new line, separated by \\\\n. Extract all achievements.)"
  }],
  "education": [{
    "institution": "string",
    "area": "string (field of study)",
    "studyType": "string (degree type, e.g. BSc, MBA)",
    "startDate": "string",
    "endDate": "string",
    "score": "string (GPA/grade, or empty)"
  }],
  "skills": [{ "name": "string", "level": "string (proficiency, or empty)", "keywords": "string (comma-separated related keywords, or empty)" }],
  "projects": [{
    "name": "string",
    "description": "string",
    "highlights": "string (bullet points separated by \\\\n)",
    "url": "string",
    "startDate": "string",
    "endDate": "string"
  }],
  "volunteer": [{
    "organization": "string",
    "position": "string",
    "startDate": "string",
    "endDate": "string",
    "highlights": "string"
  }],
  "languages": [{ "name": "string", "fluency": "string", "highlights": "string", "startDate": "string" }],
  "certifications": [{
    "name": "string",
    "issuer": "string",
    "startDate": "string",
    "endDate": "string",
    "url": "string",
    "highlights": "string"
  }]
}

RULES:
- Extract ALL information you can find. Leave fields empty string or [] if not found.
- Return ONLY the JSON object. No markdown, no backticks.
- Preserve the original text's meaning — do not fabricate.
- For "highlights" fields, use actual \\\\n characters to represent bullet points.
- For date fields, extract whatever format is present (e.g. "2020-2023", "Jan 2020", "2020").
- Skills: extract as individual skill objects. Level can be inferred from context like "Advanced", "Expert", "Proficient".

CV TEXT:
${cvText}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Gemini returned non-JSON response");
      }
      return JSON.parse(jsonMatch[0]) as ResumeData;
    } catch (error: any) {
      logger.error(`Gemini parseCvToResumeData error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Full pipeline: extract text from file, then parse into ResumeData.
   */
  async parseCvFile(filePath: string): Promise<ResumeData> {
    const text = await this.extractText(filePath);
    return this.parseCvToResumeData(text);
  }

  /**
   * Mock parser for development without Gemini API key.
   */
  private getMockParsedData(cvText: string): ResumeData {
    const lines = cvText.split("\n").filter((l) => l.trim());
    const name = lines[0] || "";
    const email = lines.find((l) => l.includes("@")) || "";
    const phone = lines.find((l) => /\+\d[\d\s()-]{7,}/.test(l)) || "";

    return {
      settings: {
        template: "modern",
        color: "#1e3a8a",
        fontSize: "medium",
        lineSpacing: "normal",
        margin: "normal",
      },
      basics: {
        name,
        label: "",
        email,
        phone,
        url: "",
        summary: "",
        location: "",
        profiles: [],
      },
      work: [],
      education: [],
      skills: [],
      projects: [],
      volunteer: [],
      languages: [],
      certifications: [],
    };
  }
}

export const cvParserService = new CvParserService();
