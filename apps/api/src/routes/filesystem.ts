import { Hono } from "hono";
import { normalize, dirname, join } from "node:path";
import { stat, readdir } from "node:fs/promises";

export const filesystemRouter = new Hono();

filesystemRouter.get("/browse", async (c) => {
    const rawPath = c.req.query("path");
    let targetPath = rawPath ? normalize(rawPath.trim()) : "";

    // Default to CWD or root if not provided
    if (!targetPath) {
        targetPath = process.cwd();
    }

    // Verify path exists and is a directory
    try {
        const dirStat = await stat(targetPath);
        if (!dirStat.isDirectory()) {
            targetPath = dirname(targetPath);
        }
    } catch (_err) {
        // Fallback to parent or root
        try {
            const parent = dirname(targetPath);
            await stat(parent);
            targetPath = parent;
        } catch (_parentErr) {
            targetPath = "/";
        }
    }

    const SENSITIVE_PATHS = ["/proc", "/sys", "/dev", "/etc/shadow", "/root/.ssh"];
    if (SENSITIVE_PATHS.some(p => targetPath === p || targetPath.startsWith(p + "/"))) {
        targetPath = process.cwd();
    }

    const directories: Array<{ name: string; path: string }> = [];

    try {
        const entries = await readdir(targetPath, { withFileTypes: true });
        for (const entry of entries) {
            // Ignore hidden/dot folders like .git, .ssh
            if (entry.name.startsWith(".")) continue;

            if (entry.isDirectory()) {
                directories.push({
                    name: entry.name,
                    path: normalize(join(targetPath, entry.name)),
                });
            } else if (entry.isSymbolicLink()) {
                try {
                    const fullPath = join(targetPath, entry.name);
                    const linkStat = await stat(fullPath);
                    if (linkStat.isDirectory()) {
                        directories.push({
                            name: entry.name,
                            path: normalize(fullPath),
                        });
                    }
                } catch (_linkErr) {
                    // Broken symlink or permission issue, skip
                }
            }
        }
    } catch (err) {
        console.warn("[Filesystem] Unable to read directory %s:", targetPath, err);
    }

    // Sort case-insensitively and numerically
    directories.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));

    // Calculate parent path
    const isRoot = targetPath === "/" || targetPath === "\\";
    const parentPath = isRoot ? null : normalize(dirname(targetPath));

    // Gather available shortcuts
    const shortcuts: Array<{ label: string; path: string }> = [];
    shortcuts.push({ label: "Root (/)", path: "/" });

    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (homeDir) {
        try {
            await stat(homeDir);
            shortcuts.push({ label: "Home (~)", path: normalize(homeDir) });
        } catch (_homeErr) {
            // Home directory inaccessible
        }
    }

    try {
        await stat("/mnt");
        shortcuts.push({ label: "/mnt", path: "/mnt" });
    } catch (_mntErr) {
        // /mnt not present
    }

    try {
        await stat("/media");
        shortcuts.push({ label: "/media", path: "/media" });
    } catch (_mediaErr) {
        // /media not present
    }

    shortcuts.push({ label: "Project", path: normalize(process.cwd()) });

    return c.json({
        currentPath: targetPath,
        parentPath,
        directories,
        shortcuts,
    });
});
