import { Hono } from "hono";
import { normalize, dirname, join } from "node:path";
import { stat, readdir } from "node:fs/promises";
import { getAllowedBrowseRoots, isWithinRoots } from "../path-policy.ts";

export const filesystemRouter = new Hono();

filesystemRouter.get("/browse", async (c) => {
    const shortcuts = await getAllowedBrowseRoots();
    const allowedPaths = shortcuts.map((s) => s.path);
    const defaultRoot = allowedPaths[0] || process.cwd();

    const rawPath = c.req.query("path");
    let targetPath = rawPath ? normalize(rawPath.trim()) : "";

    // Default to primary allowed root if not provided
    if (!targetPath) {
        targetPath = defaultRoot;
    }

    // Verify path exists and is a directory
    try {
        const dirStat = await stat(targetPath);
        if (!dirStat.isDirectory()) {
            targetPath = dirname(targetPath);
        }
    } catch (_err) {
        // Fallback to parent or default root
        try {
            const parent = dirname(targetPath);
            await stat(parent);
            targetPath = parent;
        } catch (_parentErr) {
            targetPath = defaultRoot;
        }
    }

    // Strict boundary enforcement: ensure targetPath is within allowed roots
    if (!isWithinRoots(allowedPaths, targetPath)) {
        targetPath = defaultRoot;
    }

    // Explicit defense-in-depth against sensitive host namespaces
    const SENSITIVE_PATHS = ["/proc", "/sys", "/dev", "/etc", "/root"];
    if (SENSITIVE_PATHS.some((p) => targetPath === p || targetPath.startsWith(p + "/"))) {
        targetPath = defaultRoot;
    }

    const directories: Array<{ name: string; path: string }> = [];

    try {
        const entries = await readdir(targetPath, { withFileTypes: true });
        for (const entry of entries) {
            // Ignore hidden/dot folders like .git, .ssh
            if (entry.name.startsWith(".")) continue;

            const fullPath = normalize(join(targetPath, entry.name));

            if (entry.isDirectory()) {
                directories.push({
                    name: entry.name,
                    path: fullPath,
                });
            } else if (entry.isSymbolicLink()) {
                try {
                    const linkStat = await stat(fullPath);
                    // Ensure symlink target does not escape allowed roots
                    if (linkStat.isDirectory() && isWithinRoots(allowedPaths, fullPath)) {
                        directories.push({
                            name: entry.name,
                            path: fullPath,
                        });
                    }
                } catch {
                    // Broken symlink or permission issue, skip
                }
            }
        }
    } catch (err) {
        console.warn("[Filesystem] Unable to read directory %s:", targetPath, err);
    }

    // Sort case-insensitively and numerically
    directories.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));

    // Calculate parent path (only if parent stays within allowed roots)
    const parentCandidate = normalize(dirname(targetPath));
    const parentPath =
        parentCandidate !== targetPath && isWithinRoots(allowedPaths, parentCandidate)
            ? parentCandidate
            : null;

    return c.json({
        currentPath: targetPath,
        parentPath,
        directories,
        shortcuts,
    });
});
