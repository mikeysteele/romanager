# Build stage for UI Single Page Application
FROM denoland/deno:2.1.4 AS ui-builder
WORKDIR /app

# Copy dependency manifests
COPY deno.json deno.lock* ./
COPY apps/ui/package.json* ./apps/ui/
COPY apps/ui/deno.json* ./apps/ui/
COPY apps/ui/tsconfig.json* ./apps/ui/
COPY apps/ui/vite.config.ts ./apps/ui/
COPY packages ./packages
COPY apps/ui/src ./apps/ui/src

# Cache dependencies and build static UI bundle
RUN deno task build:ui

# Production runtime stage
FROM denoland/deno:2.1.4 AS runner
WORKDIR /app

# Create persistent storage directories
RUN mkdir -p /data /roms

# Copy dependency files and source code
COPY deno.json deno.lock* ./
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
CMD ["run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "--allow-sys", "--allow-ffi", "apps/api/main.ts"]
