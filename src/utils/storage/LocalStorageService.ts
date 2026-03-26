import fs from "fs";
import path from "path";
import type { StorageService } from "./StorageService.interface.js";
import logger from "../logger.js";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export class LocalStorageService implements StorageService {
    constructor() {
        if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        }
    }

    async upload(file: Buffer, key: string): Promise<string> {
        const filePath = path.join(UPLOAD_DIR, key);
        const dir = path.dirname(filePath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, file);
        logger.info(`File uploaded to ${key}`);

        return key;
    }

    async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
        const token = Buffer.from(
            `${key}:${Date.now()}:${expiresInSeconds}`
        ).toString("base64");

        return `/api/documents/download?token=${token}`;
    }

    async delete(key: string): Promise<void> {
        const filePath = path.join(UPLOAD_DIR, key);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.info(`File deleted: ${key}`);
        }
    }

    async getStream(key: string): Promise<NodeJS.ReadableStream> {
        const filePath = path.join(UPLOAD_DIR, key);

        if (!fs.existsSync(filePath)) {
            throw new Error("File not found");
        }

        return fs.createReadStream(filePath);
    }

    getFilePath(key: string): string {
        return path.join(UPLOAD_DIR, key);
    }
}

export const localStorageService = new LocalStorageService();
