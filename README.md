# Orbit Server

Express + Bun backend for the Orbit job application tracker.

### Features
- **Job Tracking** - CRUD operations for job applications with status workflows and priority levels.
- **Document Management** - Versioned file uploads for CVs and cover letters with local storage support.
- **Automated Reminders** - Daily cron jobs for follow-up email notifications with snooze/complete actions.
- **Unified Auth** - Email/password and Google OAuth integration powered by Better Auth.
- **Interview Logs** - Track multiple interview rounds with types, outcomes, and detailed notes.
- **Analytics** - Visualized application stats, conversion rates, and response metrics.
- **Notification System** - In-app and email alerts for upcoming or overdue follow-ups.

### Tech Stack
| Name | Purpose |
|------|---------|
| Bun | JavaScript runtime and package manager |
| Express.js | Web framework for API routing |
| PostgreSQL | Primary relational database |
| Prisma | Type-safe ORM for database interactions |
| Better Auth | Authentication and session management |
| Redis | Caching and session performance optimization |
| Zod | Schema validation for API requests |
| Scalar | Interactive OpenAPI/Swagger documentation |
| Pino | Structured JSON logging |

### Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Usage](#usage)
- [API Reference](#api-reference)
- [License](#license)

### Prerequisites
- Node.js >= 20
- Bun >= 1.1
- PostgreSQL >= 15
- Redis (optional, for caching)

### Installation
1. Install dependencies:
```bash
bun install
```

2. Generate the Prisma client:
```bash
bunx prisma generate
```

3. Push the schema to your database:
```bash
bunx prisma db push
```

### Usage
#### Development
Start the server with hot reload:
```bash
bun run watch
```

#### Production
Build and start the server:
```bash
bun run build
bun run start
```

#### Maintenance
Run tests or seed the database:
```bash
bun test
bun run seed
```

### Environment Variables
```env
# Database & Redis
DATABASE_URL=postgresql://user:pass@localhost:5432/orbit
REDIS_URL=redis://localhost:6379

# Auth
BETTER_AUTH_SECRET=your-32-char-secret
SESSION_SECRET=your-session-secret

# Email
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
RESEND_API_KEY=re_123456789

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### API Reference
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/*` | ALL | Authentication routes (Sign-in, Sign-up, Sign-out) |
| `/api/v1/applications` | GET/POST | List and create job applications |
| `/api/v1/documents` | GET/POST | Manage documents and file uploads |
| `/api/v1/notifications` | GET/PATCH | Handle user notifications |
| `/api/v1/analytics/overview`| GET | Dashboard statistics and insights |
| `/docs` | GET | Interactive Scalar API documentation |

### Project Structure
```plaintext
src/
├── api/          # Feature modules (auth, applications, documents)
├── middlewares/  # Express middlewares (auth, error, validation)
├── services/     # External integrations (email)
├── jobs/         # Scheduled cron tasks
├── utils/        # Shared helpers (prisma, redis, logger)
├── app.ts        # Express app configuration
└── index.ts      # Server entry point
```

### License
This project is licensed under the MIT License.
