# ADR 0003: Frontend Toolchain Adoption — Vite, Oxc, and TypeScript 7.0 Target

- **Status**: Accepted
- **Date**: 2026-10-13
- **Deciders**: Romanager Core Team

---

## Context

The Romanager frontend consists of:
- `apps/ui`: A Single Page Application (SPA) built using **Lit Web Components**, `@lit-labs/router`, and `@lit/task`.
- `packages/ui-components`: Reusable design system components (data tables, layout elements).

Under the Deno architecture, the frontend relied on `rolldown-vite` with `@deno/vite-plugin` executed through `deno run -A npm:vite`. Linting was handled by `deno lint`.

As part of migrating away from Deno ([ADR 0001](0001-migrate-from-deno-to-nodejs.md)), we require a high-performance, future-proof frontend toolchain. The modern JavaScript/TypeScript ecosystem has undergone major advancements:
1. **Oxc (The JavaScript Oxidation Compiler)**: A high-performance suite of Rust-based tools providing sub-millisecond linting (`oxlint`), AST parsing, and transformations, outperforming traditional JS-based linters by 50–100x.
2. **TypeScript 7.0 (Rust-based Compiler Architecture)**: Microsoft's next-generation TypeScript compiler (Project Ferrara) designed in native code for ultra-fast type checking, native declaration emission (`isolatedDeclarations`), and modern ECMAScript standards.
3. **Vite**: The industry standard for frontend development, HMR, and production bundling.

## Decision

We will standardize the frontend (`apps/ui`) and component library (`packages/ui-components`) on **Vite**, **Oxc**, and a **TypeScript 7.0 target**.

### 1. Bundling and Dev Server (`Vite` & `Rolldown`)
- Standardize on official `vite` powered by `rolldown` (the Rust-based Rollup-compatible bundler built upon Oxc).
- Remove `@deno/vite-plugin`.
- Configure workspace path resolution to `@repo/shared` and `@repo/ui-components` via Vite's `resolve.alias` and TypeScript project references.
- Unify bundling across the monorepo: `rolldown` powers UI bundling via Vite and directly bundles `apps/cli` for Node SEA, eliminating `esbuild` as a redundant dependency.
- Maintain rapid Hot Module Replacement (HMR) for Lit custom elements.

### 2. Linting and Static Analysis (`Oxc` / `oxlint`)
- Adopt **`oxlint`** across the frontend and shared packages to replace `deno lint`.
- Integrate `oxlint` into Git hooks ([lefthook.yml](file:///home/michael/gits/Romanager/lefthook.yml)) and CI ([ci.yml](file:///home/michael/gits/Romanager/.github/workflows/ci.yml)) for near-instant lint feedback on staged files.
- Enable recommended rulesets along with Web Component and Lit-specific checks.

### 3. TypeScript 7.0 Compiler Architecture Target
- Configure `tsconfig.json` across `apps/ui` and `packages/ui-components` targeting TypeScript 7.0 specifications:
  - `target: "ES2024"` / `ESNext`
  - `module: "ESNext"`
  - `moduleResolution: "bundler"`
  - `isolatedDeclarations: true` (ensuring fast, parallel type generation compliant with modern Rust/Oxc/TS 7.0 type emit pipelines)
  - `experimentalDecorators: true` and `useDefineForClassFields: false` (ensuring full compatibility with Lit 3 property decorators)
  - `verbatimModuleSyntax: true` for clean, unambiguous type-only import/export boundaries.

## Consequences

### Positive
- **Extreme Performance**: `oxlint` executes full codebase linting in milliseconds, significantly speeding up pre-commit hooks (`lefthook`) and PR validation in CI.
- **Modern Standards**: Full alignment with modern ECMAScript, Lit 3 web components, and TypeScript 7.0 type declaration requirements.
- **Clean Workspace Resolution**: Native Vite and pnpm workspace resolution replaces ad-hoc file-based Deno import paths.
- **Future-Proof**: Adopting `isolatedDeclarations` prepares the codebase for instant Rust-native `.d.ts` compilation under TypeScript 7.0.

### Negative / Challenges
- **Decorator Settings**: Decorator configuration must remain carefully aligned between TypeScript (`tsconfig.json`), Oxc, and Vite to avoid breaking Lit element reactive property reflection.
