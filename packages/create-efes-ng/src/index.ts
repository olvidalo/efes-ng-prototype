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

export { getScaffoldQuestions, slugify, STYLESHEET_REPOS } from './questions';
export type { ScaffoldAnswers, ScaffoldQuestion, TextQuestion, ConfirmQuestion, SelectQuestion } from './questions';
import { STYLESHEET_REPOS } from './questions';
import { registerAsSubmodule, commitInitialSnapshot } from './submoduleWorkaround';

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
    answers: {
        projectName: string;
        projectSlug: string;
        initGit?: string;
        gitAuthorName?: string;
        gitAuthorEmail?: string;
        stylesheets?: string;
        stylesheetRepo?: string;
    },
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
        await git.init({ fs: fsSync, dir: projectDir, defaultBranch: 'main' });
    }

    // 4. Clone stylesheets, optionally registering them as a submodule.
    let submodulePath: string | undefined;
    if (stylesheetChoice !== 'none') {
        const repoUrl = stylesheetChoice === 'custom'
            ? answers.stylesheetRepo!
            : STYLESHEET_REPOS[stylesheetChoice].url;

        submodulePath = path.posix.join('source/stylesheets', stylesheetDir);
        const targetDir = path.join(projectDir, ...submodulePath.split('/'));

        log(`Cloning stylesheets from ${repoUrl}...`);
        await git.clone({
            fs: fsSync,
            http,
            dir: targetDir,
            url: repoUrl,
            depth: 1,
            singleBranch: true,
        });

        if (wantGit && !inGitRepo) {
            // We initialized the outer .git ourselves, so we can wire the
            // clone in as a proper submodule. See ./submoduleWorkaround.ts
            // for why this is implemented by hand rather than via
            // `git submodule add`.
            log('Registering stylesheets as a git submodule...');
            await registerAsSubmodule(projectDir, submodulePath, repoUrl);
        } else {
            // No outer-git ownership (either no git at all, or scaffolding
            // inside an existing repo whose .git we should not touch). Vendor
            // the stylesheets by dropping the cloned .git, so they appear as
            // ordinary files in whatever repo (if any) holds the project.
            await fs.rm(path.join(targetDir, '.git'), { recursive: true, force: true });
            submodulePath = undefined;
        }
    }

    // 5. Initial commit (when we own the outer .git).
    if (wantGit && !inGitRepo) {
        if (!answers.gitAuthorName || !answers.gitAuthorEmail) {
            throw new Error('gitAuthorName and gitAuthorEmail are required when initGit is enabled');
        }
        log('Creating initial commit...');
        await commitInitialSnapshot(
            projectDir,
            { name: answers.gitAuthorName, email: answers.gitAuthorEmail },
            submodulePath,
        );
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
        // project.xpr.ejs is renamed to <projectSlug>.xpr so Oxygen's Recent
        // Projects list and window title show a meaningful name.
        const destName = entry.name === 'project.xpr.ejs'
            ? `${data.projectSlug}.xpr`
            : entry.name.endsWith('.ejs')
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
