export interface StorageService {
    upload(file: Buffer, key: string, mimeType: string): Promise<string>;
    getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
    delete(key: string): Promise<void>;
    getStream(key: string): Promise<NodeJS.ReadableStream>;
}

export interface UploadResult {
    storageKey: string;
    mimeType: string;
    fileSizeBytes: number;
    originalFilename: string;
}
