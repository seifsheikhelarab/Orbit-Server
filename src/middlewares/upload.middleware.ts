import multer from "multer";
import type { FileFilterCallback } from "multer";
import type { Request } from "express";

const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
): void => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed: PDF, DOCX`));
    }
};

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_FILE_SIZE
    },
    fileFilter
});

export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE };
