# Feature Specifications

This document provides a comprehensive specification of all features and capabilities within **Romanager**.

---

## Table of Contents
1. [Library & Game Management](#1-library--game-management)
2. [ROM Directory Scanning & Set Ingestion](#2-rom-directory-scanning--set-ingestion)
3. [Unmapped File Triage & Review](#3-unmapped-file-triage--review)
4. [Metadata Resolution & RAWG Integration](#4-metadata-resolution--rawg-integration)
5. [Platform & Multi-File BIOS / Firmware Management](#5-platform--multi-file-bios--firmware-management)
6. [Asynchronous File Deletion & Purging](#6-asynchronous-file-deletion--purging)
7. [WebDAV Network File Sharing](#7-webdav-network-file-sharing)
8. [In-Browser Emulation (Nostalgist / Libretro WASM)](#8-in-browser-emulation-nostalgist--libretro-wasm)
9. [Real-Time Event Synchronization](#9-real-time-event-synchronization)
10. [Companion Device Sync & Cloud Saves](#10-companion-device-sync--cloud-saves)
11. [Database Dialects & Deployment](#11-database-dialects--deployment)

---

## 1. Library & Game Management

### Canonical Game vs. Physical ROM Separation
Romanager decouples the conceptual game (e.g. *"Super Mario World"*) from the physical ROM sets and files on disk (e.g. `Super Mario World (USA).sfc`, or a multi-disc `.m3u` / `.cue`+`.bin` set).
- A single **Game** entry contains canonical metadata (Title, Slug, RAWG ID, Year, Description, Poster / Background Artwork, Metacritic Rating).
- A Game connects to one or more **Platforms** (`game_platforms`).
- Each platform holds one or more **ROM sets** (`roms` table), each linked to one or more physical member files in `rom_files` (with relative paths, roles such as `launch`/`track`/`aux`, file sizes, CRC32, MD5, SHA-1, and `set_hash`).

### Library Overview (`/` -> `<app-library>`)
- **Grid Layout**: Displays games as visual cards with cover art, release year, rating badge, and title.
- **Client-Side Search**: Instant text filtering by title against all loaded games.
- **System Filtering**: Capabilities to filter games by platform slug or view the complete catalog.
- **Dynamic Updates**: Automatically refreshes the catalog when background operations finish via `roms-updated` events.

### Game Detail View (`/game/:gameSlug` -> `<app-game-detail>`)
- **Hero Display**: Full-width backdrop artwork with smooth gradient masking, cover art, release date, and rating.
- **Tabbed ROM Inspection**: Organizes mapped ROM sets into tabs by Platform name.
- **File Metadata**: Detailed breakdown displaying relative path, human-readable file sizes (Bytes, KiB, MiB, GiB), country/region tags, and CRC32 / MD5 / SHA-1 hashes.
- **Per-ROM Actions**: Direct action to launch in the in-browser emulator (`/play/:romId`) or delete individual ROM sets.
- **Game Deletion Modal**: Allows deleting the game record from the catalog with an option to physically delete all underlying ROM files from disk.

---

## 2. ROM Directory Scanning & Set Ingestion

### Set-Aware File Tree Walker (`scanner.ts`, `scanner-sets.ts`, `set-parser.ts`)
- **Safe Traversal**: Employs Node.js `node:fs/promises` recursive traversal to inspect the configured ROMs directory.
- **Multi-File Set Grouping**: Automatically groups companion files into unified sets rather than treating tracks or discs as separate games:
  - **`.m3u` Playlists**: Parses playlist entries and groups referenced discs/cues.
  - **`.cue` / `.gdi` Disc Images**: Parses track directives (`FILE "..."`) with case-insensitive fallback matching to group `.bin`/`.raw`/track files with their descriptor.
  - **Directory Sets & Single Files**: Groups multi-file directories or standalone ROMs and computes deterministic `set_hash` values.
- **Hashing & Metadata**: Computes file sizes, CRC32, MD5, and SHA-1 digests (`hasher.ts`).

### Non-Destructive Ingestion (`scanned_files`)
Rather than automatically altering libraries or renaming files without user consent, Romanager stages newly discovered sets/files into the `scanned_files` table:
1. **Duplicate Check**: Skips paths already registered in `roms` / `rom_files` or already staged in `scanned_files`.
2. **Staging Insertion**: Records discovered sets with generated UUIDs, physical paths, filenames, set metadata, and file sizes inside a database transaction.

### File Type Whitelist & Magic Number Verification
To prevent junk files, documentation, or unsupported media from polluting the library, Romanager enforces an active whitelist during directory traversal:
- **Extension Matching**: Files must match an active extension in the `file_type_whitelist` table (e.g., `sfc`, `nes`, `gba`, `bin`, `iso`, `cue`, `gdi`, `m3u`, `chd`, `rom`, `bios`).
- **Optional Magic Number Verification**: Whitelist rules can specify an optional hex magic number (e.g. `4E45531A` for NES). If required by all matching rules for an extension, the scanner reads header bytes to confirm the binary signature before accepting the file.
- **Configurable Whitelist (`/settings/file-types`)**: Users can add custom extensions, define expected header magic numbers, and enable or disable rules through the UI.

### Multi-Threaded Scanning Worker (`workers/scanner.ts`)
- The scanning process executes on an isolated Node.js worker thread (`node:worker_threads` via `worker-adapter.ts`) so the HTTP server remains non-blocking.
- Emits granular progress messages (`{ type: 'start' | 'progress' | 'done' | 'error' }`) over the SSE `eventBus`.

---

## 3. Unmapped File Triage & Review

### Unmapped Console (`/unmapped` -> `<app-unmapped>`)
Files waiting in the `scanned_files` staging table are presented in a dedicated management console:
- **Interactive Data Table**: Filterable and sortable by filename, full filesystem path, and file size.
- **Search Filter**: Real-time substring filter on filename and path.
- **Triage Actions**:
  - **Review**: Opens the Import modal (`<app-import>`) to map the set/file to a canonical game.
  - **Single Ignore**: Marks the entry with `ignored = true`, hiding it from triage without deleting the physical file.
  - **Bulk Selection & Ignore**: Checkbox selection with an "Ignore Selected" bulk action.

---

## 4. Metadata Resolution & RAWG Integration

### Online Metadata Lookup (`metadata.ts`)
Romanager connects to the [RAWG Video Games Database API](https://rawg.io) using `RAWG_API_KEY`:
- **Search Query (`/api/metadata/search?q=...`)**: Returns matching games with cover art, background images, release year, ratings, and associated platforms.
- **Platform List (`/api/metadata/platforms`)**: Fetches standard gaming systems and metadata from RAWG.

### Automated Heuristics & Match Workflow (`<app-import>`)
When reviewing a file in the import modal:
1. **Title Extraction**: Automatically parses filenames to guess the clean title (stripping file extensions, parentheses, version tags, and bracketed metadata).
2. **Tabbed Search**: Allows searching either the external **RAWG database** or the existing **Local Library** (linking the file as an alternate version or regional ROM of an existing game).
3. **Smart Platform Filtering**: Filters the platform dropdown to platforms the selected game was released on (with an override option).
4. **Auto-Provisioning**: Automatically provisions missing platform records from RAWG when needed.
5. **Region Tagging**: Select regional variants (USA, Europe, Japan, World, or custom).
6. **Transaction Execution**: Upserts Game/Platform/ROM/ROM-file records and removes staged entries from `scanned_files`.

---

## 5. Platform & Multi-File BIOS / Firmware Management

### Platform Administration (`/settings/platforms` -> `<app-settings-platforms>`)
- **System List**: View all configured systems (e.g., Nintendo Entertainment System, PlayStation, Sega Genesis) with system slugs and `esFolder` mappings.
- **Custom System Support**: Add new emulation platforms specifying Name, Slug, and EmulationStation folder/path.

### Multi-File BIOS & Firmware Tracking
Many emulators (e.g., PlayStation, PS2, Dreamcast, Saturn, Sega CD, Neo Geo) require single or multi-file firmware/BIOS dumps:
- **Parent-Child Data Model**: Firmware entries are stored in `system_firmware` (parent metadata, `name`, `total_size`) with individual member files tracked in `system_firmware_files` (`rel_path`, `path`, `filename`, `size`, `sha1`, `md5`, `crc32`).
- **Direct Browser Upload (`POST /api/firmware/upload`)**:
  - Dedicated "Upload Firmware" modal supporting drag-and-drop and multi-file selection.
  - Automatically extracts `.zip` archives (`zip-util.ts` using `node:zlib` with Zip Slip directory traversal protection) into the managed `bios/` directory while preserving relative folder layouts.
  - Supports previewing and removing queued files before submission, and displays collapsible file lists for multi-file firmware sets.
- **Assign from Unmapped**: Users can also map already-scanned files from `scanned_files` as firmware via `POST /api/firmware`.
- **Cascading Removal**: Deleting a firmware entry removes its child file records cleanly.

---

## 6. Asynchronous File Deletion & Purging

### Optimistic Soft Delete
When a user deletes a ROM:
1. The backend immediately flags `pending_delete = true` in the database.
2. The UI hides the ROM from active queries and dispatches an optimistic `roms-updated` SSE event across connected sessions.

### Dedicated Deletion Worker (`workers/deletion.worker.ts`)
- Physical disk removal is delegated to a background Node.js worker thread (`node:worker_threads`).
- Enforces path-policy root containment (`isWithinRoots`) and protected system prefix guards before executing `node:fs/promises` `rm`.
- Skips already-missing files (`ENOENT`) without failing the batch, then notifies the main thread (`ROM_DELETED` / `GAME_DELETED`) to finalize database row removal.

---

## 7. WebDAV Network File Sharing

### Embedded WebDAV Server (`webdav.ts`)
- Mounted onto the Hono application at `/webdav` using `@jsr/smallweb__webdav`.
- Maps incoming WebDAV HTTP requests (`PROPFIND`, `GET`, `PUT`, `DELETE`, etc.) to the physical ROMs root directory configured on the host.

### Integration Use Cases
- **Retro Handhelds & Desktop Frontends**: Mount as a network share from retro handhelds or desktop file managers to browse or stream ROMs directly.

---

## 8. In-Browser Emulation (Nostalgist / Libretro WASM)

### Route `/play/:romId` (`<app-emulator>`)
- **Nostalgist / RetroArch WASM Engine**: Launches ROMs directly in the browser using [`nostalgist`](https://nostalgist.js.org/) backed by Libretro WebAssembly cores.
- **Core Resolution & Selection**: Automatically maps platforms and file extensions (`.nes`, `.sfc`, `.gba`, `.md`, `.cue`, `.chd`, etc.) to default Libretro cores (`fceumm`, `snes9x`, `mgba`, `genesis_plus_gx`, `pcsx_rearmed`, etc.) with support for switching available cores.
- **Multi-File BIOS Loading**: Iterates over all member files in `fw.files` for the system's firmware sets and loads them into RetroArch's virtual filesystem before boot.
- **Player Controls**: Supports save states, SRAM persistence, fullscreen mode, and reset/exit controls.

---

## 9. Real-Time Event Synchronization

### Server-Sent Events (`/api/events`)
Romanager maintains an active SSE stream connecting browser tabs and CLI `watch` daemons to the server's internal `eventBus`:
- **Scanner Progress**: Emits `{ type: 'start' | 'progress' | 'done' | 'error', count, currentFile }` during scanning passes.
- **Library & Manifest Updates**: Triggers `roms-updated` custom DOM events in the UI and notifies connected `romanager-sync watch` daemons when manifests change.

---

## 10. Companion Device Sync & Cloud Saves

### Device Profiles & Manifest Generation (`/settings/devices`, `manifest.ts`)
- **Device Profiles (`devices` & `device_sync_rules`)**: Configure per-device sync profiles with OS/frontend presets (`batocera`, `retropie`, `retroarch`, `es-de`), storage budgets, region preference order (e.g. `USA > EUR > JPN`), `oneRomPerGame` deduplication, system include/exclude rules, and `includeFirmware`.
- **Scoped API Keys (`api_keys`)**: Generate `rmg_...` bearer keys scoped to individual devices for authenticating `/api/sync/*` and `/api/saves/*` requests.
- **Deterministic Manifests (`GET /api/devices/:id/manifest`)**: Generates an authoritative list of ROM and firmware sets (`ManifestSet`) with `setHash`, file IDs, sizes, and SHA-1 checksums.

### Companion CLI (`romanager-sync` in `apps/cli`)
- Compiled into standalone native executables via `scriptc` AOT (`scripts/build-cli.ts`) for Linux (`x86_64`, `aarch64`), macOS (`x86_64`, `aarch64`), and Windows (`x86_64`).
- **Atomic Set Sync (`sync`, `plan`, `adopt`)**: Downloads ROMs and multi-file firmware sets with HTTP `Range` resume support, verifies SHA-1 hashes in staging directories, commits atomically into `roms` / `bios` paths, and tracks state in `state.json`.
- **Live Watch Daemon (`watch`)**: Subscribes to `/api/events` over SSE and automatically syncs when library manifests update.
- **Cloud Saves (`saves` table & `device_saves`)**: Uploads, versions, and restores emulator save files (`.srm`, `.sav`, etc.) between devices and the server.

---

## 11. Database Dialects & Deployment

- **Multi-Dialect Drizzle ORM (`apps/api/src/db/`)**: Supports both embedded **SQLite / LibSQL** (`drizzle/` migrations) and external **PostgreSQL** (`drizzle/pg/` migrations) with automated startup migration execution (`migrate.ts`) and replay verification (`scripts/verify-migrations.ts`).
- **Docker & GHCR Publishing**: Multi-stage `Dockerfile` builds the Vite UI bundle and Rolldown-compiled Node.js API server into a slim non-root container (`node:22-bookworm-slim`), with automated multi-arch (`linux/amd64`, `linux/arm64`) publishing to GHCR on releases.
