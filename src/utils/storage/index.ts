import type { StorageService } from "./StorageService.interface.js";
import { LocalStorageService } from "./LocalStorageService.js";

const STORAGE_BACKEND = process.env.STORAGE_BACKEND || "local";

let storageService: StorageService;

switch (STORAGE_BACKEND) {
    case "local":
    default:
        storageService = new LocalStorageService();
        break;
}

export function getStorageService(): StorageService {
    return storageService;
}

export function generateStorageKey(
    userId: string,
    documentId: string,
    versionNumber: number,
    originalFilename: string
): string {
    const sanitizedFilename = originalFilename
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_{2,}/g, "_");

    const timestamp = Date.now();

    return `${userId}/${documentId}/v${versionNumber}_${timestamp}_${sanitizedFilename}`;
}

export {
    type StorageService,
    type UploadResult
} from "./StorageService.interface.js";
