import * as fs from 'fs/promises';
import * as path from 'path';
import type { CommandResult } from '../../common/laravel-protocol';

/**
 * Resolve and validate a workspace path before it reaches a filesystem- or
 * process-backed service. Keeping this check in one place prevents command
 * handlers from accidentally operating outside the opened project.
 */
export async function assertProjectRoot(root: string): Promise<string> {
    const resolved = path.resolve(root);
    try {
        const stat = await fs.stat(resolved);
        if (!stat.isDirectory()) {
            throw new Error('The selected workspace is not a directory.');
        }
    } catch {
        throw new Error(`The selected workspace does not exist: ${resolved}`);
    }
    return resolved;
}

/**
 * Return the useful tail of a command failure without ANSI escapes or noisy
 * blank lines. Used at the boundary between child processes and the UI.
 */
export function cleanCommandError(result: CommandResult, fallback: string): string {
    const output = (result.stderr || result.stdout).trim();
    if (!output) {
        return fallback;
    }
    const clean = output
        .replace(/\x1b\[[0-9;]*m/g, '')
        .split(/\r?\n/)
        .filter(Boolean)
        .slice(-12)
        .join('\n');
    return clean.length > 1_800 ? `${clean.slice(0, 1_800)}…` : clean;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}
