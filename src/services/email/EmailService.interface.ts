export interface ReminderEmailData {
    userName: string;
    userEmail: string;
    company: string;
    jobTitle: string;
    status: string;
    appliedDate: string;
    followUpNote?: string;
    applicationId: string;
}

export interface EmailService {
    sendReminderEmail(to: string, data: ReminderEmailData): Promise<void>;
}
