import prisma from "../utils/prisma.ts";
import { faker } from "@faker-js/faker";
import logger from "../utils/logger.ts";
import { auth } from "../utils/auth.ts";

const STATUSES = ["SAVED", "APPLIED", "PHONE_SCREEN", "INTERVIEW", "OFFER", "CLOSED"] as const;
const SOURCES = ["LinkedIn", "Indeed", "Company Website", "Referral", "Job Fair", "Glassdoor", "Handshake", null];
const LOCATIONS = ["Remote", "New York, NY", "San Francisco, CA", "Austin, TX", "Seattle, WA", "Boston, MA", "Chicago, IL", "Los Angeles, CA", "London, UK", "Berlin, Germany", "Toronto, Canada", null];
const JOB_TITLES = [
    "Software Engineer",
    "Senior Software Engineer",
    "Staff Engineer",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "DevOps Engineer",
    "Site Reliability Engineer",
    "Product Manager",
    "Data Scientist",
    "Machine Learning Engineer",
    "UX Designer",
    "Technical Lead",
    "Engineering Manager",
    "Cloud Engineer",
    "Security Engineer"
];
const COMPANIES = [
    "Google",
    "Microsoft",
    "Amazon",
    "Apple",
    "Meta",
    "Netflix",
    "Stripe",
    "Airbnb",
    "Uber",
    "Spotify",
    "Slack",
    "Zoom",
    "Salesforce",
    "Adobe",
    "Oracle",
    "IBM",
    "Tesla",
    "Twitter/X",
    "TikTok",
    "ByteDance",
    "Snowflake",
    "Databricks",
    "Figma",
    "Notion",
    "Discord",
    "Pinterest",
    "Snapchat",
    "Reddit",
    "Coinbase",
    "Stripe"
];

const INTERVIEW_TYPES = ["PHONE_SCREEN", "TECHNICAL", "SYSTEM_DESIGN", "BEHAVIORAL", "FINAL", "OTHER"] as const;
const INTERVIEW_OUTCOMES = ["POSITIVE", "NEUTRAL", "NEGATIVE", null] as const;

async function main() {
    logger.info("[SEED]🌱 Seeding database...");

    let user;
    const existingUser = await prisma.user.findUnique({
        where: { email: "demo@orbit.app" }
    });

    if (existingUser) {
        logger.info("[SEED] Cleaning up existing data...");
        await prisma.reminderJob.deleteMany({ where: { application: { userId: existingUser.id } } });
        await prisma.interviewRound.deleteMany({ where: { application: { userId: existingUser.id } } });
        await prisma.contact.deleteMany({ where: { application: { userId: existingUser.id } } });
        await prisma.statusHistory.deleteMany({ where: { application: { userId: existingUser.id } } });
        await prisma.applicationDocument.deleteMany({ where: { application: { userId: existingUser.id } } });
        await prisma.notification.deleteMany({ where: { userId: existingUser.id } });
        const docsToDelete = await prisma.document.findMany({ where: { userId: existingUser.id } });
        for (const doc of docsToDelete) {
            await prisma.documentVersion.deleteMany({ where: { documentId: doc.id } });
        }
        await prisma.document.deleteMany({ where: { userId: existingUser.id } });
        await prisma.jobApplication.deleteMany({ where: { userId: existingUser.id } });
        logger.info("[SEED]✓ Cleanup complete");
    }

    if (existingUser) {
        user = { user: existingUser };
        logger.info("[SEED] Using existing user");
    } else {
        user = await auth.api.signUpEmail({
            body: {
                name: "Alex Johnson",
                email: "demo@orbit.app",
                password: "password123",
            }
        });
    }

    await prisma.user.update({
        where: { email: user.user.email },
        data: {
            emailVerified: true,
            timezone: "America/New_York",
            emailRemindersEnabled: true,
            inAppNotificationsEnabled: true
        }
    });

    logger.info(`[SEED]✓ User ready: ${user.user.email}`);

    const applications = [];
    const numApplications = faker.number.int({ min: 20, max: 35 });

    for (let i = 0; i < numApplications; i++) {
        const status = faker.helpers.arrayElement(STATUSES);
        const hasAppliedDate = status !== "SAVED" && faker.datatype.boolean();
        const appliedDate = hasAppliedDate
            ? faker.date.past({ years: 1 })
            : null;

        const application = await prisma.jobApplication.create({
            data: {
                userId: user.user.id,
                company: faker.helpers.arrayElement(COMPANIES),
                jobTitle: faker.helpers.arrayElement(JOB_TITLES),
                applicationStatus: status,
                location: faker.helpers.arrayElement(LOCATIONS),
                jobURL: faker.internet.url(),
                salaryMin: faker.helpers.maybe(() => faker.number.int({ min: 80000, max: 120000 }), { probability: 0.5 }),
                salaryMax: faker.helpers.maybe(() => faker.number.int({ min: 120000, max: 200000 }), { probability: 0.5 }),
                appliedDate,
                source: faker.helpers.arrayElement(SOURCES),
                notes: faker.helpers.maybe(() => faker.lorem.paragraph(), { probability: 0.5 }),
                followUpDate: faker.helpers.maybe(() => faker.date.future({ years: 0.5 }), { probability: 0.3 }),
                followUpNote: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 })
            }
        });

        if (appliedDate && status !== "SAVED") {
            const historyEntries = [];
            let currentStatus = "SAVED";
            const statusOrder = ["SAVED", "APPLIED", "PHONE_SCREEN", "INTERVIEW", "OFFER", "CLOSED"];
            const currentIndex = statusOrder.indexOf(status);
            
            for (let j = 0; j <= currentIndex && j < statusOrder.length; j++) {
                const toStatus = statusOrder[j];
                if (j === 0) {
                    await prisma.statusHistory.create({
                        data: {
                            applicationId: application.id,
                            fromStatus: null,
                            toStatus: toStatus as typeof STATUSES[number],
                            changedAt: appliedDate,
                            note: j === 0 ? "Initial status" : faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 })
                        }
                    });
                } else if (toStatus !== currentStatus) {
                    const changedAt = faker.date.between({ from: appliedDate, to: new Date() });
                    await prisma.statusHistory.create({
                        data: {
                            applicationId: application.id,
                            fromStatus: currentStatus as typeof STATUSES[number],
                            toStatus: toStatus as typeof STATUSES[number],
                            changedAt,
                            note: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.4 })
                        }
                    });
                    currentStatus = toStatus;
                }
                if (toStatus === status) break;
            }
        }

        if (["PHONE_SCREEN", "INTERVIEW", "OFFER"].includes(status)) {
            const numContacts = faker.number.int({ min: 1, max: 3 });
            for (let c = 0; c < numContacts; c++) {
                await prisma.contact.create({
                    data: {
                        applicationId: application.id,
                        name: faker.person.fullName(),
                        title: faker.helpers.arrayElement(["Recruiter", "Hiring Manager", "HR Manager", "Technical Lead", "Team Lead", null]),
                        email: faker.internet.email(),
                        phone: faker.phone.number(),
                        linkedinUrl: faker.datatype.boolean() ? faker.internet.url() : null
                    }
                });
            }

            const numRounds = faker.number.int({ min: 1, max: 3 });
            for (let r = 0; r < numRounds; r++) {
                const roundType = faker.helpers.arrayElement(INTERVIEW_TYPES);
                const scheduledAt = faker.date.past({ years: 0.5 });
                const outcome = faker.helpers.arrayElement(INTERVIEW_OUTCOMES);
                
                await prisma.interviewRound.create({
                    data: {
                        applicationId: application.id,
                        roundType,
                        scheduledAt,
                        interviewerName: faker.datatype.boolean() ? faker.person.fullName() : null,
                        notes: faker.helpers.maybe(() => faker.lorem.paragraph(), { probability: 0.6 }),
                        outcome
                    }
                });
            }
        }

        applications.push(application);
    }

    const appliedApps = applications.filter(a => a.applicationStatus !== "SAVED");
    logger.info(`[SEED]✓ Created ${applications.length} job applications with status history, contacts, and interview rounds`);

    const documents = [];
    const docTypes = ["CV", "COVER_LETTER", "OTHER"] as const;
    const numDocuments = faker.number.int({ min: 5, max: 10 });

    for (let i = 0; i < numDocuments; i++) {
        const doc = await prisma.document.create({
            data: {
                userId: user.user.id,
                name: faker.helpers.arrayElement([
                    "Resume 2024",
                    "Software Engineer CV",
                    "Cover Letter - Generic",
                    "Portfolio",
                    "Resume - Updated Jan 2024",
                    "Technical CV",
                    "Full Stack Developer Resume",
                    "Senior Engineer CV",
                    "Cover Letter - Spotify",
                    "Resume - Google"
                ]),
                type: faker.helpers.arrayElement(docTypes)
            }
        });

        const numVersions = faker.number.int({ min: 1, max: 4 });
        for (let v = 1; v <= numVersions; v++) {
            await prisma.documentVersion.create({
                data: {
                    documentId: doc.id,
                    versionNumber: v,
                    originalFilename: `${doc.name.replace(/\s+/g, "_")}_v${v}.pdf`,
                    storageKey: `docs/${user.user.id}/${doc.id}/v${v}_${faker.string.alphanumeric(8)}.pdf`,
                    mimeType: "application/pdf",
                    fileSizeBytes: faker.number.int({ min: 50000, max: 500000 }),
                    source: faker.helpers.arrayElement(["LOCAL", "LOCAL", "LOCAL", "GOOGLE_DRIVE"])
                }
            });
        }

        const latestVersion = await prisma.documentVersion.findFirst({
            where: { documentId: doc.id },
            orderBy: { versionNumber: "desc" }
        });

        if (latestVersion) {
            await prisma.document.update({
                where: { id: doc.id },
                data: { activeVersionId: latestVersion.id }
            });
        }

        documents.push(doc);
    }
    logger.info(`[SEED]✓ Created ${documents.length} documents with versions`);

    const notifications = [];
    const notificationTypes = ["FOLLOW_UP_DUE", "FOLLOW_UP_OVERDUE"] as const;
    const numNotifications = faker.number.int({ min: 8, max: 20 });

    for (let i = 0; i < numNotifications; i++) {
        const app = faker.helpers.arrayElement(appliedApps);
        const notification = await prisma.notification.create({
            data: {
                userId: user.user.id,
                applicationId: app.id,
                type: faker.helpers.arrayElement(notificationTypes),
                title: faker.helpers.arrayElement([
                    "Follow-up reminder",
                    "Interview follow-up needed",
                    "Application status update",
                    "Check in with recruiter",
                    "Time to follow up!",
                    "Interview scheduled"
                ]),
                body: faker.lorem.sentence(),
                readAt: faker.datatype.boolean({ probability: 0.6 }) ? faker.date.recent() : null,
                actionedAt: faker.datatype.boolean({ probability: 0.3 }) ? faker.date.recent() : null,
                createdAt: faker.date.recent({ days: 30 })
            }
        });
        notifications.push(notification);
    }
    logger.info(`[SEED]✓ Created ${notifications.length} notifications`);

    const appsWithFollowUp = [...new Map(appliedApps.filter(a => a.followUpDate).map(a => [a.followUpDate?.toISOString(), a])).values()];
    for (const app of appsWithFollowUp.slice(0, 5)) {
        await prisma.reminderJob.create({
            data: {
                applicationId: app.id,
                scheduledDate: app.followUpDate!,
                sentAt: faker.datatype.boolean() ? faker.date.recent() : null
            }
        }).catch(() => {});
    }
    logger.info(`[SEED]✓ Created reminder jobs`);

    logger.info("\n[SEED]========================================");
    logger.info("[SEED]✅ Seeding complete!");
    logger.info("[SEED]========================================");
    logger.info(`   Email: demo@orbit.app`);
    logger.info(`   Password: password123`);
    logger.info(`   ───────────────────────────────────`);
    logger.info(`   Applications: ${applications.length}`);
    logger.info(`   - with Status History`);
    logger.info(`   - with Contacts`);
    logger.info(`   - with Interview Rounds`);
    logger.info(`   Documents: ${documents.length}`);
    logger.info(`   Notifications: ${notifications.length}`);
    logger.info(`   User Settings:`);
    logger.info(`   - Timezone: America/New_York`);
    logger.info(`   - Email Reminders: enabled`);
    logger.info(`   - In-App Notifications: enabled`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
