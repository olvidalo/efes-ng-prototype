import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

/**
 * Resolve a workload script path, preferring the production (built) path
 * and falling back to the development (source) path.
 */
export function resolveWorkloadPath(metaUrl: string, devRelative: string, prodRelative: string): string {
    const dir = path.dirname(fileURLToPath(metaUrl));
    const prodPath = path.resolve(dir, prodRelative);
    return existsSync(prodPath) ? prodPath : path.resolve(dir, devRelative);
}
