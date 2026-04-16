/**
 * Standalone Eleventy build runner — executed as a child process.
 *
 * Eleventy uses process.cwd() internally for path resolution, which breaks
 * on Windows when the project is on a different drive than the code.
 * Running in a forked process lets us safely chdir without affecting
 * the parent process or other worker threads.
 *
 * Receives job parameters via IPC, runs the Eleventy build, reports back.
 */
import path from "node:path";
// @ts-ignore
import { Eleventy } from '@11ty/eleventy';

// Receive job from parent
process.on('message', async (job: {
    sourceDir: string
    outputDir: string
}) => {
    try {
        // Safe to chdir — this is an isolated child process
        process.chdir(job.sourceDir);

        const elev = new Eleventy(job.sourceDir, job.outputDir, {
            config: (eleventyConfig: any) => {
                eleventyConfig.setUseGitIgnore(false);
            }
        });

        await elev.write();
        process.send!({ success: true, outputDir: job.outputDir });
        process.exit(0);
    } catch (error: any) {
        process.send!({
            success: false,
            error: { message: error.message, stack: error.stack }
        });
        process.exit(1);
    }
});
