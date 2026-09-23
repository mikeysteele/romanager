# Feature Specifications

This document provides a comprehensive reverse-engineered specification of all features and capabilities within **Romanager**.

---

## Table of Contents
1. [Library & Game Management](#1-library--game-management)
2. [ROM Directory Scanning & Ingestion](#2-rom-directory-scanning--ingestion)
3. [Unmapped File Triage & Review](#3-unmapped-file-triage--review)
4. [Metadata Resolution & RAWG Integration](#4-metadata-resolution--rawg-integration)
5. [Platform & BIOS / Firmware Management](#5-platform--bios--firmware-management)
6. [Asynchronous File Deletion & Purging](#6-asynchronous-file-deletion--purging)
7. [WebDAV Network File Sharing](#7-webdav-network-file-sharing)
8. [In-Browser Emulation Shell](#8-in-browser-emulation-shell)
9. [Real-Time Event Synchronization](#9-real-time-event-synchronization)

---

## 1. Library & Game Management

### Canonical Game vs. Physical ROM Separation
Romanager decouples the conceptual game (e.g. *"Super Mario World"*) from the physical ROM files on disk (e.g. `Super Mario World (USA).sfc`, `Super Mario World (Japan).sfc`). 
- A single **Game** entry contains canonical metadata (Title, Slug, RAWG ID, Year, Description, Poster / Background Artwork, Metacritic Rating).
- A Game connects to one or more **Platforms** (e.g., SNES, Game Boy Advance) via a junction table (`game_platforms`).
- Each platform holds one or more **ROMs** (`roms` table), each storing physical file information (filename, path, file size in bytes, region, CRC32, MD5, and delete flags).

### Library Overview (`/` -> `<app-library>`)
- **Grid Layout**: Displays games as visual cards with cover art, release year, rating badge, and title.
- **Client-Side Search**: Instant text filtering by title against all loaded games.
- **System Filtering**: Capabilities to filter games by platform slug or view the complete catalog.
- **Dynamic Updates**: Automatically refreshes the catalog when background operations finish via `roms-updated` events.

### Game Detail View (`/game/:gameSlug` -> `<app-game-detail>`)
- **Hero Display**: Full-width backdrop artwork with smooth gradient masking, cover art, release date, and rating.
- **Tabbed ROM Inspection**: Organizes mapped files into tabs by Platform name.
- **File Metadata**: Detailed table displaying relative path, human-readable file sizes (Bytes, KiB, MiB, GiB), country/region tags, CRC32 hash badges, and MD5 hash badges.
- **Per-ROM Actions**: Direct action to launch in the emulator (`/play/:romId`) or delete individual files.
- **Game Deletion Modal**: Allows deleting the game record from the catalog with an option to physically delete all underlying ROM files from disk.

---

## 2. ROM Directory Scanning & Ingestion

### Asynchronous File Tree Walker (`scanner.ts`)
- **Safe Traversal**: Employs `@std/fs/walk` to recursively inspect the user's ROM directory.
- **Symlink Loop & Broken Link Protection**: Safely catches `Deno.errors.FilesystemLoop` and `Deno.errors.NotFound`, preventing infinite recursion or crashing on dead symlinks.
- **File Metadata Extraction**: Inspects file size using `Deno.stat`.

### Non-Destructive Ingestion (`scanned_files`)
Rather than automatically altering libraries or renaming files without user consent, Romanager stages newly discovered files into a dedicated `scanned_files` table:
1. **Duplicate Check 1**: Checks if `path` is already registered in the `roms` table (already in library).
2. **Duplicate Check 2**: Checks if `path` is already recorded in `scanned_files`.
3. **Staging Insertion**: New files are recorded with a generated UUID, physical path, filename, and file size.
4. **Transaction Safety**: All database insertions occur within a single SQLite transaction.

### File Type Whitelist & Magic Number Verification
To prevent junk files, documentation, or unsupported media from polluting the library, Romanager enforces an active whitelist during directory traversal:
- **Extension Matching**: Files must match an active extension in the `file_type_whitelist` table (e.g., `sfc`, `nes`, `gba`, `bin`, `iso`, `rom`, `bios`). Non-whitelisted extensions (e.g. `.txt`, `.nfo`, `.exe`) are skipped immediately without filesystem staging.
- **Optional Magic Number Verification**: Whitelist rules can specify an optional hex magic number (e.g. `4E45531A` for NES). If a rule requires a magic number, the scanner reads the file header bytes to confirm the binary signature before accepting the file. If all matching rules for an extension require a magic number and the signature fails to match, the file is rejected.
- **Configurable Whitelist (`/settings/file-types`)**: Users can add custom extensions, define expected header magic numbers, and enable or disable rules through the UI.

### Multi-Threaded Scanning Worker (`workers/scanner.ts`)
- The scanning process executes on an isolated background Deno Web Worker so that the main HTTP thread remains completely non-blocking.
- The worker emits granular progress messages (`{ type: 'progress', count, currentFile }`) back to the main thread.
- Upon completion or failure, `{ type: 'done', count }` or `{ type: 'error', message }` events are fired.

---

## 3. Unmapped File Triage & Review

### Unmapped Console (`/unmapped` -> `<app-unmapped>`)
Files waiting in the `scanned_files` staging table are presented in a dedicated management console:
- **Interactive Data Table**: Filterable and sortable by filename, full filesystem path, and file size in megabytes (MB).
- **Search Filter**: Real-time substring filter on filename and path.
- **Triage Actions**:
  - **Review**: Opens the Import modal (`<app-import>`) to map the file to a canonical game.
  - **Single Ignore**: Marks the file with `ignored = true`, hiding it from triage without deleting the physical file.
  - **Bulk Selection & Ignore**: Checkbox selection with an "Ignore Selected" bulk action.

---

## 4. Metadata Resolution & RAWG Integration

### Online Metadata Lookup (`metadata.ts`)
Romanager connects directly to the [RAWG Video Games Database API](https://rawg.io) using `RAWG_API_KEY`:
- **Search Query (`/api/metadata/search?q=...`)**: Returns matching games with cover art, background images, release year, ratings, and associated platforms.
- **Platform List (`/api/metadata/platforms`)**: Fetches all standard gaming systems and metadata from RAWG.

### Automated Heuristics & Match Workflow (`<app-import>`)
When reviewing a file in the import modal:
1. **Title Extraction**: Automatically parses filenames to guess the clean title (stripping file extensions, parentheses, version tags, and bracketed metadata).
2. **Tabbed Search**: Allows searching either the external **RAWG database** or the existing **Local Library** (linking the file as an alternate version or regional ROM of an existing game).
3. **Smart Platform Filtering**: When a game is selected, the platform dropdown automatically filters to only show platforms the selected game was actually released on. Users can toggle "Add a Platform..." to override.
4. **Auto-Provisioning**: If the user selects a platform that does not exist yet in the local database, the backend automatically queries the RAWG platforms API, inserts the platform record, and links it.
5. **Region Tagging**: Select regional variants (USA, Europe, Japan, World, or custom).
6. **Transaction Execution**:
   - Upserts Game and Platform records.
   - Creates Game-Platform relation (`game_platforms`).
   - Inserts the new ROM record.
   - Deletes the file from the `scanned_files` staging table.

---

## 5. Platform & BIOS / Firmware Management

### Platform Administration (`/settings/platforms` -> `<app-settings-platforms>`)
- **System List**: View all configured systems (e.g., Nintendo Entertainment System, PlayStation, Sega Genesis) with system slugs.
- **Custom System Support**: Add new emulation platforms specifying Name, Slug, and core EmulationStation path.

### BIOS & Firmware Tracking
Many emulators (e.g. PlayStation, Saturn, Sega CD, Neo Geo) require specific firmware or BIOS dumps to operate:
- **Firmware Association**: Systems track associated firmware files via the `system_firmware` table.
- **Assign from Unmapped**: Users can assign any unmapped file directly as a system's required BIOS/firmware.
- **Integrity Validation**: Stores CRC32 and MD5 checksums for firmware files to verify authenticity against emulator requirements.
- **Firmware Removal**: Unmaps firmware associations without deleting the underlying physical file.

---

## 6. Asynchronous File Deletion & Purging

### Optimistic Soft Delete
When a user deletes a ROM:
1. The backend immediately flags `pending_delete = true` in the database.
2. The UI instantly hides the ROM from all active queries.
3. An optimistic `roms-updated` event is dispatched across SSE so all connected browser sessions reflect the deletion immediately.

### Dedicated Deletion Worker (`workers/deletion.worker.ts`)
- Physical disk removal is delegated to a background Web Worker (`getDeletionWorker()`).
- The worker executes `Deno.remove(path)` with error resilience (skips files already missing without failing the batch).
- On success, the worker posts a `ROM_DELETED` or `GAME_DELETED` notification back to the main thread.
- The main thread finalizes the deletion by permanently removing the row from the database.

---

## 7. WebDAV Network File Sharing

### Embedded WebDAV Server (`webdav.ts`)
- Built using `@smallweb/webdav` mounted directly onto the Hono application at `/webdav`.
- Maps incoming WebDAV HTTP requests (`PROPFIND`, `GET`, `PUT`, `DELETE`, etc.) to the physical ROMs root directory configured on the host.

### Integration Use Cases
- **Retro Handhelds**: Direct mounting from devices running OnionOS, GarlicOS, ArkOS, AmberELEC, or Android (Miyoo Mini, Anbernic, Retroid Pocket, Steam Deck).
- **Desktop Frontends**: Mount as a network drive in Windows File Explorer, macOS Finder, or Linux Nautilus to directly load ROMs in RetroArch or standalone emulators.

---

## 8. In-Browser Emulation Shell

### Route `/play/:gameId` (`<app-emulator>`)
- **Immersive Container**: Full-screen, dark backdrop with custom header and return link to Library.
- **ROM Binding**: Resolves ROM data by ID and displays file and platform information.
- **Extensible Architecture**: Serves as the integration point for web-based emulation frontends (e.g. EmulatorJS, WebAssembly RetroArch cores).

---

## 9. Real-Time Event Synchronization

### Server-Sent Events (`/api/events`)
Romanager maintains an active SSE stream connecting all clients to the server's internal `eventBus`:
- **Scanner Progress**: Emits `{ count, currentFile }` during scanning passes.
- **Completion Broadcast**: Emits `{ type: 'done', count }` which triggers clients to emit a `roms-updated` custom DOM event, automatically refreshing all game lists and stats across open tabs.
