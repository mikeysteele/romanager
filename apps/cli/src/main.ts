import { parseArgs } from "jsr:@std/cli@^0.217.0/parse_args";
import { runInit } from "./commands/init.ts";
import { runStatus } from "./commands/status.ts";
import { runSync } from "./commands/sync.ts";
import { runAdopt } from "./commands/adopt.ts";
import { runDoctor } from "./commands/doctor.ts";
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
  adopt          Claim existing local sets matching server manifest
  doctor         Run self-diagnostics on config, permissions, disk, and server
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

export async function main(args: string[] = Deno.args): Promise<void> {
  const flags = parseArgs(args, {
    string: ["config", "server", "key", "preset", "system", "only"],
    boolean: ["json", "quiet", "verbose", "dry-run", "help", "version"],
    alias: {
      h: "help",
      q: "quiet",
      v: "verbose",
    },
  });

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
          only: flags.only as any,
        });
        break;

      case "sync":
        await runSync({
          ...globalOpts,
          dryRun: flags["dry-run"],
          system: flags.system,
          only: flags.only as any,
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

      case "config": {
        const action = subArgs[0] as "get" | "set";
        if (action !== "get" && action !== "set") {
          console.error("Usage: romanager-sync config get|set <key> [value]");
          Deno.exit(1);
        }
        await runConfig(action, subArgs[1], subArgs[2], flags.config);
        break;
      }

      case "auth": {
        const action = subArgs[0];
        if (action === "set-key") {
          if (!subArgs[1]) {
            console.error("Usage: romanager-sync auth set-key <new-key>");
            Deno.exit(1);
          }
          await runAuthSetKey(subArgs[1], flags.config);
        } else {
          console.error("Unknown auth action. Available: set-key");
          Deno.exit(1);
        }
        break;
      }

      default:
        console.error(`Unknown command: '${command}'. Run 'romanager-sync --help' for usage.`);
        Deno.exit(1);
    }
  } catch (err: unknown) {
    if (err instanceof CliError) {
      if (flags.json) {
        console.error(JSON.stringify({ error: err.message, code: err.exitCode }));
      } else {
        console.error(`[Error ${err.exitCode}] ${err.message}`);
      }
      Deno.exit(err.exitCode);
    }

    const message = err instanceof Error ? err.message : String(err);
    if (flags.json) {
      console.error(JSON.stringify({ error: message, code: 1 }));
    } else {
      console.error(`[Error] ${message}`);
    }
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
