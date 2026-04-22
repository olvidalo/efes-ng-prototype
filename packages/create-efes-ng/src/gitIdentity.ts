/**
 * Git author identity resolution for the initial commit.
 *
 * Reads `~/.gitconfig` (Windows-safe via `os.homedir()`, which resolves to
 * `C:\Users\<name>` where Git for Windows also stores its global config).
 * Falls back to OS-derived defaults so the scaffold form always has
 * something pre-filled.
 */
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { parse as parseIni } from 'ini';

export interface GitIdentity {
    name: string;
    email: string;
}

/**
 * Resolve a git identity to pre-fill the scaffold form. Always returns
 * non-empty fields — falls back to OS-derived defaults if `~/.gitconfig`
 * has no `[user]` section or is missing.
 */
export async function resolveGitIdentity(): Promise<GitIdentity> {
    const fromConfig = await readGlobalGitIdentity();
    const fallback = osDefaultIdentity();
    return {
        name: fromConfig.name || fallback.name,
        email: fromConfig.email || fallback.email,
    };
}

async function readGlobalGitIdentity(): Promise<{ name?: string; email?: string }> {
    const configPath = path.join(os.homedir(), '.gitconfig');
    let content: string;
    try {
        content = await fs.readFile(configPath, 'utf8');
    } catch {
        return {};
    }
    const parsed = parseIni(content) as { user?: { name?: string; email?: string } };
    return { name: parsed.user?.name, email: parsed.user?.email };
}

function osDefaultIdentity(): GitIdentity {
    const username = os.userInfo().username || 'efes-author';
    const hostname = os.hostname() || 'localhost';
    return { name: username, email: `${username}@${hostname}` };
}
