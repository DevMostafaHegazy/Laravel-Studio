import spawn from 'cross-spawn';
import type { ChildProcessWithoutNullStreams, SpawnOptions } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { CommandResult, ToolInfo, XdebugInfo } from '../common/laravel-protocol';

const DEFAULT_TIMEOUT = 30_000;
const MAX_OUTPUT = 4 * 1024 * 1024;

export interface RunCommandOptions {
    cwd?: string;
    timeoutMs?: number;
    env?: NodeJS.ProcessEnv;
    maxOutputBytes?: number;
}

/**
 * Run a process without a shell and collect a bounded amount of output.
 * Arguments are passed as an array, so user-entered artisan input is never
 * interpreted by a shell.
 */
export function runCommand(command: string, args: string[], options: RunCommandOptions = {}): Promise<CommandResult> {
    const started = Date.now();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
    const maxOutput = options.maxOutputBytes ?? MAX_OUTPUT;
    const displayCommand = [command, ...args].map(quoteForDisplay).join(' ');

    return new Promise(resolve => {
        let stdout = '';
        let stderr = '';
        let settled = false;
        let timedOut = false;
        let overflowed = false;
        let child: ChildProcessWithoutNullStreams | undefined;
        let timer: NodeJS.Timeout | undefined;

        const finish = (code: number | null, error?: Error): void => {
            if (settled) {
                return;
            }
            settled = true;
            if (timer) {
                clearTimeout(timer);
            }
            if (overflowed) {
                stderr += '\n[output truncated by Laravel Studio]';
            }
            if (error) {
                stderr = stderr ? `${stderr}\n${error.message}` : error.message;
            }
            resolve({
                command: displayCommand,
                success: code === 0 && !error && !timedOut,
                code,
                stdout,
                stderr: timedOut ? `${stderr}\nProcess timed out after ${timeoutMs}ms.`.trim() : stderr,
                durationMs: Date.now() - started,
                timedOut
            });
        };

        const spawnOptions: SpawnOptions = {
            cwd: options.cwd,
            env: { ...process.env, NO_COLOR: '1', ...options.env },
            windowsHide: true,
            stdio: 'pipe'
        };

        try {
            child = spawn(command, args, spawnOptions) as ChildProcessWithoutNullStreams;
        } catch (error) {
            finish(null, error instanceof Error ? error : new Error(String(error)));
            return;
        }

        timer = setTimeout(() => {
            timedOut = true;
            terminateProcess(child);
        }, timeoutMs);

        const collect = (target: 'stdout' | 'stderr') => (data: Buffer | string): void => {
            const text = data.toString();
            const current = target === 'stdout' ? stdout : stderr;
            if (current.length + text.length > maxOutput) {
                const remaining = Math.max(0, maxOutput - current.length);
                if (target === 'stdout') {
                    stdout += text.slice(0, remaining);
                } else {
                    stderr += text.slice(0, remaining);
                }
                overflowed = true;
                return;
            }
            if (target === 'stdout') {
                stdout += text;
            } else {
                stderr += text;
            }
        };

        child.stdout.on('data', collect('stdout'));
        child.stderr.on('data', collect('stderr'));
        child.on('error', error => finish(null, error));
        child.on('close', code => finish(code));
    });
}

function terminateProcess(child: ChildProcessWithoutNullStreams | undefined): void {
    if (!child || child.killed) {
        return;
    }
    if (process.platform === 'win32' && child.pid) {
        // Kill the complete tree, because npm/composer helpers may create children.
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    } else {
        child.kill('SIGTERM');
        setTimeout(() => {
            if (!child.killed) {
                child.kill('SIGKILL');
            }
        }, 1_500).unref();
    }
}

function quoteForDisplay(value: string): string {
    return /\s/.test(value) ? JSON.stringify(value) : value;
}

interface CachedTool {
    expires: number;
    tool: ResolvedTool;
}

export interface ResolvedTool extends ToolInfo {
    command?: string;
}

const toolCache = new Map<string, CachedTool>();
const TOOL_TTL = 30_000;

function versionPatterns(id: string): RegExp[] {
    switch (id) {
        case 'php':
            return [/PHP\s+(\d+(?:\.\d+)+)/i];
        case 'composer':
            return [/Composer\s+version\s+(\d+(?:\.\d+)+)/i, /version\s+(\d+(?:\.\d+)+)/i];
        case 'git':
            return [/git\s+version\s+(\d+(?:\.\d+)+)/i, /(\d+(?:\.\d+)+)/];
        case 'docker':
            return [/Docker\s+version\s+(\d+(?:\.\d+)+)/i, /version\s+v?(\d+(?:\.\d+)+)/i, /(\d+(?:\.\d+)+)/];
        default:
            return [/(\d+(?:\.\d+)+)/];
    }
}

function commonCandidates(id: string): string[] {
    if (process.platform !== 'win32') {
        return [id];
    }
    const home = process.env.USERPROFILE ?? '';
    switch (id) {
        case 'php':
            return [
                'php',
                path.join('C:', 'xampp', 'php', 'php.exe'),
                path.join(home, '.config', 'herd', 'bin', 'php.exe'),
                path.join(home, 'AppData', 'Local', 'Programs', 'php', 'php.exe')
            ];
        case 'composer':
            return [
                'composer',
                'composer.bat',
                path.join('C:', 'ProgramData', 'ComposerSetup', 'bin', 'composer.bat'),
                path.join(home, '.config', 'composer', 'vendor', 'bin', 'composer.bat')
            ];
        case 'git':
            return ['git', path.join('C:', 'Program Files', 'Git', 'cmd', 'git.exe')];
        case 'docker':
            return ['docker', path.join('C:', 'Program Files', 'Docker', 'Docker', 'resources', 'bin', 'docker.exe')];
        default:
            return [id];
    }
}

/**
 * Find the first working executable for a tool and cache its version.
 */
export async function getTool(id: string, label: string, force = false): Promise<ResolvedTool> {
    const cached = toolCache.get(id);
    if (!force && cached && cached.expires > Date.now()) {
        return cached.tool;
    }

    const candidates = commonCandidates(id);
    for (const candidate of candidates) {
        if (path.isAbsolute(candidate) && !fs.existsSync(candidate)) {
            continue;
        }
        const result = await runCommand(candidate, ['--version'], { timeoutMs: 4_000, maxOutputBytes: 32_000 });
        if (result.success) {
            const output = `${result.stdout}\n${result.stderr}`;
            const version = versionPatterns(id).map(pattern => pattern.exec(output)?.[1]).find(Boolean);
            const resolvedPath = resolveExecutablePath(candidate);
            const tool: ResolvedTool = {
                id,
                label,
                available: true,
                version: version ?? undefined,
                path: resolvedPath,
                command: resolvedPath ?? candidate
            };
            toolCache.set(id, { expires: Date.now() + TOOL_TTL, tool });
            return tool;
        }
    }

    const tool: ResolvedTool = {
        id,
        label,
        available: false,
        error: `${label} was not found. Install it or make it available on your PATH.`
    };
    toolCache.set(id, { expires: Date.now() + TOOL_TTL, tool });
    return tool;
}

function resolveExecutablePath(command: string): string | undefined {
    if (path.isAbsolute(command)) {
        return command;
    }
    const finder = process.platform === 'win32' ? 'where.exe' : 'which';
    const result = spawn.sync(finder, [command], { encoding: 'utf8', windowsHide: true, timeout: 2_000 });
    if (result.status === 0 && typeof result.stdout === 'string') {
        return result.stdout.split(/\r?\n/).map(line => line.trim()).find(Boolean) ?? command;
    }
    return command;
}

export async function getPhpTool(force = false): Promise<ResolvedTool> {
    return getTool('php', 'PHP', force);
}

export async function getRuntimeTools(force = false): Promise<{
    php: ResolvedTool;
    composer: ResolvedTool;
    git: ResolvedTool;
    docker: ResolvedTool;
}> {
    const [php, composer, git, docker] = await Promise.all([
        getTool('php', 'PHP', force),
        getTool('composer', 'Composer', force),
        getTool('git', 'Git', force),
        getTool('docker', 'Docker', force)
    ]);
    return { php, composer, git, docker };
}

let xdebugCache: { expires: number; info: XdebugInfo } | undefined;

export async function getXdebugInfo(force = false): Promise<XdebugInfo> {
    if (!force && xdebugCache && xdebugCache.expires > Date.now()) {
        return xdebugCache.info;
    }

    const php = await getPhpTool(force);
    if (!php.available || !php.command) {
        return { loaded: false };
    }

    const result = await runCommand(php.command, ['--ri', 'xdebug'], { timeoutMs: 4_000, maxOutputBytes: 64_000 });
    const output = `${result.stdout}\n${result.stderr}`;
    const loaded = /xdebug support\s*=>\s*enabled/i.test(output) && !/Extension ['"]?xdebug['"]? not present/i.test(output);
    const values = new Map<string, string>();
    for (const line of output.split(/\r?\n/)) {
        const match = /^\s*([^=]+?)\s*=>\s*(.*)$/.exec(line);
        if (match) {
            values.set(match[1].trim().toLowerCase(), match[2].trim());
        }
    }
    const info: XdebugInfo = {
        loaded,
        version: values.get('version'),
        mode: values.get('mode'),
        clientHost: values.get('client host'),
        clientPort: values.get('client port')
    };
    xdebugCache = { expires: Date.now() + TOOL_TTL, info };
    return info;
}

export function clearToolCache(): void {
    toolCache.clear();
    xdebugCache = undefined;
}
