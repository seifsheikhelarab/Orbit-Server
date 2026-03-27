import type { EmailService } from "./EmailService.interface.js";
import { SmtpEmailService } from "./SmtpEmailService.js";
import { ResendEmailService } from "./ResendEmailService.js";

export function createEmailService(): EmailService {
    const provider = process.env.EMAIL_PROVIDER || "smtp";

    if (provider === "resend") {
        return new ResendEmailService();
    }

    return new SmtpEmailService();
}

export type {
    EmailService,
    ReminderEmailData
} from "./EmailService.interface.js";
