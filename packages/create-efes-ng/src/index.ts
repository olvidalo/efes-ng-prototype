/**
 * Project scaffolding — generates a new EFES-NG collection project
 * from templates and user answers.
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

export { scaffoldQuestions, slugify, STYLESHEET_REPOS } from './questions';
export type { ScaffoldAnswers, ScaffoldQuestion, TextQuestion, ConfirmQuestion, SelectQuestion } from './questions';
import { STYLESHEET_REPOS } from './questions';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getTemplatesDir(): string {
    return path.resolve(__dirname, '../templates');
}

export interface ScaffoldProgress {
    onStatus?: (message: string) => void
}

/**
 * Scaffold a new project from templates.
 */
export async function scaffold(
    outputDir: string,
    answers: { projectName: string; projectSlug: string; initGit?: string; stylesheets?: string; stylesheetRepo?: string },
    progress?: ScaffoldProgress
): Promise<string> {
    const log = progress?.onStatus ?? (() => {});
    const projectDir = path.resolve(outputDir, answers.projectSlug);

    // Check if directory already exists
    try {
        await fs.access(projectDir);
        throw new Error(`Directory already exists: ${projectDir}`);
    } catch (err: any) {
        if (err.code !== 'ENOENT') throw err;
    }

    // Determine stylesheet config for templates
    const stylesheetChoice = answers.stylesheets ?? 'none';
    const stylesheetDir = stylesheetChoice === 'custom'
        ? extractRepoName(answers.stylesheetRepo ?? '')
        : STYLESHEET_REPOS[stylesheetChoice]?.dir ?? '';

    const templateData = {
        projectName: answers.projectName,
        projectSlug: answers.projectSlug,
        hasStylesheets: stylesheetChoice !== 'none',
        stylesheetDir,
    };

    // 1. Generate project from templates
    log('Generating project files...');
    const templatesDir = getTemplatesDir();
    await copyTemplateDir(templatesDir, projectDir, templateData);

    // 2. Detect existing git repo
    const wantGit = answers.initGit !== 'false';
    let inGitRepo = false;
    try {
        await git.findRoot({ fs: fsSync, filepath: outputDir });
        inGitRepo = true;
    } catch { /* not in a git repo */ }

    // 3. Init git if requested and not already in one
    if (wantGit && !inGitRepo) {
        log('Initializing git repository...');
        await git.init({ fs: fsSync, dir: projectDir });
    }

    // 4. Clone stylesheets
    if (stylesheetChoice !== 'none') {
        const repoUrl = stylesheetChoice === 'custom'
            ? answers.stylesheetRepo!
            : STYLESHEET_REPOS[stylesheetChoice].url;

        const targetDir = path.join(projectDir, 'source/stylesheets', stylesheetDir);

        log(`Cloning stylesheets from ${repoUrl}...`);
        await git.clone({
            fs: fsSync,
            http,
            dir: targetDir,
            url: repoUrl,
            depth: 1,
            singleBranch: true,
        });

        // If user doesn't want git, remove .git from cloned stylesheets
        if (!wantGit) {
            await fs.rm(path.join(targetDir, '.git'), { recursive: true, force: true });
        }
    }

    // 5. Initial commit if git was initialized
    if (wantGit && !inGitRepo) {
        log('Creating initial commit...');
        await git.add({ fs: fsSync, dir: projectDir, filepath: '.' });
        await git.commit({
            fs: fsSync,
            dir: projectDir,
            message: 'Initial scaffold from create-efes-ng',
            author: { name: 'EFES-NG', email: 'noreply@efes-ng.dev' },
        });
    }

    return projectDir;
}

/**
 * Extract a directory name from a git repo URL.
 */
function extractRepoName(url: string): string {
    const match = url.match(/\/([^/]+?)(?:\.git)?$/);
    return match ? match[1].toLowerCase() : 'custom';
}

/**
 * Recursively copy and render a template directory.
 */
async function copyTemplateDir(
    srcDir: string,
    destDir: string,
    data: Record<string, any>
): Promise<void> {
    await fs.mkdir(destDir, { recursive: true });

    const entries = await fs.readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destName = entry.name.endsWith('.ejs')
            ? entry.name.slice(0, -4)
            : entry.name;
        const destPath = path.join(destDir, destName);

        if (entry.name === '.gitkeep') continue;

        if (entry.isDirectory()) {
            await copyTemplateDir(srcPath, destPath, data);
        } else if (entry.name.endsWith('.ejs')) {
            const template = await fs.readFile(srcPath, 'utf-8');
            const rendered = ejs.render(template, data, { filename: srcPath });
            await fs.writeFile(destPath, rendered);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}
