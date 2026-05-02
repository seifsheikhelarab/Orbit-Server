import prisma from "../utils/prisma.ts";
import { faker } from "@faker-js/faker";
import logger from "../utils/logger.ts";
import { auth } from "../utils/auth.ts";

const STATUSES = ["SAVED", "APPLIED", "PHONE_SCREEN", "INTERVIEW", "OFFER", "CLOSED"] as const;
const SOURCES = ["LinkedIn", "Indeed", "Company Website", "Referral", "Job Fair", "Glassdoor", "Handshake", "AngelList", "HackerNews", "Twitter", "Reddit", null];
const LOCATIONS = [
    "Remote", "Remote - US", "Remote - Worldwide",
    "New York, NY", "San Francisco, CA", "Austin, TX", "Seattle, WA", 
    "Boston, MA", "Chicago, IL", "Los Angeles, CA", "Denver, CO",
    "Miami, FL", "Atlanta, GA", "Portland, OR", "Washington, DC",
    "London, UK", "Berlin, Germany", "Paris, France", "Amsterdam, Netherlands",
    "Toronto, Canada", "Vancouver, Canada", "Sydney, Australia", "Singapore",
    "Tokyo, Japan", "Dublin, Ireland", "Zurich, Switzerland", null
];
const JOB_TITLES = [
    "Software Engineer", "Senior Software Engineer", "Staff Engineer", "Principal Engineer",
    "Frontend Developer", "Backend Developer", "Full Stack Developer", "Web Developer",
    "DevOps Engineer", "Site Reliability Engineer", "Platform Engineer", "Cloud Engineer",
    "Product Manager", "Senior Product Manager", "Technical Program Manager",
    "Data Scientist", "Machine Learning Engineer", "AI/ML Engineer", "Data Engineer",
    "UX Designer", "Product Designer", "UI/UX Designer", "Visual Designer",
    "Technical Lead", "Engineering Manager", "Director of Engineering", "VP of Engineering",
    "Security Engineer", "Penetration Tester", "Security Architect",
    "Mobile Developer", "iOS Developer", "Android Developer", "React Native Developer",
    "QA Engineer", "Test Engineer", "SDET", "Automation Engineer",
    "Solutions Architect", "Technical Architect", "Enterprise Architect"
];
const COMPANIES = [
    "Google", "Microsoft", "Amazon", "Apple", "Meta", "Netflix", "Stripe", "Airbnb",
    "Uber", "Spotify", "Slack", "Zoom", "Salesforce", "Adobe", "Oracle", "IBM",
    "Tesla", "Twitter/X", "TikTok", "ByteDance", "Snowflake", "Databricks", "Figma",
    "Notion", "Discord", "Pinterest", "Snapchat", "Reddit", "Coinbase",
    "Anthropic", "OpenAI", "Cohere", "Hugging Face", "Mistral AI",
    "Shopify", "Square", "Stripe", "Klarna", "Plaid", "Wise",
    "Cloudflare", "Fastly", "Vercel", "Netlify", "Railway", "Render",
    "GitHub", "GitLab", "Atlassian", "Linear", "Notion", "Coda",
    "Twilio", "SendGrid", "MongoDB", "Elastic", "CockroachDB", "PlanetScale",
    "Figma", "InVision", "Zeplin", "Framer", "Webflow", "Squarespace",
    "HubSpot", "Intercom", "Zendesk", "Segment", "Amplitude", "Mixpanel",
    "Datadog", "New Relic", "Sentry", "PagerDuty", "Grafana",
    "Palantir", "Palantir", "Anduril", "SpaceX", "Blue Origin",
    "Brex", "Ramp", "Mercury", "Affirm", "Afterpay", "Klarna"
];

const INTERVIEW_TYPES = ["PHONE_SCREEN", "TECHNICAL", "SYSTEM_DESIGN", "BEHAVIORAL", "FINAL", "OTHER"] as const;
const INTERVIEW_OUTCOMES = ["POSITIVE", "NEUTRAL", "NEGATIVE", null] as const;
const CONTACT_TITLES = ["Recruiter", "Hiring Manager", "HR Manager", "Technical Lead", "Team Lead", "VP of Engineering", "CTO", "CEO", "Director", "Senior Engineer", null];
const NOTE_TEMPLATES = [
    "Strong communication skills demonstrated",
    "Good cultural fit for the team",
    "Technical skills slightly below bar",
    "Excellent problem-solving approach",
    "Need to follow up on salary expectations",
    "Recommended for next round",
    "Very impressed with portfolio",
    "Discussed remote work options",
    "Team is expanding, good timing",
    "Looking for someone with more experience",
    "Perfect match for the role",
    "Will get back within 2 weeks"
];

async function main() {
    logger.info("[SEED]🌱 Seeding database with comprehensive test data...");

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
        await prisma.applicationResume.deleteMany({ where: { application: { userId: existingUser.id } } });
        await prisma.notification.deleteMany({ where: { userId: existingUser.id } });
        await prisma.resume.deleteMany({ where: { userId: existingUser.id } });
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

    // =========================================================================
    // CREATE JOB APPLICATIONS (50-75 for good test coverage)
    // =========================================================================
    const applications: any[] = [];
    const numApplications = faker.number.int({ min: 50, max: 75 });

    for (let i = 0; i < numApplications; i++) {
        const status = faker.helpers.arrayElement(STATUSES);
        const hasAppliedDate = status !== "SAVED" && faker.datatype.boolean();
        const appliedDate = hasAppliedDate
            ? faker.date.past({ years: 2 })
            : null;

        const company = faker.helpers.arrayElement(COMPANIES);
        const jobTitle = faker.helpers.arrayElement(JOB_TITLES);

        const application = await prisma.jobApplication.create({
            data: {
                userId: user.user.id,
                company,
                jobTitle,
                applicationStatus: status,
                location: faker.helpers.arrayElement(LOCATIONS),
                jobURL: `https://careers.${company.toLowerCase().replace(/[^a-z]/g, '')}.com/jobs/${faker.string.alphanumeric(8)}`,
                salaryMin: faker.helpers.maybe(() => faker.number.int({ min: 60000, max: 150000 }), { probability: 0.6 }),
                salaryMax: faker.helpers.maybe(() => faker.number.int({ min: 100000, max: 250000 }), { probability: 0.4 }),
                appliedDate,
                source: faker.helpers.arrayElement(SOURCES),
                notes: faker.helpers.maybe(() => {
                    const numNotes = faker.number.int({ min: 1, max: 3 });
                    return Array(numNotes).fill(null).map(() => faker.helpers.arrayElement(NOTE_TEMPLATES)).join('\n');
                }, { probability: 0.7 }),
                followUpDate: faker.helpers.maybe(() => faker.date.between({ from: new Date(), to: faker.date.future({ years: 0.5 }) }), { probability: 0.4 }),
                followUpNote: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
            }
        });

        // Create status history for applied applications
        if (appliedDate && status !== "SAVED") {
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
                            note: j === 0 ? "Initial application saved" : faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 })
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
                    currentStatus = toStatus as string;
                }
                if (toStatus === status) break;
            }
        }

        // Create contacts for active pipeline applications
        if (["APPLIED", "PHONE_SCREEN", "INTERVIEW", "OFFER"].includes(status)) {
            const numContacts = faker.number.int({ min: 1, max: 4 });
            for (let c = 0; c < numContacts; c++) {
                await prisma.contact.create({
                    data: {
                        applicationId: application.id,
                        name: faker.person.fullName(),
                        title: faker.helpers.arrayElement(CONTACT_TITLES),
                        email: faker.internet.email(),
                        phone: faker.phone.number(),
                        linkedinUrl: `https://linkedin.com/in/${faker.internet.username()}`
                    }
                });
            }
        }

        // Create interview rounds for interview-stage applications
        if (["PHONE_SCREEN", "INTERVIEW", "OFFER"].includes(status)) {
            const numRounds = faker.number.int({ min: 1, max: 5 });
            
            for (let r = 0; r < numRounds; r++) {
                const roundType = faker.helpers.arrayElement(INTERVIEW_TYPES);
                const isPast = faker.datatype.boolean({ probability: 0.7 });
                const scheduledAt = isPast 
                    ? faker.date.past({ years: 1 })
                    : faker.date.soon({ days: faker.number.int({ min: 1, max: 30 }) });
                const outcome = isPast ? faker.helpers.arrayElement(INTERVIEW_OUTCOMES) : null;
                
                await prisma.interviewRound.create({
                    data: {
                        applicationId: application.id,
                        roundType,
                        scheduledAt,
                        interviewerName: faker.datatype.boolean() ? faker.person.fullName() : null,
                        notes: faker.helpers.maybe(() => faker.lorem.paragraph(), { probability: 0.5 }),
                        outcome
                    }
                });
            }
        }

        applications.push(application);
    }

    const appliedApps = applications.filter(a => a.applicationStatus !== "SAVED");
    logger.info(`[SEED]✓ Created ${applications.length} job applications`);

    // =========================================================================
    // CREATE RESUMES AND COVER LETTERS (10-20)
    // =========================================================================
    const resumes = [];
    const resumeTypes = ["RESUME", "COVER_LETTER"] as const;
    const numResumes = faker.number.int({ min: 10, max: 20 });

    const resumeNames = [
        "Software Engineer Resume", "Senior Developer CV", "Frontend Developer Resume",
        "Technical Lead Resume", "Full Stack Developer CV", "Backend Engineer Resume",
        "Machine Learning Engineer CV", "Product Manager Resume", "UX Designer Resume",
        "DevOps Engineer Resume", "Data Scientist CV", "Cloud Engineer Resume",
        "Cover Letter - Google", "Cover Letter - Meta", "Cover Letter - Amazon",
        "Cover Letter - Startup", "Resume - Updated March", "Resume - Final Version"
    ];

    for (let i = 0; i < numResumes; i++) {
        const resumeName = resumeNames[i % resumeNames.length] + (i >= resumeNames.length ? ` ${Math.floor(i / resumeNames.length) + 1}` : '');
        const type = i < numResumes * 0.6 ? "RESUME" : "COVER_LETTER";
        
        let content = {};
        let settings = {};

        if (type === "RESUME") {
            content = {
                basics: {
                    name: user.user.name,
                    label: faker.helpers.arrayElement(JOB_TITLES),
                    email: user.user.email,
                    phone: faker.phone.number(),
                    url: faker.internet.url(),
                    summary: faker.lorem.paragraph(),
                    location: faker.helpers.arrayElement(LOCATIONS) || "Remote",
                    profiles: [
                        { network: "LinkedIn", username: user.user.name.toLowerCase().replace(" ", ""), url: "https://linkedin.com/in/demo" },
                        { network: "GitHub", username: "demo", url: "https://github.com/demo" }
                    ]
                },
                work: Array(faker.number.int({ min: 1, max: 3 })).fill(null).map(() => ({
                    company: faker.helpers.arrayElement(COMPANIES),
                    position: faker.helpers.arrayElement(JOB_TITLES),
                    startDate: "2020-01-01",
                    endDate: "Present",
                    highlights: faker.lorem.sentences(3).split(". ").join("\n")
                })),
                education: [
                    {
                        institution: `${faker.company.name()} University`,
                        studyType: "Bachelor's Degree",
                        area: "Computer Science",
                        startDate: "2016-09-01",
                        endDate: "2020-05-30",
                        score: "3.8"
                    }
                ],
                skills: [
                    { name: "React", level: "Expert", keywords: "Frontend, JavaScript" },
                    { name: "Node.js", level: "Advanced", keywords: "Backend, Bun" },
                    { name: "TypeScript", level: "Expert", keywords: "Type Safety" },
                    { name: "Prisma", level: "Advanced", keywords: "Database, ORM" }
                ],
                projects: [],
                volunteer: [],
                languages: [{ name: "English", fluency: "Native", highlights: "", startDate: "" }],
                certifications: []
            };
            settings = {
                template: faker.helpers.arrayElement(["modern", "professional", "minimal"]),
                color: faker.helpers.arrayElement(["#1e3a8a", "#0f766e", "#a8009a"]),
                fontSize: "medium",
                lineSpacing: "normal",
                margin: "normal"
            };
        } else {
            content = {
                recipientName: faker.person.fullName(),
                recipientTitle: "Hiring Manager",
                company: faker.helpers.arrayElement(COMPANIES),
                address: faker.location.streetAddress(),
                email: faker.internet.email(),
                opening: "I am writing to express my enthusiastic interest in the Software Engineer position.",
                body: faker.lorem.paragraphs(2),
                closing: "Thank you for your time and consideration.",
                signature: "Best regards,"
            };
        }

        const resume = await prisma.resume.create({
            data: {
                userId: user.user.id,
                name: resumeName,
                type,
                content: content as any,
                settings: settings as any
            }
        });

        // Attach some resumes/cover letters to applications
        const randomApp = faker.helpers.arrayElement(applications);
        await prisma.applicationResume.create({
            data: {
                applicationId: randomApp.id,
                resumeId: resume.id
            }
        }).catch(() => {});
    }
    logger.info(`[SEED]✓ Created ${numResumes} resumes and cover letters`);

    // =========================================================================
    // CREATE NOTIFICATIONS (30-50 for testing)
    // =========================================================================
    const notifications = [];
    const notificationTypes = ["FOLLOW_UP_DUE", "FOLLOW_UP_OVERDUE"] as const;
    const numNotifications = faker.number.int({ min: 30, max: 50 });

    const notificationTitles = [
        "Follow-up reminder", "Interview follow-up needed", "Application status update",
        "Check in with recruiter", "Time to follow up!", "Interview scheduled",
        "Interview in 2 days", "Interview tomorrow!", "Application viewed by recruiter",
        "Application rejected", "Application moved to next stage!", "Offer received!",
        "Reminder: Send thank you email", "Update your application status",
        "New message from recruiter", "Interview feedback received"
    ];

    for (let i = 0; i < numNotifications; i++) {
        const app = faker.helpers.arrayElement(appliedApps);
        const type = faker.helpers.arrayElement(notificationTypes);
        
        const notification = await prisma.notification.create({
            data: {
                userId: user.user.id,
                applicationId: faker.datatype.boolean({ probability: 0.7 }) ? app.id : null,
                type,
                title: faker.helpers.arrayElement(notificationTitles),
                body: faker.lorem.sentence(),
                readAt: faker.datatype.boolean({ probability: 0.5 }) ? faker.date.recent({ days: 7 }) : null,
                actionedAt: faker.datatype.boolean({ probability: 0.2 }) ? faker.date.recent({ days: 3 }) : null,
                createdAt: faker.date.recent({ days: 60 })
            }
        });
        notifications.push(notification);
    }
    logger.info(`[SEED]✓ Created ${notifications.length} notifications`);

    // =========================================================================
    // CREATE REMINDER JOBS (10-15)
    // =========================================================================
    const appsWithFollowUp = appliedApps.filter(a => a.followUpDate);
    for (const app of appsWithFollowUp.slice(0, 15)) {
        await prisma.reminderJob.create({
            data: {
                applicationId: app.id,
                scheduledDate: app.followUpDate!,
                sentAt: faker.datatype.boolean() ? faker.date.recent({ days: 7 }) : null
            }
        }).catch(() => {});
    }
    logger.info(`[SEED]✓ Created ${appsWithFollowUp.slice(0, 15).length} reminder jobs`);

    // =========================================================================
    // CREATE SECOND USER FOR TESTING SHARING
    // =========================================================================
    const secondUserEmail = "test2@orbit.app";
    const existingSecondUser = await prisma.user.findUnique({
        where: { email: secondUserEmail }
    });

    if (!existingSecondUser) {
        await auth.api.signUpEmail({
            body: {
                name: "Jordan Smith",
                email: secondUserEmail,
                password: "password123",
            }
        });
        logger.info(`[SEED]✓ Created second test user: ${secondUserEmail}`);
    }

    // =========================================================================
    // SUMMARY
    // =========================================================================
    const statusCounts = STATUSES.reduce((acc, status) => {
        acc[status] = applications.filter(a => a.applicationStatus === status).length;
        return acc;
    }, {} as Record<string, number>);

    logger.info("\n[SEED]========================================");
    logger.info("[SEED]✅ SEEDING COMPLETE!");
    logger.info("[SEED]========================================");
    logger.info(`   Login: demo@orbit.app / password123`);
    logger.info(`   ───────────────────────────────────`);
    logger.info(`   📊 APPLICATIONS: ${applications.length}`);
    logger.info(`      - SAVED: ${statusCounts.SAVED || 0}`);
    logger.info(`      - APPLIED: ${statusCounts.APPLIED || 0}`);
    logger.info(`      - PHONE_SCREEN: ${statusCounts.PHONE_SCREEN || 0}`);
    logger.info(`      - INTERVIEW: ${statusCounts.INTERVIEW || 0}`);
    logger.info(`      - OFFER: ${statusCounts.OFFER || 0}`);
    logger.info(`      - CLOSED: ${statusCounts.CLOSED || 0}`);
    logger.info(`   📄 RESUMES: ${numResumes}`);
    logger.info(`   🔔 NOTIFICATIONS: ${notifications.length}`);
    logger.info(`   ⏰ REMINDERS: ${appsWithFollowUp.slice(0, 15).length}`);
    logger.info(`   👤 SECOND USER: ${secondUserEmail}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
