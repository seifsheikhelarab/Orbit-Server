import { type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { cvParserService } from "../../services/parsers/cv-parser.service.js";
import { success, AppError, HttpStatus, ErrorCode } from "../../utils/response.js";

// Configure multer for CV file uploads (in-memory: write to temp then delete)
const uploadDir = path.join(process.cwd(), "tmp", "uploads");

// Ensure upload directory exists
const ensureUploadDir = async () => {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch {
    // directory already exists
  }
};
ensureUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("Only PDF and DOCX files are supported", HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const parseCvController = {
  /**
   * POST /profile/parse-cv
   * Upload a CV file and parse it into structured profile data.
   */
  async parse(req: any, res: Response) {
    const filePath = req.file?.path;

    if (!filePath) {
      throw new AppError("No file uploaded", HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    try {
      const parsedData = await cvParserService.parseCvFile(filePath);
      return success(res, "CV parsed successfully", HttpStatus.OK, parsedData);
    } catch (error: any) {
      throw new AppError(
        error.message || "Failed to parse CV",
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCode.SERVER_ERROR
      );
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(filePath);
      } catch {
        // ignore cleanup errors
      }
    }
  },
};
