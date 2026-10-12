/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />

export interface DeletionJob {
    type: 'DELETE_ROM' | 'DELETE_GAME';
    id: string; // gameId or romId
    paths: string[];
}

self.onmessage = async (e: MessageEvent<DeletionJob>) => {
    const { type, id, paths } = e.data;

    if (paths && paths.length > 0) {
        const PROTECTED_PREFIXES = ["/etc", "/var", "/usr", "/bin", "/sbin", "/boot", "/dev", "/sys", "/proc", "/lib", "/lib64"];

        for (const rawPath of paths) {
            try {
                if (!rawPath || typeof rawPath !== 'string') continue;
                const normalized = rawPath.trim();

                // Guard against root, empty, or protected system paths
                if (normalized === "/" || normalized === "\\" || PROTECTED_PREFIXES.some(prefix => normalized === prefix || normalized.startsWith(prefix + "/"))) {
                    console.error("[Worker] Blocked deletion attempt of protected system path:", normalized);
                    continue;
                }

                const stat = await Deno.lstat(normalized);
                if (stat.isDirectory) {
                    console.warn("[Worker] Refusing to delete directory via file deletion worker:", normalized);
                    continue;
                }

                await Deno.remove(normalized);
                console.log("[Worker] Deleted physical file:", normalized);
            } catch (err: unknown) {
                if (err instanceof Deno.errors.NotFound) {
                    console.warn("[Worker] File not found, skipping:", rawPath);
                } else {
                    console.error("[Worker] Error deleting physical file:", rawPath, err);
                }
            }
        }
    }

    if (type === 'DELETE_ROM') {
        self.postMessage({ type: 'ROM_DELETED', id });
    } else if (type === 'DELETE_GAME') {
        self.postMessage({ type: 'GAME_DELETED', id });
    }
};
