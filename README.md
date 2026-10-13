# Romanager

> A modern, self-hosted web application for organizing, managing, cataloging, and playing retro video game ROMs and firmware.

Romanager brings the streamlined, automated management style of the "*arr" ecosystem (Radarr, Sonarr) to retro gaming collections. It pairs recursive file tree scanning with rich metadata enrichment from [RAWG](https://rawg.io), non-destructive staging, firmware/BIOS management, background deletion workers, an embedded WebDAV file server, and a companion sync CLI to keep retro handhelds and emulator frontends in lockstep with your server.

---

## Key Features

- 🎮 **Unified Game & Multi-Platform Catalog**: Group multiple regional versions, revisions, and cross-platform ROMs under canonical game entries with rich artwork, release metadata, and ratings.
- 🔍 **Non-Destructive Ingestion & Staging**: Automatic recursive directory scanner detects new files safely into an unmapped staging table (`scanned_files`) without polluting your clean library.
- 🏷️ **Intelligent Unmapped Triage**: Fast, bulk review of scanned files with automatic title guessing, RAWG online database matching, platform filtering, and region tagging (USA, EUR, JPN, WLD).
- 🧩 **Firmware & BIOS Tracker**: Manage system firmware and BIOS files required by emulators; map discovered BIOS dumps directly to emulation platforms.
- 💻 **Companion CLI (`romanager-sync`)**: Native sync client for Batocera, Steam Deck, and EmulationStation handhelds supporting atomic multi-file ROM sets, live SSE watch daemon, and bidirectional save backup/restore.
- ⚡ **Background Processing & Real-Time Sync**: Multi-threaded architecture utilizing Deno Web Workers for CPU/IO-heavy scanning and physical file deletion, with live progress updates streamed via Server-Sent Events (SSE).
- 🌐 **Embedded WebDAV Server**: Mount your ROM collection directly to network-connected retro handhelds (e.g. Miyoo Mini, Anbernic, Steam Deck, PS Vita) or emulator frontends (RetroArch, EmulationStation).
- 🕹️ **In-Browser Emulator Shell**: Built-in player foundation to launch and play ROMs directly in your browser.

---

## Monorepo Architecture

Romanager is built as a TypeScript monorepo powered by **[Deno](https://deno.com)** and modern web standards:

| Workspace | Description | Tech Stack |
| :--- | :--- | :--- |
| [`apps/api`](apps/api) | REST API, WebDAV, sync endpoints & SSE event bus | Deno, Hono, Drizzle ORM, LibSQL/SQLite, Web Workers |
| [`apps/ui`](apps/ui) | Single Page Application (SPA) | Lit Web Components, @lit-labs/router, Open Props CSS, Vite |
| [`apps/cli`](apps/cli) | Companion CLI sync agent (`romanager-sync`) | Deno, TypeScript, `@repo/shared` |
| [`packages/shared`](packages/shared) | Shared models, types, and Zod schemas | TypeScript, Zod |
| [`packages/ui-components`](packages/ui-components) | Design system & reusable web components | Lit Web Components, Open Props |

---

## Documentation

For comprehensive technical documentation, refer to the guides in the [`docs/`](docs/) directory:

- 📖 **[Feature Specifications](docs/features.md)**: Detailed breakdown of each feature, user flows, and business logic.
- 🏛️ **[System Architecture](docs/architecture.md)**: Deep dive into the monorepo structure, worker concurrency, SSE event bus, and WebDAV mounting.
- 🔄 **[Companion CLI Spec & Architecture](docs/companion-cli.md)**: Sync protocol, ROM sets atomic model, and device manifest resolution.
- 📡 **[API Reference](docs/api-reference.md)**: Complete REST API documentation, endpoints, query parameters, payloads, and SSE stream contracts.
- 🗄️ **[Database Schema](docs/database-schema.md)**: Entity-Relationship diagram, table schemas, relationships, and indexing.
- 🎨 **[UI Components & Design System](docs/ui-components.md)**: Lit component catalog, routing table, and Open Props design tokens.
- 📑 **[Architecture Decision Records (ADRs)](docs/adr/README.md)**: Records of key architectural decisions.
- 🚀 **[Deno to Node.js Migration Plan](docs/migration/deno-to-node-migration-plan.md)**: Detailed technical roadmap for migrating to Node.js LTS, Vite + Oxc, and Node SEA.

---

## Companion CLI (`romanager-sync`)

The Romanager Companion CLI is a standalone binary that runs on the actual emulation device (Batocera PC, Steam Deck, Raspberry Pi 4/5, Anbernic, or any Linux handheld running EmulationStation). It keeps the local storage in sync with a server-defined profile.

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

### 2. Building the CLI Binary

Compile a self-contained, native executable with zero runtime dependencies:

```bash
# Compile for x86_64 Linux (PC Batocera, Steam Deck, x86 mini-PCs)
deno task compile:cli

# Compile for aarch64 Linux (Raspberry Pi 4/5, modern ARM handhelds/SBCs)
deno task compile:cli:arm
```

The compiled binaries will be output to `apps/cli/dist/romanager-sync-x86_64` and `apps/cli/dist/romanager-sync-aarch64`.

Alternatively, run directly on any machine with Deno installed:
```bash
deno run -A apps/cli/src/main.ts <command>
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

- **[Deno](https://deno.land/)** (v1.40+ or compatible)
- **Node.js & npm** (for Drizzle Kit tooling and Playwright runners)
- *(Optional)* **RAWG API Key**: Get a free API key at [rawg.io/apidocs](https://rawg.io/apidocs) for metadata enrichment.

### Configuration

Create a `.env` file in the project root:

```ini
RAWG_API_KEY=your_rawg_api_key_here
DB_URL=file:romanager.db
```

### Running Locally

```bash
# Run both frontend and backend concurrently in watch mode
deno task dev

# Or run services individually:
deno task dev:api    # Start Hono API backend (http://localhost:8000)
deno task dev:ui     # Start Vite dev server for Lit frontend
```

Once started, navigate to `http://localhost:8000` (or the Vite dev port).

---

## Development Tasks

| Command | Description |
| :--- | :--- |
| `deno task dev` | Starts API server and UI dev server concurrently |
| `deno task dev:api` | Runs API server with `--watch` on port 8000 |
| `deno task dev:ui` | Starts frontend Vite dev server |
| `deno task build:ui` | Builds the production bundle of the Lit frontend into `apps/ui/dist` |
| `deno task compile:cli` | Compiles companion CLI into a standalone `x86_64` native binary |
| `deno task compile:cli:arm` | Compiles companion CLI into a standalone `aarch64` native binary |
| `deno task test` | Runs all unit and API test suites |
| `deno task test:api` | Runs API and database test suite against an isolated `test.db` |
| `deno task test:unit` | Runs unit test suite |
| `deno task test:bdd` | Generates and runs Playwright BDD feature tests |
| `deno task db:migrate` | Applies pending Drizzle migrations |
| `deno task db:push` | Pushes Drizzle ORM schema changes directly to the database |
| `deno task db:generate` | Generates Drizzle SQL migration files |

---

## License

MIT License. See [LICENSE](LICENSE) for details.
