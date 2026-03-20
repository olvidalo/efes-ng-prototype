/**
 * Eleventy build workload — runs in a worker thread, forks a child process.
 *
 * Eleventy uses process.cwd() internally for path resolution (via
 * TemplatePath.getWorkingDir), which breaks on Windows when the project
 * is on a different drive than the code. We fork a child process that
 * can safely chdir without affecting other threads or the main process.
 */
import type { WorkloadModule } from "../core/runtimeHelpers";
import { resolveWorkloadPath, electronSafeEnv } from "../core/runtimeHelpers.ts";
import { fork } from "node:child_process";

export async function performWork(job: {
  sourceDir: string
  outputDir: string
  passthroughCopy?: Record<string, string>
}): Promise<{ outputDir: string }> {
  const runnerScript = resolveWorkloadPath(
    import.meta.url, 'eleventyRunner.mts', 'eleventyRunner.mjs'
  );

  return new Promise((resolve, reject) => {
    const child = fork(runnerScript, [], {
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      env: electronSafeEnv(),
      execPath: process.execPath,
    });

    let stderr = '';
    child.stderr?.on('data', (data) => { stderr += data.toString(); });
    child.stdout?.on('data', (data) => { process.stdout.write(data); });

    child.send(job);

    child.on('message', (msg: any) => {
      if (msg.success) {
        resolve({ outputDir: msg.outputDir });
      } else {
        const error = new Error(msg.error.message);
        error.stack = msg.error.stack;
        reject(error);
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to fork Eleventy process: ${err.message}`));
    });

    child.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Eleventy process exited with code ${code}${stderr ? '\n' + stderr : ''}`));
      }
    });
  });
}

({ performWork }) satisfies WorkloadModule;
