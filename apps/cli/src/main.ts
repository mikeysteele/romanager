import { parseArgs } from "node:util";
import process from "node:process";

import { runInit } from "./commands/init.ts";
import { runStatus } from "./commands/status.ts";
import { runSync } from "./commands/sync.ts";
import { runAdopt } from "./commands/adopt.ts";
import { runDoctor } from "./commands/doctor.ts";
import { runWatch } from "./commands/watch.ts";
import { runSaves } from "./commands/saves-cmd.ts";
import { runConfig } from "./commands/config-cmd.ts";
import { runAuthSetKey } from "./commands/auth-cmd.ts";
import { CliError } from "./errors.ts";

const HELP_TEXT = `
Romanager Sync CLI - Keep local ROM collections in sync with Romanager

Usage:
  romanager-sync <command> [options]

Commands:
  init           Enroll device with server URL and API key
  status         Check server connectivity, device status, and pending changes
  plan           Dry-run reconcile: list additions, updates, removals, and conflicts
  sync           Reconcile local ROMs/BIOS with server manifest
  watch          Daemon: sync on startup, then listen for server events and sync
  adopt          Claim existing local sets matching server manifest
  doctor         Run self-diagnostics on config, permissions, disk, and server
  saves          Manage game saves: push, list, restore
  config         Get or set configuration values (config get|set)
  auth set-key   Update device API key

Global Options:
  --config <path>   Path to config.json
  --json            Output results as JSON
  -q, --quiet       Suppress non-essential output
  -v, --verbose     Verbose output
  -h, --help        Show this help message
  --version         Show version
`;

export async function main(args: string[] = process.argv.slice(2)): Promise<void> {
  const parsed = parseArgs({
    args,
    options: {
      config: { type: "string" },
      server: { type: "string" },
      key: { type: "string" },
      preset: { type: "string" },
      system: { type: "string" },
      only: { type: "string" },
      poll: { type: "string" },
      json: { type: "boolean" },
      quiet: { type: "boolean", short: "q" },
      verbose: { type: "boolean", short: "v" },
      "dry-run": { type: "boolean" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean" },
      force: { type: "boolean" },
    },
    allowPositionals: true,
    strict: false,
  });

  const flags: Record<string, any> = {
    ...parsed.values,
    _: parsed.positionals,
  };

  if (flags.version) {
    console.log("romanager-sync 1.0.0");
    return;
  }

  const [command, ...subArgs] = flags._.map(String);

  if (!command || flags.help) {
    console.log(HELP_TEXT);
    return;
  }

  const globalOpts = {
    configPath: flags.config,
    json: flags.json,
    quiet: flags.quiet,
    verbose: flags.verbose,
  };

  try {
    switch (command) {
      case "init":
        await runInit({
          server: flags.server,
          key: flags.key,
          preset: flags.preset,
          configPath: flags.config,
          json: flags.json,
        });
        break;

      case "status":
        await runStatus(globalOpts);
        break;

      case "plan":
        await runSync({
          ...globalOpts,
          dryRun: true,
          system: flags.system,
          only: flags.only as ("roms" | "bios" | "saves" | undefined),
        });
        break;

      case "sync":
        await runSync({
          ...globalOpts,
          dryRun: flags["dry-run"],
          system: flags.system,
          only: flags.only as ("roms" | "bios" | "saves" | undefined),
        });
        break;

      case "watch":
        await runWatch({
          configPath: flags.config,
          poll: flags.poll,
          quiet: flags.quiet,
        });
        break;

      case "adopt":
        await runAdopt({
          ...globalOpts,
          system: flags.system,
          dryRun: flags["dry-run"],
        });
        break;

      case "doctor":
        await runDoctor(globalOpts);
        break;

      case "saves": {
        const action = subArgs[0] as "push" | "list" | "restore";
        if (action !== "push" && action !== "list" && action !== "restore") {
          console.error("Usage: romanager-sync saves push|list|restore [options]");
          process.exit(1);
        }
        await runSaves({
          action,
          targetPath: subArgs[1],
          system: flags.system,
          version: typeof flags.version === "string" ? flags.version : undefined,
          force: flags.force,
          configPath: flags.config,
          json: flags.json,
        });
        break;
      }

      case "config": {
        const action = subArgs[0] as "get" | "set";
        if (action !== "get" && action !== "set") {
          console.error("Usage: romanager-sync config get|set <key> [value]");
          process.exit(1);
        }
        await runConfig(action, subArgs[1], subArgs[2], flags.config);
        break;
      }

      case "auth": {
        const action = subArgs[0];
        if (action === "set-key") {
          if (!subArgs[1]) {
            console.error("Usage: romanager-sync auth set-key <new-key>");
            process.exit(1);
          }
          await runAuthSetKey(subArgs[1], flags.config);
        } else {
          console.error("Unknown auth action. Available: set-key");
          process.exit(1);
        }
        break;
      }

      default:
        console.error(`Unknown command: '${command}'. Run 'romanager-sync --help' for usage.`);
        process.exit(1);
    }
  } catch (err: unknown) {
    if (err instanceof CliError) {
      if (flags.json) {
        console.error(JSON.stringify({ error: err.message, code: err.exitCode }));
      } else {
        console.error(`[Error ${err.exitCode}] ${err.message}`);
      }
      process.exit(err.exitCode);
    }

    const message = err instanceof Error ? err.message : String(err);
    if (flags.json) {
      console.error(JSON.stringify({ error: message, code: 1 }));
    } else {
      console.error(`[Error] ${message}`);
    }
    process.exit(1);
  }
}

if (!process.env.VITEST) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
