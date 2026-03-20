import type { WorkloadModule } from "../core/resolveWorkloadPath";
import path from "node:path";
// @ts-ignore
import { Eleventy } from '@11ty/eleventy'

export async function performWork(job: {
  sourceDir: string
  outputDir: string
  passthroughCopy?: Record<string, string>
}): Promise<{ outputDir: string }> {
  const elev = new Eleventy(job.sourceDir, job.outputDir, {
    config: (eleventyConfig: any) => {
      // Eleventy respects .gitignore by default, but our input is in
      // a build directory that git rightly ignores. Disable so Eleventy
      // processes the files regardless of cwd.
      eleventyConfig.setUseGitIgnore(false)
      for (const [from, to] of Object.entries(job.passthroughCopy ?? {})) {
        // Eleventy resolves passthrough source paths relative to CWD, not
        // the input directory. Resolve them against sourceDir so pipeline
        // authors can use paths relative to the assembly directory.
        const absFrom = path.resolve(job.sourceDir, from)
        eleventyConfig.addPassthroughCopy({ [absFrom]: to })
      }
    }
  })
  await elev.write()
  return { outputDir: job.outputDir }
}

({ performWork }) satisfies WorkloadModule;
