# ADR 0002: CLI Standalone Binary Distribution via Node.js Single Executable Applications (SEA)

- **Status**: Accepted
- **Date**: 2026-10-13
- **Deciders**: Romanager Core Team

---

## Context

The Romanager companion sync tool (`apps/cli`, binary name `romanager-sync`) is designed to run directly on retro gaming handhelds (e.g., Anbernic RG35XX/RG40XX, TrimUI Smart Pro, Steam Deck, Miyoo devices running Linux/ARM, Batocera, ArkOS, AmberELEC) as well as desktop machines (Linux, macOS, Windows).

These devices:
- Rarely or never have Node.js installed.
- Have read-only or stripped-down root filesystems with minimal packages.
- Require a single, self-contained executable that can be dropped onto an SD card or binary directory (`/usr/local/bin` or ROM partition tools folder).

Previously, Romanager utilized `deno compile` to cross-compile single-file executables for 5 target architectures directly from an Ubuntu runner in GitHub Actions. With the migration to Node.js ([ADR 0001](0001-migrate-from-deno-to-nodejs.md)), we require an official, production-ready mechanism to package `apps/cli` as standalone executables without requiring a host Node.js installation.

## Decision

We will use **Node.js Single Executable Applications (SEA)** in conjunction with **Rolldown** (the Rust-based bundler powered by Oxc) and **postject** to build and distribute standalone binaries for `romanager-sync`.

By using Rolldown for CLI bundling, we share the exact same Rust/Oxc toolchain across both frontend (`apps/ui`) and backend/CLI tooling, completely avoiding the need for `esbuild` as an extraneous dependency.

### Architecture & Pipeline

1. **Pure TypeScript Bundling (`Rolldown`)**:
   - `apps/cli` contains zero native C++ addons (`.node` bindings). It relies purely on `@repo/shared`, `zod`, and Node built-in modules (`node:crypto`, `node:fs`, `node:path`, `node:child_process`).
   - We will bundle the CLI source into a single CommonJS bundle using Rolldown:
     ```bash
     npx rolldown apps/cli/src/main.ts --platform node --format cjs --file dist/cli-bundle.cjs
     ```

2. **Blob Generation (`--experimental-sea-config`)**:
   - Define `apps/cli/sea-config.json`:
     ```json
     {
       "main": "dist/cli-bundle.cjs",
       "output": "dist/sea-prep.blob",
       "disableExperimentalSEAWarning": true
     }
     ```
   - Execute:
     ```bash
     node --experimental-sea-config apps/cli/sea-config.json
     ```

3. **Injection via `postject`**:
   - For each target platform, obtain the official Node.js pre-built binary.
   - Inject the prepared blob using the official `NODE_SEA_FUSE` sentinel:
     ```bash
     npx postject dist/<target-binary> NODE_SEA_BLOB dist/sea-prep.blob \
       --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
       ${MACHO_FLAGS}
     ```

4. **Target Platforms Matrix**:
   - `linux-x86_64`: x86_64 Linux (Desktop, Steam Deck, Homelab servers)
   - `linux-aarch64`: ARM64 Linux (Anbernic, TrimUI, Raspberry Pi, Odroid handhelds)
   - `darwin-x86_64`: Intel macOS
   - `darwin-aarch64`: Apple Silicon macOS
   - `windows-x86_64`: 64-bit Windows (`romanager-sync-windows-x86_64.exe`)

5. **macOS Ad-hoc Code Signing**:
   - On macOS, post-injection invalidates binary signatures. GitHub Actions macOS runners will run:
     ```bash
     codesign --remove-signature dist/romanager-sync-darwin-arm64
     # ... postject execution with --macho-segment-name NODE_SEA ...
     codesign --sign - dist/romanager-sync-darwin-arm64
     ```

6. **Unified Developer Build Script**:
   - Provide a helper script (`scripts/build-cli-sea.ts`) so local builds for the current platform can be executed with a single command: `pnpm run build:cli`.

## Consequences

### Positive
- **Zero Runtime Requirement**: Handhelds and end users can execute `romanager-sync` without installing Node.js, npm, or any external dependencies.
- **Core Platform Standard**: Avoids third-party unmaintained binary packagers; Node SEA is officially maintained by the Node.js project.
- **High Bundle Reliability & Unified Toolchain**: Because `apps/cli` contains zero native binary addons, Rolldown produces a deterministic, 100% reliable single bundle while sharing the Oxc Rust toolchain with the frontend.

### Negative / Challenges
- **Multi-Step Packaging**: Unlike `deno compile`, Node SEA requires bundling, blob generation, binary acquisition, and injection. This is mitigated by encapsulating the workflow in `scripts/build-cli-sea.ts` and GitHub Actions matrix steps.
- **Executable Footprint**: Output binaries are ~70 MB–90 MB (the size of Node + V8 engine), comparable to the previous Deno executables (~60 MB–80 MB).
