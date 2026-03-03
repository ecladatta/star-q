# syntax=docker.io/docker/dockerfile:1

FROM node:24-alpine AS base

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy only the necessary files for migrations
COPY package.json pnpm-lock.yaml .npmrc* ./
RUN pnpm install --frozen-lockfile

COPY drizzle.config.ts .
COPY ./migrations ./migrations

# Default command to run migrations
CMD ["pnpm", "exec", "drizzle-kit", "migrate"]