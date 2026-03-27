import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

export async function downloadFromGoogleDrive(
    accessToken: string,
    fileId: string
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const file = await drive.files.get(
        { fileId, fields: "name,mimeType" },
        { responseType: "arraybuffer" }
    );

    const response = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" }
    );

    return {
        buffer: Buffer.from(response.data as ArrayBuffer),
        filename: (file.data as { name: string }).name || "document",
        mimeType: (file.data as { mimeType: string }).mimeType || "application/octet-stream"
    };
}

export function getAuthUrl(): string {
    return oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/drive.readonly"]
    });
}
