import type { WorkloadModule, WorkerLog } from "../core/runtimeHelpers";
import { electronSafeEnv } from "../core/runtimeHelpers.ts";
import { spawn } from "child_process";
import path from "node:path";
import { createRequire } from "node:module";

export interface CompileJob {
    nodeName: string;
    xsltPath: string;
    outputPath: string;
    stubLibPath?: string;
}

export interface CompileResult {
    outputPath: string;
}

// Resolve xslt3-he script path by finding xslt3.js directly in the package.
// Avoids .bin symlinks which don't exist in packaged Electron apps or on Windows.
function resolveXslt3Script(): string {
    // Use Node's module resolution to find xslt3-he regardless of hoisting
    const require = createRequire(import.meta.url);
    let resolved = path.join(path.dirname(require.resolve('xslt3-he/package.json')), 'xslt3.js');

    // In packaged Electron: rewrite asar paths to unpacked directory
    // Use word boundary to avoid double-rewriting app.asar.unpacked
    resolved = resolved.replace(/app\.asar(?!\.unpacked)/, 'app.asar.unpacked');

    return resolved;
}

export async function performWork(job: CompileJob, log: WorkerLog): Promise<CompileResult> {
    return new Promise<CompileResult>((resolve, reject) => {
        const xslt3Script = resolveXslt3Script();
        // xslt3-he needs forward slashes on Windows (backslashes cause path parsing issues)
        const toXslt3Path = (p: string) => p.replaceAll('\\', '/');
        const args = [
            xslt3Script,
            `-xsl:${toXslt3Path(job.xsltPath)}`,
            `-export:${toXslt3Path(job.outputPath)}`,
        ];

        // Only add stublib if provided
        if (job.stubLibPath) {
            args.push(`-stublib:${toXslt3Path(job.stubLibPath)}`);
        }

        args.push('-nogo');

        const child = spawn(process.execPath, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: electronSafeEnv()
        });

        let stdout = '';
        let stderr = '';

        if (child.stdout) {
            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });
        }

        if (child.stderr) {
            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });
        }

        child.on('close', (code) => {
            if (stderr.trim()) {
                log(stderr.trim());
            }
            if (code === 0) {
                resolve({ outputPath: job.outputPath });
            } else {
                reject(new Error(`XSLT compilation failed with exit code ${code}\nstderr: ${stderr}`));
            }
        });

        child.on('error', (err) => {
            reject(new Error(`Failed to fork xslt3 process: ${err.message}`));
        });
    });
}

({ performWork }) satisfies WorkloadModule;
