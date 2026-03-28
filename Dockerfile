FROM oven/bun:latest AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./
COPY prisma ./prisma/
RUN bun install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .
RUN bunx prisma generate

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/prisma/schema.prisma ./

EXPOSE 3000

CMD ["bun", "src/index.ts"]
