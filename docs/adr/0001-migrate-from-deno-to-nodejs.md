# ADR 0001: Migrate Romanager Stack from Deno to Node.js

- **Status**: Accepted
- **Date**: 2026-10-13
- **Deciders**: Romanager Core Team

---

## Context

On October 9, 2026, Deno Land announced that the entire Deno team joined Cloudflare to work on Cloudflare Workers, `celld`, and Durable Objects ([Deno is joining Cloudflare](https://deno.com/blog/cloudflare)). Under this transition:
- The **Deno runtime** will receive maintenance and security patches for **one year** (through late 2027), after which Deno Land will cease active runtime development.
- Deno Deploy will shut down within six months.
- JSR infrastructure will transition to Cloudflare.

Romanager was originally designed around Deno's native TypeScript runtime, embedded permission model, and standard library. Given the 1-year sunset window for official Deno runtime development, maintaining Romanager on Deno introduces long-term platform risk, dependency friction, and maintenance overhead for a self-hosted application intended to run across Docker, homelabs, NAS systems (TrueNAS, Unraid), and retro gaming handhelds.

## Decision

We will migrate the Romanager workspace from the **Deno runtime** back to **Node.js LTS (v22+)**.

Key architectural choices for this migration:

1. **Workspace & Package Management**:
   - Replace root `deno.json` workspaces with **pnpm workspaces** (`pnpm-workspace.yaml`).
   - Move from `jsr:` and `npm:` specifiers in `deno.json` to standard `package.json` dependency declarations across `apps/*` and `packages/*`.

2. **Backend Server (`apps/api`)**:
   - Retain **Hono** as the HTTP router.
   - Switch entry runtime from `Deno.serve()` to `@hono/node-server`.
   - Replace `@std/fs`, `@std/path`, and `@std/crypto` with native `node:fs/promises`, `node:path`, and `node:crypto`.
   - Port file Range streaming in `apps/api/src/routes/sync.ts` from custom `Deno.open` chunk readers to `node:fs.createReadStream` + `Readable.toWeb()`.
   - Replace `@smallweb/webdav` (Deno-dependent) with a Node-compatible WebDAV implementation (e.g. `webdav-server`).
   - Transition Deno Web Workers (`scanner.ts`, `deletion.worker.ts`) to `node:worker_threads` or in-process asynchronous task queues.

3. **Database Layer**:
   - Retain **Drizzle ORM** with `@libsql/client` (SQLite). This stack is already npm-native and runs seamlessly under Node.js.

4. **Testing Framework**:
   - Migrate unit and API contract test suites (~40 files) from `Deno.test` and `@std/assert` to **Vitest**.
   - Vitest provides first-class TypeScript, native ESM, workspace project support, and JSDOM integration, maintaining the rapid feedback loop previously provided by `deno test`.
   - Playwright BDD tests (`tests/features/`, `tests/steps/`) will run natively via Node Playwright test runner without Deno wrapper scripts.

5. **Containerization & CI/CD**:
   - Update `Dockerfile` to multi-stage builds on `node:22-bookworm-slim` (ensuring native SQLite / LibSQL binary compatibility).
   - Unify `.github/workflows/ci.yml` under `actions/setup-node@v4` with pnpm caching, eliminating the redundant dual runtime setup.

## Consequences

### Positive
- **Long-term Stability**: Removes dependency on a sunsetting runtime; Romanager runs on the industry-standard JavaScript runtime with multi-decade LTS support.
- **Ecosystem Compatibility**: Zero friction installing npm packages without JSR bridging or Deno permission flags.
- **Simplified CI**: CI workflows no longer require managing both Deno and Node runtimes simultaneously.
- **Docker Footprint**: Native Node Alpine/Slim images are mature, well-maintained, and universally supported across container registries and NAS app stores.

### Negative / Challenges
- **API Adjustments**: Several Deno-specific I/O calls (`Deno.stat`, `Deno.readDir`, `Deno.makeTempDir`, `Deno.remove`) must be updated across `apps/api` and `apps/cli`.
- **Test Suite Migration**: Approximately 40 test files require conversion from `Deno.test` and `@std/assert` assertions to Vitest `test`/`expect`.
- **CLI Compilation**: Cross-compilation for standalone handheld binaries can no longer rely on `deno compile` and requires a dedicated pipeline (addressed in [ADR 0002](0002-cli-standalone-binaries-via-node-sea.md)).
