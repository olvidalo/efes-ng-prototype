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
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function performWork(job: {
  sourceDir: string
  outputDir: string
}): Promise<{ outputDir: string }> {
  const runnerScript = resolveWorkloadPath(
    import.meta.url, 'eleventyRunner.mts', 'eleventyRunner.mjs'
  );

  // The project's eleventy.config.js uses require() to load @11ty/eleventy, which
  // is installed in the framework's node_modules, not the project's. NODE_PATH makes
  // the framework's packages available to the forked child process.
  const eleventyPkg = fileURLToPath(import.meta.resolve('@11ty/eleventy'));
  const frameworkNodeModules = eleventyPkg.replace(/[/\\]@11ty[/\\]eleventy[/\\].*$/, '');

  return new Promise((resolve, reject) => {
    const env = electronSafeEnv();
    env.NODE_PATH = [frameworkNodeModules, env.NODE_PATH].filter(Boolean).join(path.delimiter);

    const child = fork(runnerScript, [], {
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      env,
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
        reject(new Error(msg.error.message));
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
