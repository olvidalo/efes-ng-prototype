import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

export type WorkerLog = (message: string) => void;

/** Contract that workload modules must satisfy. */
export interface WorkloadModule {
    performWork(job: any, log: WorkerLog): Promise<any>;
}

/**
 * Resolve a workload script path, preferring the production (built) path
 * and falling back to the development (source) path.
 *
 * In packaged Electron apps, worker threads cannot load from asar archives.
 * If the resolved path is inside an asar, it's rewritten to the unpacked
 * directory (app.asar.unpacked/) where asarUnpack extracts the files.
 */
export function resolveWorkloadPath(metaUrl: string, devRelative: string, prodRelative: string): string {
    let dir = path.dirname(fileURLToPath(metaUrl));

    // In packaged Electron: rewrite asar paths to unpacked directory
    // Negative lookahead avoids double-rewriting app.asar.unpacked
    dir = dir.replace(/app\.asar(?!\.unpacked)/, 'app.asar.unpacked');

    const prodPath = path.resolve(dir, prodRelative);
    return existsSync(prodPath) ? prodPath : path.resolve(dir, devRelative);
}
