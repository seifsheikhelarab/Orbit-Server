# Orbit Server

Express + Bun backend for the Orbit job application tracker.

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Bun |
| Framework | Express.js |
| Database | PostgreSQL with Prisma ORM |
| Auth | Better Auth |
| Validation | Zod |
| Caching | Redis |
| Email | Nodemailer (SMTP) or Resend |
| API Docs | Scalar (OpenAPI) |
| Logging | Pino |
| File Upload | Multer |
| Jobs | node-cron |

## Features

### Authentication & Authorization

- **Email/Password Auth** - Sign up and sign in with email and password
- **Google OAuth** - Sign in with Google account
- **Session Management** - JWT-based sessions with secure cookies
- **Protected Routes** - All application routes require authentication
- **User-specific Data** - All data is scoped to the authenticated user

### Job Application Management

- **CRUD Operations** - Create, read, update, delete job applications
- **Fields Tracked**:
  - Company name, job title, job URL
  - Location (remote, hybrid, onsite)
  - Salary range (min/max)
  - Application status
  - Applied date
  - Notes
  - Source (where you found the job)
- **Status Workflow**: Saved → Applied → Phone Screen → Interview → Offer → Closed
- **Job Types**: Full-time, Part-time, Internship
- **Priority Levels**: Low, Medium, High
- **Status History** - Automatic logging of all status changes with timestamps

### Document Management

- **Multi-version Documents** - Upload new versions while preserving history
- **Document Types**: CV, Cover Letter, Portfolio, Other
- **Storage Backends**:
  - Local filesystem (default)
  - Extensible to S3, Google Cloud Storage
- **File Handling**:
  - Upload with original filename preservation
  - Version tracking with version numbers
  - Soft delete with cleanup job

### Application-Document Attachments

- **Attach Documents** - Link documents to specific job applications
- **Multiple Attachments** - Each application can have multiple documents attached
- **Versioned Attachments** - Attachments reference specific document versions

### Interview Tracking

- **Round Types**: Phone Screen, Technical, System Design, Behavioral, Final, Other
- **Interview Details**: Scheduled date, interviewer name, notes
- **Outcomes**: Positive, Neutral, Negative

### Contact Management

- **Per-Application Contacts** - Store recruiter/hiring manager info
- **Fields**: Name, title, email, phone, LinkedIn URL

### Reminders & Follow-ups

- **Scheduled Reminders** - Set follow-up dates for applications
- **Email Notifications** - Send email reminders when due
- **Actions via Email** - Snooze (3/7 days) or mark done directly from email
- **Cron Jobs** - Automated daily check for due reminders

### Notifications

- **In-App Notifications** - Notification center for user activity
- **Types**:
  - Follow-up due
  - Follow-up overdue
- **Read Status** - Mark as read or actioned

### Analytics & Insights

- **Application Stats** - Total applications, by status
- **Success Rates** - Interview-to-offer conversion
- **Time Tracking** - Average time in each stage
- **Response Rates** - Applied vs responses received

### Scheduled Jobs

- **Follow-up Reminder Job** - Runs daily to send due reminder emails
- **Document Cleanup Job** - Runs daily to permanently delete soft-deleted documents

### API Documentation

- **OpenAPI/Swagger** - Auto-generated from routes using Scalar
- **Interactive Docs** - Test endpoints directly in browser at `/docs`

## Implementation Details

### Project Structure

```
src/
├── api/                          # Route handlers (controller, service, router, schemas)
│   ├── auth/                    # Better Auth integration
│   ├── applications/            # Job applications CRUD
│   ├── documents/                # Document management with versioning
│   ├── application-documents/    # Document-application attachments
│   ├── notifications/           # In-app notifications
│   ├── reminders/               # Follow-up reminders
│   ├── analytics/               # Stats and insights
│   └── users/                   # User preferences
├── middlewares/                  # Express middleware
│   ├── auth.middleware.ts       # Session verification
│   ├── validation.middleware.ts # Zod validation
│   ├── upload.middleware.ts    # Multer file upload
│   └── error.middleware.ts     # Error handling
├── services/                     # Business logic
│   └── email/                   # Email services (SMTP, Resend)
├── jobs/                         # Cron jobs
│   ├── sendFollowUpReminders.job.ts
│   └── cleanupDeletedDocuments.job.ts
├── utils/                        # Helpers
│   ├── auth.ts                  # Better Auth configuration
│   ├── prisma.ts                # Prisma client singleton
│   ├── redis.ts                # Redis client
│   ├── cache.ts                # Caching utilities
│   ├── logger.ts               # Pino logger
│   ├── response.ts             # Response formatters
│   ├── storage/                # Storage backends
│   └── openapi.ts              # OpenAPI spec generation
├── app.ts                        # Express app setup
└── index.ts                      # Entry point
```

### Architecture Pattern

The server follows a **layered architecture**:

1. **Router** - HTTP layer, handles request/response
2. **Controller** - Request validation, calls service
3. **Service** - Business logic, data transformation
4. **Repository/Prisma** - Database operations

### Request Flow

```
HTTP Request
    ↓
Middleware (CORS, Helmet, Auth)
    ↓
Router (route matching)
    ↓
Controller (validate input)
    ↓
Service (business logic)
    ↓
Prisma (database)
    ↓
Response (formatted JSON)
```

### Authentication Flow

1. Client sends credentials to `/api/auth/sign-in`
2. Better Auth validates and creates session
3. Session cookie set via Set-Cookie header
4. Client includes cookie in subsequent requests
5. `auth.middleware.ts` validates session for protected routes
6. User ID extracted and passed to controllers

### Data Models

| Model | Description |
|-------|-------------|
| User | User account, preferences |
| Session | Active login sessions |
| Account | OAuth provider links |
| Verification | Email verification tokens |
| JobApplication | Job applications |
| StatusHistory | Application status change log |
| Document | Documents with versions |
| DocumentVersion | Individual file versions |
| ApplicationDocument | Application-document links |
| Notification | In-app notifications |
| ReminderJob | Scheduled reminders |
| Contact | Application contacts |
| InterviewRound | Interview rounds |

### API Response Format

**Success**:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Paginated**:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

**Error**:
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "status": 400
}
```

### Error Handling

- Custom error classes: `AppError`, `NotFoundError`, `ValidationError`, `AuthenticationError`
- Global error middleware catches all unhandled errors
- Zod validation returns structured validation errors
- Production mode hides stack traces

### Caching Strategy

- Redis for caching frequently accessed data
- Cache invalidation on mutations
- Graceful fallback if Redis unavailable

### Logging

- **Pino** for structured JSON logging
- **Levels**: debug, info, warn, error
- **Pretty printing** in development
- **Request ID** tracking for correlation

### File Upload

- **Multer** for multipart form-data
- **Validation**: File type, size limits
- **Storage**: Local filesystem with configurable path
- **Naming**: UUID-based to prevent collisions

### Cron Jobs

- **node-cron** for scheduling
- **Reminder Job**: Daily at 8 AM (configurable)
- **Cleanup Job**: Daily at 2 AM (configurable)
- Graceful startup after server ready

## Getting Started

### Prerequisites

- Bun installed
- PostgreSQL (or use SQLite for development)
- Redis (optional, for caching)

### Installation

```bash
bun install
```

### Database Setup

```bash
# Generate Prisma client
bunx prisma generate

# Push schema to database
bunx prisma db push

# Seed with sample data (optional)
bun run seed
```

### Development

```bash
# Start with hot reload
bun run watch

# Or run normally
bun run start
```

The server runs at `http://localhost:3000`

### Environment Variables

Create a `.env` file (see `.env.example`):

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/orbit

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Auth
BETTER_AUTH_SECRET=your-secret-at-least-32-chars
SESSION_SECRET=your-session-secret

# Email (choose one provider)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Or use Resend
RESEND_API_KEY=re_123456789

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run start` | Start production server |
| `bun run watch` | Start with hot reload |
| `bun test` | Run all tests |
| `bun run lint` | Lint with auto-fix |
| `bun run format` | Format with Prettier |
| `bun run build` | Type-check with tsc |
| `bun run seed` | Seed database with sample data |
| `bun run docs` | Generate API documentation |

## API Endpoints

### Authentication (Better Auth)

- `POST /api/auth/sign-in` - Sign in
- `POST /api/auth/sign-up` - Sign up
- `GET /api/auth/get-session` - Get current session
- `POST /api/auth/sign-out` - Sign out
- `GET /api/auth/callback/google` - Google OAuth callback

### Applications

- `GET /api/v1/applications` - List (paginated, filtered)
- `POST /api/v1/applications` - Create
- `GET /api/v1/applications/:id` - Get by ID
- `PATCH /api/v1/applications/:id` - Update
- `DELETE /api/v1/applications/:id` - Delete
- `GET /api/v1/applications/:id/history` - Status history
- `GET /api/v1/applications/:id/contacts` - Application contacts
- `POST /api/v1/applications/:id/contacts` - Add contact
- `GET /api/v1/applications/:id/interviews` - Interview rounds
- `POST /api/v1/applications/:id/interviews` - Add interview round

### Documents

- `GET /api/v1/documents` - List
- `POST /api/v1/documents` - Upload
- `GET /api/v1/documents/:id` - Get by ID
- `PATCH /api/v1/documents/:id` - Update metadata
- `DELETE /api/v1/documents/:id` - Soft delete
- `POST /api/v1/documents/:id/versions` - Upload new version
- `GET /api/v1/documents/:id/versions/:versionId/download` - Download version

### Application Documents

- `GET /api/v1/applications/:id/documents` - List attached
- `POST /api/v1/applications/:id/documents` - Attach document
- `DELETE /api/v1/applications/:id/documents/:attachmentId` - Detach

### Notifications

- `GET /api/v1/notifications` - List
- `PATCH /api/v1/notifications/:id/read` - Mark as read
- `PATCH /api/v1/notifications/:id/action` - Mark as actioned
- `DELETE /api/v1/notifications/:id` - Delete

### Reminders

- `GET /api/v1/reminders` - List
- `POST /api/v1/reminders` - Create reminder
- `PATCH /api/v1/reminders/:id` - Update reminder
- `DELETE /api/v1/reminders/:id` - Delete reminder
- `GET /api/v1/reminders/action?token=` - Action via email link

### Analytics

- `GET /api/v1/analytics/overview` - Dashboard stats
- `GET /api/v1/analytics/status-distribution` - Applications by status
- `GET /api/v1/analytics/response-rate` - Application response metrics

### Users

- `GET /api/v1/users/me` - Get current user
- `PATCH /api/v1/users/me` - Update preferences

## API Documentation

When running, visit `http://localhost:3000/docs` for interactive API docs powered by Scalar.

## Docker

The server can be containerized with the included `Dockerfile`:

```bash
# Build and run with docker-compose
docker-compose up --build
```

See the root `docker-compose.yml` for full stack orchestration with PostgreSQL and Redis.
