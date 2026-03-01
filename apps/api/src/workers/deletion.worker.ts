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
        for (const path of paths) {
            try {
                await Deno.remove(path);
                console.log(`[Worker] Deleted physical file: ${path}`);
            } catch (err: unknown) {
                if (err instanceof Deno.errors.NotFound) {
                    console.warn(`[Worker] File not found, skipping: ${path}`);
                } else {
                    console.error(`[Worker] Error deleting physical file ${path}:`, err);
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
