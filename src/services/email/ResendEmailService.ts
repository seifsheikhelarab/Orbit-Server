import jwt from "jsonwebtoken";
import { Resend } from "resend";
import {
    type EmailService,
    type ReminderEmailData
} from "./EmailService.interface.js";

export class ResendEmailService implements EmailService {
    private resend: Resend;
    private fromEmail: string;

    constructor() {
        this.resend = new Resend(process.env.RESEND_API_KEY);
        this.fromEmail =
            process.env.EMAIL_FROM || "Job Tracker <noreply@yourdomain.com>";
    }

    async sendReminderEmail(
        to: string,
        data: ReminderEmailData
    ): Promise<void> {
        const subject = `Follow-up reminder: ${data.jobTitle} at ${data.company}`;
        const body = this.buildEmailBody(data);

        await this.resend.emails.send({
            from: this.fromEmail,
            to,
            subject,
            html: body
        });
    }

    private buildEmailBody(data: ReminderEmailData): string {
        const noteSection = data.followUpNote
            ? `<p>Your note: "${data.followUpNote}"</p>`
            : "";

        const baseUrl = process.env.APP_BASE_URL || "http://localhost:5173";

        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">Hi ${data.userName},</h2>
  
  <p>You set a follow-up reminder for your application to ${data.company} for the
  <strong>${data.jobTitle}</strong> role.</p>
  
  ${noteSection}
  
  <p>
    <strong>Application status:</strong> ${data.status}<br>
    <strong>Applied on:</strong> ${data.appliedDate}
  </p>

  <div style="margin: 30px 0;">
    <a href="${baseUrl}/applications/${data.applicationId}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">View Application</a>
    <a href="${baseUrl}/api/v1/reminders/action?token=${this.generateActionToken(data.applicationId, "snooze_3")}&action=snooze_3" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">Snooze 3 days</a>
    <a href="${baseUrl}/api/v1/reminders/action?token=${this.generateActionToken(data.applicationId, "snooze_7")}&action=snooze_7" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">Snooze 7 days</a>
    <a href="${baseUrl}/api/v1/reminders/action?token=${this.generateActionToken(data.applicationId, "done")}&action=done" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Mark as Done</a>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
  <p style="color: #666; font-size: 12px; margin: 0;">
    Job Application Tracker · <a href="${baseUrl}/unsubscribe" style="color: #666;">Unsubscribe</a>
  </p>
</body>
</html>
    `.trim();
    }

    private generateActionToken(applicationId: string, action: string): string {
        return jwt.sign(
            { applicationId, action },
            process.env.REMINDER_ACTION_SECRET || "default_secret",
            { expiresIn: "7d" }
        );
    }
}
