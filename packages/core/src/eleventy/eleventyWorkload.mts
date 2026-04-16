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
        // Eleventy writes detailed template errors to stderr.
        // Extract the numbered problem lines (e.g. "1. Having trouble..." "2. append expect 2 args")
        // which are the actionable part, skipping stack traces and repeated blocks.
        const problems = stderr.match(/^\[11ty\] \d+\. .+$/gm);
        const message = problems
          ? problems.map(l => l.replace('[11ty] ', '')).join('\n')
          : msg.error.message;
        reject(new Error(message));
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
