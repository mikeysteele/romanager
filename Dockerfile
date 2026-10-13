# Build stage for UI Single Page Application
FROM node:22-bookworm-slim AS ui-builder
WORKDIR /app

# Enable Corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependency manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui-components/package.json ./packages/ui-components/
COPY apps/ui/package.json ./apps/ui/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy UI and package source files
COPY packages ./packages
COPY apps/ui ./apps/ui

# Build static UI bundle
RUN pnpm run build:ui

# Production runtime stage
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Enable Corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create persistent storage directories
RUN mkdir -p /data /roms

# Copy dependency manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui-components/package.json ./packages/ui-components/
COPY apps/api/package.json ./apps/api/

# Install runtime dependencies
RUN pnpm install --frozen-lockfile

# Copy backend source code and migrations
COPY packages ./packages
COPY apps/api ./apps/api
COPY drizzle ./drizzle

# Copy compiled frontend assets from ui-builder
COPY --from=ui-builder /app/apps/ui/dist ./apps/ui/dist

# Default environment configuration
ENV PORT=8000
ENV DB_URL="file:/data/romanager.db"
ENV ROMS_DIR="/roms"
ENV APP_DIR="./apps/ui/dist"

EXPOSE 8000

# Mount points for ROMs and DB
VOLUME ["/data", "/roms"]

# Start server
CMD ["pnpm", "start"]
