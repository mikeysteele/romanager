# Romanager

> A modern, self-hosted web application for organizing, managing, cataloging, and playing retro video game ROMs and firmware.

Romanager brings the streamlined, automated management style of the "*arr" ecosystem (Radarr, Sonarr) to retro gaming collections. It pairs recursive file tree scanning with rich metadata enrichment from [RAWG](https://rawg.io), non-destructive staging, firmware/BIOS management, background deletion workers, an embedded WebDAV file server, and a companion sync CLI to keep retro handhelds and emulator frontends in lockstep with your server.

---

## Key Features

- 🎮 **Unified Game & Multi-Platform Catalog**: Group multiple regional versions, revisions, and cross-platform ROMs under canonical game entries with rich artwork, release metadata, and ratings.
- 🔍 **Non-Destructive Ingestion & Staging**: Automatic recursive directory scanner detects new files safely into an unmapped staging table (`scanned_files`) without polluting your clean library.
- 🏷️ **Intelligent Unmapped Triage**: Fast, bulk review of scanned files with automatic title guessing, RAWG online database matching, platform filtering, and region tagging (USA, EUR, JPN, WLD).
- 🧩 **Firmware & BIOS Tracker**: Manage system firmware and BIOS files required by emulators; map discovered BIOS dumps directly to emulation platforms.
- 💻 **Companion CLI (`romanager-sync`)**: Standalone Single Executable Application (SEA) for Batocera, Steam Deck, and EmulationStation handhelds supporting atomic multi-file ROM sets, live SSE watch daemon, and bidirectional save backup/restore.
- ⚡ **Background Processing & Real-Time Sync**: Multi-threaded architecture utilizing Node.js worker threads (`node:worker_threads`) for CPU/IO-heavy scanning and physical file deletion, with live progress updates streamed via Server-Sent Events (SSE).
- 🌐 **Embedded WebDAV Server**: Mount your ROM collection directly to network-connected retro handhelds (e.g. Miyoo Mini, Anbernic, Steam Deck, PS Vita) or emulator frontends (RetroArch, EmulationStation).
- 🕹️ **In-Browser Emulator Shell**: Built-in player foundation to launch and play ROMs directly in your browser.

---

## Monorepo Architecture

Romanager is built as a TypeScript monorepo powered by **Node.js 26** and **pnpm workspaces**:

| Workspace | Description | Tech Stack |
| :--- | :--- | :--- |
| [`apps/api`](apps/api) | REST API, WebDAV, sync endpoints & SSE event bus | Node.js 26, Hono (`@hono/node-server`), Drizzle ORM, LibSQL/SQLite, `node:worker_threads` |
| [`apps/ui`](apps/ui) | Single Page Application (SPA) | Lit Web Components, `@lit-labs/router`, Open Props CSS, Vite 8 |
| [`apps/cli`](apps/cli) | Companion CLI sync agent (`romanager-sync`) | Node.js 26 native SEA, Rolldown, TypeScript 7, `@repo/shared` |
| [`packages/shared`](packages/shared) | Shared domain models, types, and Zod schemas | TypeScript 7, Zod |
| [`packages/ui-components`](packages/ui-components) | Design system & reusable web components | Lit Web Components, Open Props |
| [`tests`](tests) | Isolated test suite (`@repo/tests`) | Vitest 5, Playwright BDD, JSDOM |

---

## Documentation

For comprehensive technical documentation, refer to the guides in the [`docs/`](docs/) directory:

- 📖 **[Feature Specifications](docs/features.md)**: Detailed breakdown of each feature, user flows, and business logic.
- 🏛️ **[System Architecture](docs/architecture.md)**: Deep dive into the monorepo structure, worker concurrency, SSE event bus, and WebDAV mounting.
- 🔄 **[Companion CLI Spec & Architecture](docs/companion-cli.md)**: Sync protocol, ROM sets atomic model, and device manifest resolution.
- 📡 **[API Reference](docs/api-reference.md)**: Complete REST API documentation, endpoints, query parameters, payloads, and SSE stream contracts.
- 🗄️ **[Database Schema](docs/database-schema.md)**: Entity-Relationship diagram, table schemas, relationships, and indexing.
- 🎨 **[UI Components & Design System](docs/ui-components.md)**: Lit component catalog, routing table, and Open Props design tokens.
- 📑 **[Architecture Decision Records (ADRs)](docs/adr/README.md)**: Records of key architectural decisions:
  - [ADR 0001: Migrate from Deno to Node.js](docs/adr/0001-migrate-from-deno-to-nodejs.md)
  - [ADR 0002: CLI Standalone Binaries via Node SEA](docs/adr/0002-cli-standalone-binaries-via-node-sea.md)
  - [ADR 0003: Modern Frontend Toolchain (Oxc, Vite 8, TypeScript 7)](docs/adr/0003-frontend-toolchain-oxc-vite-ts7.md)

---

## Companion CLI (`romanager-sync`)

The Romanager Companion CLI is a standalone binary that runs on emulation devices (Batocera PC, Steam Deck, Raspberry Pi, Anbernic, or any Linux handheld running EmulationStation). It keeps local storage in sync with a server-defined profile.

### Highlights
- **Atomic Multi-File ROM Sets**: Games composed of multiple files (`.cue`+`.bin`, `.gdi`+tracks, `.m3u` playlists, multi-disc folders) sync, verify, and delete as single atomic units.
- **Per-Device Rules & Profiles**: Define what each device receives (e.g. storage budget limits, region preferences like `USA > EUR > JPN`, `oneRomPerGame` deduplication, system inclusion/exclusion rules).
- **Authenticated & Scoped**: Requests carry a device-scoped API key (`rmg_...`). Web UI and WebDAV remain unauthenticated for internal home networks.
- **Resumable & Verified**: Downloads support HTTP `Range` headers for auto-resume and verify SHA-1 checksums upon receipt before moving into active library directories.
- **Saves Backup & Restore**: Upload emulator save files (`.srm`, `.sav`, etc.) to the server with timestamped version history, and restore specific versions when desired.
- **Live Watch Daemon**: A background daemon mode connects to the server's Server-Sent Events (SSE) stream and automatically syncs when library manifests change.

### 1. Enrolling a Device

1. Open the Romanager Web UI and navigate to **Settings** &rarr; **Devices**.
2. Click **Enroll New Device**.
3. Choose your device preset (`batocera`, `es-de`, or `retropie`), name the device, and set optional storage budgets or region priorities.
4. Copy the generated enrollment command and API key.

### 2. Building the CLI Standalone Executable

Generate a standalone native executable with zero runtime dependencies using Node.js 26 native Single Executable Application (SEA) and Rolldown:

```bash
# Build standalone CLI binary
pnpm run build:cli
```

The compiled binary will be output to `apps/cli/dist/romanager-sync`.

Alternatively, run in development mode directly via `tsx`:
```bash
pnpm --filter @repo/cli start -- <command>
```

### 3. Basic CLI Usage

#### Initialize Device
Run on the client device once to save server connection details and credentials (stored with `0600` permissions in `~/.config/romanager/config.json` or `/userdata/system/romanager/config.json`):
```bash
romanager-sync init \
  --server http://192.168.1.100:8000 \
  --key rmg_your_device_api_key_here \
  --preset batocera
```

#### Check Status
View device profile settings, server connectivity, storage usage, and last sync timestamp:
```bash
romanager-sync status
```

#### Dry-Run Sync Plan
Preview what files would be added, updated, or pruned without modifying disk:
```bash
romanager-sync plan
```

#### Execute Synchronization
Download missing or updated ROMs and firmware atomically, remove pruned files, and optionally reload EmulationStation:
```bash
romanager-sync sync
```

#### Run in Watch Mode (Live Daemon)
Keep the device in continuous sync by listening to server SSE manifest updates:
```bash
# Listens on server SSE stream with automatic debounced sync
romanager-sync watch

# Fallback polling mode (polls every N seconds)
romanager-sync watch --poll 300
```

#### Saves Backup & Restore
Back up emulator saves from your device to the Romanager server:
```bash
# Push all local saves to the server (only uploads new or changed saves)
romanager-sync saves push

# List all backed-up save files and versions stored on the server
romanager-sync saves list

# Restore a save file to local disk (latest version by default)
romanager-sync saves restore snes/smw.srm

# Restore a specific past version of a save
romanager-sync saves restore snes/smw.srm --version=<version-uuid>
```

#### Diagnostics & Adoption
```bash
# Run system checks on paths, disk space, and server reachability
romanager-sync doctor

# Adopt existing ROM files on disk matching the server manifest without re-downloading
romanager-sync adopt
```

---

## Quickstart

### Prerequisites

- **[Node.js](https://nodejs.org/)** (v26 recommended, or v22 LTS)
- **[pnpm](https://pnpm.io/)** (v11.8.0 or compatible)
- *(Optional)* **RAWG API Key**: Get a free API key at [rawg.io/apidocs](https://rawg.io/apidocs) for metadata enrichment.

### Configuration

Create a `.env` file in the project root:

```ini
RAWG_API_KEY=your_rawg_api_key_here
DB_URL=file:romanager.db
```

Romanager automatically discovers and loads `.env` variables in both development (`pnpm dev`) and production runtime.

### Running Locally

```bash
# Install dependencies
pnpm install

# Run both frontend and backend concurrently in dev mode
pnpm dev

# Or run services individually:
pnpm dev:api    # Start Hono API backend (http://localhost:8000)
pnpm dev:ui     # Start Vite dev server for Lit frontend (http://localhost:5173)
```

Once started, navigate to `http://localhost:5173` (Vite dev server) or `http://localhost:8000` (API backend).

---

## Development Tasks

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts API backend and UI dev server concurrently |
| `pnpm dev:api` | Starts API server with hot-reload via `tsx watch` |
| `pnpm dev:ui` | Starts frontend Vite dev server |
| `pnpm build` | Builds all packages and applications |
| `pnpm build:ui` | Builds the production bundle of the Lit frontend into `apps/ui/dist` |
| `pnpm build:cli` | Builds the standalone native CLI binary using Node 26 SEA |
| `pnpm test` | Runs the full Vitest test suite |
| `pnpm test:api` | Runs API and database test suite against isolated `test.db` |
| `pnpm test:unit` | Runs unit test suite |
| `pnpm test:migrations` | Verifies and replays Drizzle database migrations |
| `pnpm test:e2e` | Generates BDD steps (`bddgen`) and runs Playwright E2E tests |
| `pnpm run lint` | Runs type-aware linting with `oxlint` and `tsgolint` |
| `pnpm run typecheck` | Runs TypeScript 7 typecheck across all workspace packages |
| `pnpm db:migrate` | Applies pending Drizzle migrations |
| `pnpm db:push` | Pushes Drizzle ORM schema changes directly to the database |
| `pnpm db:generate` | Generates Drizzle SQL migration files |

---

## License

MIT License. See [LICENSE](LICENSE) for details.
