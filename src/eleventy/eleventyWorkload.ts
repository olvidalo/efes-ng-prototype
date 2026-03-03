// @ts-ignore
import { Eleventy } from '@11ty/eleventy'

export async function performWork(job: {
  sourceDir: string
  outputDir: string
  passthroughCopy?: Record<string, string>[]
}): Promise<{ outputDir: string }> {
  const elev = new Eleventy(job.sourceDir, job.outputDir, {
    config: (eleventyConfig: any) => {
      for (const entry of job.passthroughCopy ?? []) {
        eleventyConfig.addPassthroughCopy(entry)
      }
    }
  })
  await elev.write()
  return { outputDir: job.outputDir }
}
