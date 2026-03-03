// @ts-ignore
import { Eleventy } from '@11ty/eleventy'

export async function performWork(job: {
  sourceDir: string
  outputDir: string
  passthroughCopy?: Record<string, string>
}): Promise<{ outputDir: string }> {
  const elev = new Eleventy(job.sourceDir, job.outputDir, {
    config: (eleventyConfig: any) => {
      for (const [from, to] of Object.entries(job.passthroughCopy ?? {})) {
        eleventyConfig.addPassthroughCopy({ [from]: to })
      }
    }
  })
  await elev.write()
  return { outputDir: job.outputDir }
}
