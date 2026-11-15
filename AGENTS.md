# Romanager Agent Instructions

## Git Branching & PR Workflow

1. **Always cut a fresh branch from `origin/main`** before starting any new feature, fix, or chore:
   ```bash
   git fetch origin
   git checkout -b <type>/<short-description> origin/main
   ```
   - Use standard branch prefixes matching the change type: `feat/`, `fix/`, `ci/`, `docs/`, `refactor/`, `chore/`.
   - **Never** commit directly to `main` or `master`.
   - **Never** continue new feature work on an existing feature branch after its PR has been merged (especially since PRs are squash-merged, which diverges commit history from `origin/main`).
   - Check `git branch --show-current` before editing files; if you are on `main` or a previously merged branch, switch to a new branch from `origin/main` first.

2. **Conventional Commits**:
   - All commit messages must follow Conventional Commits (enforced by `commitlint` via `lefthook`), e.g.:
     - `feat(firmware): add targetSubdir and emulator fields`
     - `fix(cli): strip bios/ prefix when resolving firmware paths`
     - `ci(release): consolidate docker publishing into release-please`

## Verification Before Committing

- Run `pnpm typecheck` (`tsc --noEmit`)
- Run `npx oxlint --type-aware <modified-files>` (fix any newly introduced warnings or errors)
- Run relevant tests with `pnpm test <path>` (full `pnpm test` runs automatically via `lefthook` on `git push`)
