# ADR 0004: CLI Standalone Binary Compilation via `scriptc` AOT

- **Status**: Accepted
- **Date**: 2026-11-15
- **Supersedes**: [ADR 0002](0002-cli-standalone-binaries-via-node-sea.md)
- **Deciders**: Romanager Core Team

---

## Context

Under [ADR 0002](0002-cli-standalone-binaries-via-node-sea.md), `apps/cli` (`romanager-sync`) was packaged using **Node.js Single Executable Applications (SEA)** alongside **Rolldown** and **`postject`**. While functional, that approach introduced several operational drawbacks:

- **Complex Multi-Stage Pipeline**: Required bundling to CJS with Rolldown, generating a SEA prep blob (`--experimental-sea-config`), copying the host/target Node.js binary, injecting the blob with `postject` and `NODE_SEA_FUSE`, and stripping/re-signing Mach-O signatures on macOS.
- **Large Binary Footprint**: Every standalone executable embedded the full Node.js + V8 runtime (~70 MB–90 MB), which is heavy for constrained retro gaming handhelds.
- **Runtime Startup Overhead**: Booting V8 and parsing the bundled script adds startup latency on low-power ARM devices.

## Decision

We will replace Node.js SEA (`postject` + `sea-config.json`) with **`scriptc` ahead-of-time (AOT) compilation** to build standalone native binaries for `romanager-sync`.

### Architecture & Pipeline

1. **Single-Step AOT Compilation (`scriptc`)**:
   - Compile directly from the TypeScript entrypoint `apps/cli/src/main.ts` with symbol stripping enabled:
     ```bash
     pnpm exec scriptc build src/main.ts -o dist/<binaryName> --strip
     ```
2. **Unified Build Script (`scripts/build-cli.ts`)**:
   - Invoked via `pnpm run build:cli` (mapped to `tsx ../../scripts/build-cli.ts` in `apps/cli/package.json`).
   - Automatically targets the host OS binary name (`romanager-sync` or `romanager-sync.exe`), sets `0755` permissions on Unix, performs ad-hoc `codesign --sign -` on macOS, and copies to `OUTPUT_NAME` when specified by the CI release matrix.
3. **Target Platforms Matrix**:
   - `romanager-sync-linux-x86_64`
   - `romanager-sync-linux-aarch64`
   - `romanager-sync-darwin-x86_64`
   - `romanager-sync-darwin-aarch64`
   - `romanager-sync-windows-x86_64.exe`

## Consequences

### Positive
- **Simplified Build Pipeline**: Replaces the multi-step Rolldown CJS bundle + SEA blob + `postject` injection workflow with a single `scriptc build` invocation.
- **Smaller Footprint & Faster Startup**: AOT native compilation with `--strip` avoids shipping the full Node.js/V8 runtime, reducing binary size and cold-start latency on handhelds.
- **Reduced Packaging Dependencies**: Removes the need for `postject` and `sea-config.json` maintenance.

### Negative / Trade-offs
- **Compiler Tooling Dependency**: Relies on `scriptc` as a build-time dependency rather than built-in Node.js SEA tooling.
- **Language/API Subset Constraints**: CLI code in `apps/cli` must remain compatible with `scriptc`'s AOT compilation support.
