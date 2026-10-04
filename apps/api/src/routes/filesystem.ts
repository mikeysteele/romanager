import { Hono } from "@hono/hono";
import { normalize, dirname, join } from "@std/path";

export const filesystemRouter = new Hono();

filesystemRouter.get("/browse", async (c) => {
    const rawPath = c.req.query("path");
    let targetPath = rawPath ? normalize(rawPath.trim()) : "";

    // Default to CWD or root if not provided
    if (!targetPath) {
        targetPath = Deno.cwd();
    }

    // Verify path exists and is a directory
    try {
        const stat = await Deno.stat(targetPath);
        if (!stat.isDirectory) {
            targetPath = dirname(targetPath);
        }
    } catch (_err) {
        // Fallback to parent or root
        try {
            const parent = dirname(targetPath);
            await Deno.stat(parent);
            targetPath = parent;
        } catch (_parentErr) {
            targetPath = "/";
        }
    }

    const SENSITIVE_PATHS = ["/proc", "/sys", "/dev", "/etc/shadow", "/root/.ssh"];
    if (SENSITIVE_PATHS.some(p => targetPath === p || targetPath.startsWith(p + "/"))) {
        targetPath = Deno.cwd();
    }

    const directories: Array<{ name: string; path: string }> = [];

    try {
        for await (const entry of Deno.readDir(targetPath)) {
            // Ignore hidden/dot folders like .git, .ssh
            if (entry.name.startsWith(".")) continue;

            if (entry.isDirectory) {
                directories.push({
                    name: entry.name,
                    path: normalize(join(targetPath, entry.name)),
                });
            } else if (entry.isSymlink) {
                try {
                    const fullPath = join(targetPath, entry.name);
                    const linkStat = await Deno.stat(fullPath);
                    if (linkStat.isDirectory) {
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
        console.warn(`[Filesystem] Unable to read directory ${targetPath}:`, err);
    }

    // Sort case-insensitively and numerically
    directories.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));

    // Calculate parent path
    const isRoot = targetPath === "/" || targetPath === "\\";
    const parentPath = isRoot ? null : normalize(dirname(targetPath));

    // Gather available shortcuts
    const shortcuts: Array<{ label: string; path: string }> = [];
    shortcuts.push({ label: "Root (/)", path: "/" });

    const homeDir = Deno.env.get("HOME") || Deno.env.get("USERPROFILE");
    if (homeDir) {
        try {
            await Deno.stat(homeDir);
            shortcuts.push({ label: "Home (~)", path: normalize(homeDir) });
        } catch (_homeErr) {
            // Home directory inaccessible
        }
    }

    try {
        await Deno.stat("/mnt");
        shortcuts.push({ label: "/mnt", path: "/mnt" });
    } catch (_mntErr) {
        // /mnt not present
    }

    try {
        await Deno.stat("/media");
        shortcuts.push({ label: "/media", path: "/media" });
    } catch (_mediaErr) {
        // /media not present
    }

    shortcuts.push({ label: "Project", path: normalize(Deno.cwd()) });

    return c.json({
        currentPath: targetPath,
        parentPath,
        directories,
        shortcuts,
    });
});
