/**
 * SUBMODULE WORKAROUND
 * ====================
 *
 * isomorphic-git (the JS-only git library this scaffolder uses to avoid a
 * dependency on a native `git` binary) does not support `git submodule add`.
 * This file fills that gap with two functions that, together, produce the
 * same end state as `git submodule add` followed by a first commit.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import git from 'isomorphic-git';
import { stringify as stringifyIni } from 'ini';
import type { GitIdentity } from './gitIdentity';

/**
 * Lay down the on-disk structure that `git submodule add` would have
 * created. Caller must have already cloned the repo into the submodule
 * working directory (so `<projectDir>/<submodulePath>/.git/` exists) and
 * `git init`-ed the outer project (so `<projectDir>/.git/` exists).
 */
export async function registerAsSubmodule(
    projectDir: string,
    submodulePath: string,
    repoUrl: string,
): Promise<void> {
    const segments = submodulePath.split('/');
    const submoduleAbs = path.join(projectDir, ...segments);

    // 1. Move <submodule>/.git into <project>/.git/modules/<submodule>/
    const modulesDest = path.join(projectDir, '.git', 'modules', ...segments);
    await fs.mkdir(path.dirname(modulesDest), { recursive: true });
    await fs.rename(path.join(submoduleAbs, '.git'), modulesDest);

    // 2. Replace the submodule's .git/ with a .git FILE pointing back to it.
    //    Relative path from <submodule>/ to <project>/.git/modules/<submodule>/.
    const upFromSubmodule = '../'.repeat(segments.length);
    await fs.writeFile(
        path.join(submoduleAbs, '.git'),
        `gitdir: ${upFromSubmodule}.git/modules/${submodulePath}\n`,
    );

    // 3. Append [core] worktree to the moved git config so plumbing run
    //    inside the submodule (e.g. `git -C <submodule> status`) finds the
    //    working tree. Relative path from .git/modules/<submodule>/ to
    //    <submodule>/, which is segments.length + 2 levels up (one for .git,
    //    one for modules) plus the submodule path.
    const upFromModules = '../'.repeat(segments.length + 2);
    await appendIniSection(path.join(modulesDest, 'config'), {
        core: { worktree: `${upFromModules}${submodulePath}` },
    });

    // 4. Append [submodule "<path>"] section to the outer project's .git/config.
    await appendIniSection(path.join(projectDir, '.git', 'config'), {
        [`submodule "${submodulePath}"`]: { url: repoUrl, active: true },
    });

    // 5. Write .gitmodules in the project root. This is the file that gets
    //    committed and tells anyone who clones the project where the
    //    submodule lives.
    await fs.writeFile(
        path.join(projectDir, '.gitmodules'),
        stringifyIni({
            [`submodule "${submodulePath}"`]: { path: submodulePath, url: repoUrl },
        }, { whitespace: true }),
    );
}

/**
 * Stage everything and create the initial commit. If `submodulePath` is
 * given, the submodule is staged as a gitlink (mode 160000); otherwise
 * the commit just snapshots the scaffolded files. The author identity is
 * collected up-front by the scaffold form (see ./gitIdentity.ts).
 */
export async function commitInitialSnapshot(
    projectDir: string,
    author: GitIdentity,
    submodulePath?: string,
): Promise<void> {
    // 1. Stage all regular files. statusMatrix honours .gitignore and
    //    excludes the outer .git/; we filter the submodule subtree by
    //    path prefix because we add that path as a gitlink in step 2.
    const submodulePrefix = submodulePath ? submodulePath + '/' : null;
    const matrix = await git.statusMatrix({ fs: fsSync, dir: projectDir });
    const filepaths = matrix
        .filter(([fp, , workdir]) => workdir !== 0 && !(submodulePrefix && fp.startsWith(submodulePrefix)))
        .map(([fp]) => fp);
    if (filepaths.length > 0) {
        await git.add({ fs: fsSync, dir: projectDir, filepath: filepaths });
    }

    // 2. Stage the submodule path as a gitlink (mode 160000) via the
    //    public plumbing API. The OID is the submodule's HEAD commit.
    //    Mode must be passed explicitly — it defaults to 100644 (regular
    //    file), which would store the gitlink as a blob and lose the
    //    submodule semantics entirely.
    if (submodulePath) {
        const submoduleHeadOid = await readSubmoduleHead(projectDir, submodulePath);
        await git.updateIndex({
            fs: fsSync,
            dir: projectDir,
            filepath: submodulePath,
            oid: submoduleHeadOid,
            mode: 0o160000,
            add: true,
        });
    }

    // 3. Commit. git.commit assembles the tree from the index, including
    //    any 160000 entry as a gitlink TreeEntry of type 'commit'.
    await git.commit({
        fs: fsSync,
        dir: projectDir,
        message: 'Initial scaffold from create-efes-ng',
        author,
    });
}

/** Read HEAD commit OID of the submodule via its `.git` file pointer. */
async function readSubmoduleHead(
    projectDir: string,
    submodulePath: string,
): Promise<string> {
    const submoduleAbs = path.join(projectDir, ...submodulePath.split('/'));
    const dotGitContent = await fs.readFile(path.join(submoduleAbs, '.git'), 'utf8');
    const match = dotGitContent.match(/^gitdir:\s*(.+)$/m);
    if (!match) {
        throw new Error(`Submodule ${submodulePath} has invalid .git file`);
    }
    const submoduleGitdir = path.resolve(submoduleAbs, match[1].trim());
    return await git.resolveRef({
        fs: fsSync,
        gitdir: submoduleGitdir,
        ref: 'HEAD',
    });
}

/** Append an INI section to a file, preceded by a blank line. */
async function appendIniSection(
    filePath: string,
    section: Record<string, Record<string, string | boolean>>,
): Promise<void> {
    await fs.appendFile(filePath, '\n' + stringifyIni(section, { whitespace: true }));
}
