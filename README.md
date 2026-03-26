# Orbit Server

Express + TypeScript backend for the Orbit job application tracker.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Express.js
- **Database**: SQLite with Prisma ORM
- **Auth**: Better Auth
- **Validation**: Zod
- **Caching**: Redis (via Upstash)
- **API Docs**: Scalar

## Getting Started

### Prerequisites

- Bun installed
- Redis (optional, for caching)

### Installation

```bash
bun install
```

### Database Setup

```bash
bun prisma generate
bun prisma db push
```

### Development

```bash
# Start with hot reload
bun run --watch src/index.ts

# Or run normally
bun src/index.ts
```

The server runs at `http://localhost:3000`

## Scripts

| Command | Description |
|---------|-------------|
| `bun run src/index.ts` | Start production server |
| `bun run --watch src/index.ts` | Start with hot reload |
| `bun test` | Run tests |
| `bun run lint` | Lint with auto-fix |
| `bun run format` | Format with Prettier |
| `bun run build` | Type-check with tsc |

## API Endpoints

### Authentication

- `POST /api/v1/auth/sign-in` - Sign in
- `POST /api/v1/auth/sign-up` - Sign up
- `GET /api/v1/auth/get-session` - Get current session
- `POST /api/v1/auth/sign-out` - Sign out

### Applications

- `GET /api/v1/applications` - List applications (paginated)
- `POST /api/v1/applications` - Create application
- `GET /api/v1/applications/:id` - Get application details
- `PATCH /api/v1/applications/:id` - Update application
- `DELETE /api/v1/applications/:id` - Delete application
- `GET /api/v1/applications/document-counts?ids=...` - Get document counts

### Documents

- `GET /api/v1/documents` - List documents
- `POST /api/v1/documents` - Upload document
- `GET /api/v1/documents/:id` - Get document details
- `PATCH /api/v1/documents/:id` - Update document
- `DELETE /api/v1/documents/:id` - Delete document
- `GET /api/v1/documents/:id/versions/:versionId/download` - Download version

### Application Documents

- `GET /api/v1/applications/:id/documents` - List attached documents
- `POST /api/v1/applications/:id/documents` - Attach document
- `DELETE /api/v1/applications/:id/documents/:attachmentId` - Detach document

## Project Structure

```
src/
├── api/                 # Route handlers
│   ├── auth/           # Authentication
│   ├── applications/   # Job applications
│   └── application-documents/ # Document attachments
├── middlewares/        # Express middleware (auth, error, validation)
├── utils/              # Helpers (prisma, logger, response, cache)
└── index.ts            # Entry point
```

## Environment Variables

Create a `.env` file:

```env
DATABASE_URL="file:./dev.db"
BETTER_AUTH_SECRET="your-secret-key"
REDIS_URL="your-redis-url"
```

## API Documentation

When running, visit `http://localhost:3000/scalar` for interactive API docs.