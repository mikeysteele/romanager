# Build stage for UI Single Page Application and API Backend
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Enable Corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependency manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui-components/package.json ./packages/ui-components/
COPY apps/ui/package.json ./apps/ui/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages ./packages
COPY apps/ui ./apps/ui
COPY apps/api ./apps/api

# Build static UI bundle and compiled API bundle
RUN pnpm run build:ui && pnpm run build:api

# Production runtime stage
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Enable Corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create persistent storage directories and assign ownership to node user
RUN mkdir -p /data /roms && chown -R node:node /data /roms /app

# Copy dependency manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install production runtime dependencies only (no tsx/vite/playwright/devDependencies)
RUN pnpm install --prod --frozen-lockfile

# Copy compiled backend, compiled frontend assets, and database migrations
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/ui/dist ./apps/ui/dist
COPY drizzle ./drizzle

# Ensure app files are owned by node user
RUN chown -R node:node /app

# Default environment configuration
ENV PORT=8000
ENV DB_URL="file:/data/romanager.db"
ENV ROMS_DIR="/roms"
ENV APP_DIR="/app/apps/ui/dist"

EXPOSE 8000

# Mount points for ROMs and DB
VOLUME ["/data", "/roms"]

# Switch to non-root user
USER node

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e 'fetch("http://localhost:" + (process.env.PORT || 8000) + "/api/health").then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))'

# Start compiled server directly with Node
CMD ["node", "apps/api/dist/main.js"]
