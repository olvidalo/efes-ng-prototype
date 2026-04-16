/**
 * Eleventy build workload — runs in a worker thread, forks a child process.
 *
 * Call chain: EleventyBuildNode → worker pool → this file (worker thread) → fork() → eleventyRunner (child process)
 *
 * The forked child process allows safe chdir(), which Eleventy needs for
 * path resolution (TemplatePath.getWorkingDir) but would affect other
 * threads if done in the worker.
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
