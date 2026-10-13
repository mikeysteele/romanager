import { parentPort } from "node:worker_threads";
import { lstat, rm } from "node:fs/promises";

export interface DeletionJob {
    type: 'DELETE_ROM' | 'DELETE_GAME';
    id: string; // gameId or romId
    paths: string[];
}

export async function handleDeletionJob(data: DeletionJob, postMsg: (msg: { type: string; id: string }) => void): Promise<void> {
    const { type, id, paths } = data;

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

                const stat = await lstat(normalized);
                if (stat.isDirectory()) {
                    console.warn("[Worker] Refusing to delete directory via file deletion worker:", normalized);
                    continue;
                }

                await rm(normalized);
                console.log("[Worker] Deleted physical file:", normalized);
            } catch (err: unknown) {
                const error = err as { code?: string; name?: string };
                if (error?.code === "ENOENT" || error?.name === "NotFound") {
                    console.warn("[Worker] File not found, skipping:", rawPath);
                } else {
                    console.error("[Worker] Error deleting physical file:", rawPath, err);
                }
            }
        }
    }

    if (type === 'DELETE_ROM') {
        postMsg({ type: 'ROM_DELETED', id });
    } else if (type === 'DELETE_GAME') {
        postMsg({ type: 'GAME_DELETED', id });
    }
}

if (parentPort) {
    parentPort.on("message", (data: DeletionJob) => {
        handleDeletionJob(data, (msg) => parentPort!.postMessage(msg));
    });
} else if (typeof self !== "undefined") {
    (self as unknown as { onmessage: (e: { data: DeletionJob }) => void; postMessage: (msg: unknown) => void }).onmessage = async (e) => {
        handleDeletionJob(e.data, (msg) => (self as unknown as { postMessage: (msg: unknown) => void }).postMessage(msg));
    };
}
