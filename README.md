# Romanager

> A modern, self-hosted web application for organizing, managing, cataloging, and playing retro video game ROMs and firmware.

Romanager brings the streamlined, automated management style of the "*arr" ecosystem (Radarr, Sonarr) to retro gaming collections. It pairs recursive file tree scanning with rich metadata enrichment from [RAWG](https://rawg.io), non-destructive staging, firmware/BIOS management, background deletion workers, and an embedded WebDAV file server to feed retro handhelds and emulator frontends.

---

## Key Features

- 🎮 **Unified Game & Multi-Platform Catalog**: Group multiple regional versions, revisions, and cross-platform ROMs under canonical game entries with rich artwork, release metadata, and ratings.
- 🔍 **Non-Destructive Ingestion & Staging**: Automatic recursive directory scanner detects new files safely into an unmapped staging table (`scanned_files`) without polluting your clean library.
- 🏷️ **Intelligent Unmapped Triage**: Fast, bulk review of scanned files with automatic title guessing, RAWG online database matching, platform filtering, and region tagging (USA, EUR, JPN, WLD).
- 🧩 **Firmware & BIOS Tracker**: Manage system firmware and BIOS files required by emulators; map discovered BIOS dumps directly to emulation platforms.
- ⚡ **Background Processing & Real-Time Sync**: Multi-threaded architecture utilizing Deno Web Workers for CPU/IO-heavy scanning and physical file deletion, with live progress updates streamed via Server-Sent Events (SSE).
- 🌐 **Embedded WebDAV Server**: Mount your ROM collection directly to network-connected retro handhelds (e.g. Miyoo Mini, Anbernic, Steam Deck, PS Vita) or emulator frontends (RetroArch, EmulationStation).
- 🕹️ **In-Browser Emulator Shell**: Built-in player foundation to launch and play ROMs directly in your browser.

---

## Monorepo Architecture

Romanager is built as a TypeScript monorepo powered by **[Deno](https://deno.com)** and modern web standards:

| Workspace | Description | Tech Stack |
| :--- | :--- | :--- |
| [`apps/api`](apps/api) | REST API & WebDAV server | Deno, Hono, Drizzle ORM, LibSQL/SQLite, Web Workers |
| [`apps/ui`](apps/ui) | Single Page Application (SPA) | Lit Web Components, @lit-labs/router, Open Props CSS, Vite |
| [`packages/shared`](packages/shared) | Shared models, types, and schemas | TypeScript, Zod |
| [`packages/ui-components`](packages/ui-components) | Design system & reusable components | Lit Web Components, Open Props |

---

## Documentation

For comprehensive technical documentation, refer to the guides in the [`docs/`](docs/) directory:

- 📖 **[Feature Specifications](docs/features.md)**: Detailed breakdown of each feature, user flows, and business logic.
- 🏛️ **[System Architecture](docs/architecture.md)**: Deep dive into the monorepo structure, worker concurrency, SSE event bus, and WebDAV mounting.
- 📡 **[API Reference](docs/api-reference.md)**: Complete REST API documentation, endpoints, query parameters, payloads, and SSE stream contracts.
- 🗄️ **[Database Schema](docs/database-schema.md)**: Entity-Relationship diagram, table schemas, relationships, and indexing.
- 🎨 **[UI Components & Design System](docs/ui-components.md)**: Lit component catalog, routing table, and Open Props design tokens.
- 🔄 **[Companion CLI (Draft)](docs/companion-cli.md)**: On-device sync agent for Batocera / EmulationStation.

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
| `deno task dev` | Starts API server and UI build watcher concurrently |
| `deno task dev:api` | Runs API server with `--watch` on port 8000 |
| `deno task dev:ui` | Starts frontend Vite dev server |
| `deno task build:ui` | Builds the production bundle of the Lit frontend into `apps/ui/dist` |
| `deno task test:api` | Runs API and database test suite against an isolated `test.db` |
| `deno task test:bdd` | Generates and runs Playwright BDD feature tests |
| `deno task db:push` | Pushes Drizzle ORM schema changes directly to the database |
| `deno task db:generate` | Generates Drizzle SQL migration files |
| `deno task db:migrate` | Applies pending Drizzle migrations |

---

## License

MIT License. See [LICENSE](LICENSE) for details.
