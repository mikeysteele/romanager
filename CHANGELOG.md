# Changelog

## [1.1.0](https://github.com/mikeysteele/romanager/compare/romanager-v1.0.0...romanager-v1.1.0) (2026-10-28)


### Features

* add automated startup migrations and PathPolicy filesystem sandboxing ([#21](https://github.com/mikeysteele/romanager/issues/21)) ([76fe235](https://github.com/mikeysteele/romanager/commit/76fe235fb06c7d8875c48c53b76a43c15a2b107b))
* **cli:** implement romanager-sync companion CLI with init, status, plan, sync, adopt, and doctor ([753fd7c](https://github.com/mikeysteele/romanager/commit/753fd7c08e5b217eb00e77d33f651909a215880b))
* **db:** add multi-dialect PostgreSQL and SQLite database support ([#30](https://github.com/mikeysteele/romanager/issues/30)) ([61fb93d](https://github.com/mikeysteele/romanager/commit/61fb93d043bb2c8f8fe9f09735bdb98a13676520))
* **emulator:** integrate Nostalgist WASM Libretro and per-platform config ([#32](https://github.com/mikeysteele/romanager/issues/32)) ([de6cf7f](https://github.com/mikeysteele/romanager/commit/de6cf7f57a78325e6d746a386ea9ab7dd636a77a))
* implement CLI watch daemon and UI device management with enrollment and manifest preview ([45ef2c9](https://github.com/mikeysteele/romanager/commit/45ef2c9cda36f3568e1e4ca99a4aaed5852b4146))
* implement Phase 0a ROM sets data model, scanner grouping, and migrations ([81f6494](https://github.com/mikeysteele/romanager/commit/81f649413937afac4d01e2b0c359497747b44df5))
* implement saves backup, versioning, restore API and CLI commands ([4e5ec72](https://github.com/mikeysteele/romanager/commit/4e5ec7208478adcd922a271c2ee477ecf7c0e281))
* migrate from Deno to node ([#19](https://github.com/mikeysteele/romanager/issues/19)) ([90efec5](https://github.com/mikeysteele/romanager/commit/90efec5116d35e9969363d3061348a38843a4ca0))
* multi-file import grouping, settings overhaul, and folder browser ([fbde416](https://github.com/mikeysteele/romanager/commit/fbde416f17d40692342de052ec5a309023e263eb))
* **sync:** add device, profile, api keys, and manifest schemas ([09906b5](https://github.com/mikeysteele/romanager/commit/09906b5541bd983dcb3405c9d04c0876411ded81))
* **sync:** implement auth, manifest resolution, devices/sync routes, and file streaming ([7bb0711](https://github.com/mikeysteele/romanager/commit/7bb071184b905de52d376950b84ab63eb7138b87))
* **ui:** implement system detail view, interactive search, dynamic sidebar, and test suite hardening ([b04dd96](https://github.com/mikeysteele/romanager/commit/b04dd9646a5e2f06e3a1f5285dd531336e1a7d45))


### Bug Fixes

* **core:** phase 1 production readiness, test stability & security foundation ([bc06911](https://github.com/mikeysteele/romanager/commit/bc06911413a043d0585991113d62a5175dcfc78e))
* **db:** add IF NOT EXISTS and adapt table rebuild in migration 0005 ([91d2dfe](https://github.com/mikeysteele/romanager/commit/91d2dfee1c71f84237172d16b6aba43cf81c7d91))
* **import:** type-safe member properties and add drizzle migration 0006 ([68e0591](https://github.com/mikeysteele/romanager/commit/68e059117477932a26c23d9356c4be26af864de0))
* **security:** resolve CodeQL alerts for modulo bias in auth key and format string in deletion worker ([64c8ef0](https://github.com/mikeysteele/romanager/commit/64c8ef04281abc6c6aa289a1b3d4dbe4f1d0b845))
* **sse:** resolve non-secure context uuid crash, vite proxy pathing, and add live scan status with completion toasts ([75212b8](https://github.com/mikeysteele/romanager/commit/75212b8d9bc40d25c92277545b08114585fee3f4))
* standardize platform terminology, fix platform modal actions, and enable real-time sidebar refresh ([f3c1af8](https://github.com/mikeysteele/romanager/commit/f3c1af898908873b9de9772fe83aaca40ac62eb9))
* **test:** initialize isolated test-bdd.db before webServer start and seed required platform fixture ([9d508a3](https://github.com/mikeysteele/romanager/commit/9d508a336549b4afccc48b2a24562f047ce04e01))
* **ui:** resolve modal scrollbar overflow and form submission in file-types dialog ([b77f205](https://github.com/mikeysteele/romanager/commit/b77f20513d75dbb2e207ed317c01c3a9741ffe66))


### Performance Improvements

* **core:** phase 2 batch scanning pipeline, metadata caching, and api pagination ([f6bb0fd](https://github.com/mikeysteele/romanager/commit/f6bb0fdba9a72b4b851365a72ba758aefcf982cb))
* implement quick-win performance, reliability, and cleanup improvements ([#20](https://github.com/mikeysteele/romanager/issues/20)) ([f817d44](https://github.com/mikeysteele/romanager/commit/f817d44040ebea3d896674a9c2f157a133a63e08))


### Code Refactoring

* **ui:** use lightweight incremental counter for toast ids ([0bd9fb0](https://github.com/mikeysteele/romanager/commit/0bd9fb0071c237e681abf3014318c0c160969cdb))


### Tests

* **bdd:** migrate all e2e test suites to gherkin feature files and step definitions ([525a292](https://github.com/mikeysteele/romanager/commit/525a29210c86629acf456c3f1e7048a821e67774))
* **e2e:** backfill comprehensive E2E test suites for devices, platforms, game details, and settings ([cd401d0](https://github.com/mikeysteele/romanager/commit/cd401d06b73bdd346e4072fcd1500773c4ac0e24))
* upgrade contract tests, unify E2E/BDD runner, and fix all lint errors ([9f7abea](https://github.com/mikeysteele/romanager/commit/9f7abea8f96c3691f94ee4020b5ecbd1a67075a1))


### Build System

* **docker:** compile API with Rolldown and update container build ([#31](https://github.com/mikeysteele/romanager/issues/31)) ([fd28e00](https://github.com/mikeysteele/romanager/commit/fd28e00f2d617512d36cdefe9d660aaaf6aeaabc))


### Continuous Integration

* add commitlint, lefthook git hooks, and release-please automation ([7dab02f](https://github.com/mikeysteele/romanager/commit/7dab02f90fc8d5cabb5a74bb52a074a392a683ae))
* add release pipeline, docker verification, CodeQL security analysis, and Dependabot ([959e4e6](https://github.com/mikeysteele/romanager/commit/959e4e604ec7b8634f36589c6983b9f7732a619b))
* **deps:** bump actions/checkout from 4 to 7 ([#6](https://github.com/mikeysteele/romanager/issues/6)) ([7f8cf63](https://github.com/mikeysteele/romanager/commit/7f8cf6312c329e495099f266232bebd0285651c0))
* **deps:** bump actions/download-artifact from 4 to 8 ([#2](https://github.com/mikeysteele/romanager/issues/2)) ([e58dfbd](https://github.com/mikeysteele/romanager/commit/e58dfbdd58f1cf2aff3fbcaef6ab975d53122763))
* **deps:** bump actions/setup-node from 4 to 7 ([7da38ab](https://github.com/mikeysteele/romanager/commit/7da38abfa9887855836e25d129c541c34f4a2698))
* **deps:** bump actions/setup-node from 4 to 7 ([955c005](https://github.com/mikeysteele/romanager/commit/955c005cae46d4f0d2de211f62d9f48fe929f78f))
* **deps:** bump actions/upload-artifact from 4 to 7 ([#9](https://github.com/mikeysteele/romanager/issues/9)) ([0b96628](https://github.com/mikeysteele/romanager/commit/0b966286d210b522f775a3d0542d400c92922887))
* **deps:** bump docker/build-push-action from 5 to 7 ([#3](https://github.com/mikeysteele/romanager/issues/3)) ([2bcd1ba](https://github.com/mikeysteele/romanager/commit/2bcd1ba8ab2c736ad9e22f250ba84d5a139551f1))
* **deps:** bump docker/login-action from 3 to 4 ([#7](https://github.com/mikeysteele/romanager/issues/7)) ([33457e1](https://github.com/mikeysteele/romanager/commit/33457e195d96cda67d83ecc0aa704afda436bcf0))
* **deps:** bump docker/metadata-action from 5 to 6 ([#5](https://github.com/mikeysteele/romanager/issues/5)) ([5fff6ee](https://github.com/mikeysteele/romanager/commit/5fff6ee44cfe27066132a44de1af31c2715483b8))
* **deps:** bump docker/setup-buildx-action from 3 to 4 ([#8](https://github.com/mikeysteele/romanager/issues/8)) ([c33a4fd](https://github.com/mikeysteele/romanager/commit/c33a4fde2177603f7e5763086125e73d12468dd4))
* **deps:** bump docker/setup-qemu-action from 3 to 4 ([#1](https://github.com/mikeysteele/romanager/issues/1)) ([cd539bb](https://github.com/mikeysteele/romanager/commit/cd539bb16f28ff264c7b3704f9566f3a228a0c05))
* **deps:** bump softprops/action-gh-release from 2 to 3 ([#10](https://github.com/mikeysteele/romanager/issues/10)) ([fa702a2](https://github.com/mikeysteele/romanager/commit/fa702a2067d14424b6c1f584bd49a9759e6cda4e))
* enforce branch status checks ruleset and integrate lint-staged with pre-push test suites ([#12](https://github.com/mikeysteele/romanager/issues/12)) ([1abff23](https://github.com/mikeysteele/romanager/commit/1abff234bca596cbf51ee372061df31e909f833a))
* overhaul CI workflow with parallel test jobs and migration replay verification ([db9f260](https://github.com/mikeysteele/romanager/commit/db9f2607760196fb1d7540e68089d8e15525e7ac))


### Documentation

* add companion CLI documentation and tasks to README ([130f71e](https://github.com/mikeysteele/romanager/commit/130f71ed09917c8b38f2a64dee375d249f0d5c59))
* update companion CLI spec status to implemented v1.0 ([ab04b27](https://github.com/mikeysteele/romanager/commit/ab04b279ec090568ffdbdb9af971211937acd2a1))


### Miscellaneous Chores

* **deps:** bump @commitlint/cli from 19.8.1 to 21.2.4 ([#14](https://github.com/mikeysteele/romanager/issues/14)) ([b629a9b](https://github.com/mikeysteele/romanager/commit/b629a9b99222bbaf2e9f7f0decef1fde59673c3d))
* **deps:** bump @hono/node-server from 1.19.17 to 2.1.5 ([#29](https://github.com/mikeysteele/romanager/issues/29)) ([90d3fc0](https://github.com/mikeysteele/romanager/commit/90d3fc0709774937b081049abed71f15e5c52788))
* **deps:** bump @libsql/client from 0.14.0 to 0.18.0 ([#25](https://github.com/mikeysteele/romanager/issues/25)) ([0f290c9](https://github.com/mikeysteele/romanager/commit/0f290c920968d1b32d1ca66d200df31737bf1911))
* **deps:** bump @playwright/test from 1.64.0 to 1.64.1 ([#27](https://github.com/mikeysteele/romanager/issues/27)) ([18ddfa8](https://github.com/mikeysteele/romanager/commit/18ddfa8cd948cc8aa436c5e0cafd913a1862852b))
* **deps:** bump drizzle-kit from 0.30.6 to 0.31.11 ([#24](https://github.com/mikeysteele/romanager/issues/24)) ([81e80a1](https://github.com/mikeysteele/romanager/commit/81e80a1fed58c359a389a00872b6691d0b1c8bd7))
* **deps:** bump drizzle-orm from 0.38.4 to 0.45.4 ([#26](https://github.com/mikeysteele/romanager/issues/26)) ([f9c8209](https://github.com/mikeysteele/romanager/commit/f9c820941c12689b66bcc5c8b137080a84f9a5a0))
* **deps:** bump lint-staged from 15.5.2 to 17.6.0 ([#13](https://github.com/mikeysteele/romanager/issues/13)) ([25c0a9e](https://github.com/mikeysteele/romanager/commit/25c0a9e8f8ae74dc743e940fd29adb06675f704d))
* **deps:** bump rolldown from 1.2.13 to 1.2.15 ([#28](https://github.com/mikeysteele/romanager/issues/28)) ([522408e](https://github.com/mikeysteele/romanager/commit/522408e4e0900ae7c6d7d5836bd11c2c950df50d))
