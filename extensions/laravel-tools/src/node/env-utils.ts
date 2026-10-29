import * as fs from 'fs/promises';
import { constants as fsConstants, type Dirent } from 'fs';
import * as path from 'path';
import type { LaravelEnvironment, RouteInfo } from '../common/laravel-protocol';

/**
 * A deliberately small dotenv parser. Laravel's own parser has more features,
 * but the values used by the IDE are plain strings and quoted paths.
 */
export function parseEnv(contents: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) {
            continue;
        }
        const exportPrefix = line.match(/^export\s+/i);
        const body = exportPrefix ? line.slice(exportPrefix[0].length) : line;
        const equals = body.indexOf('=');
        if (equals <= 0) {
            continue;
        }
        const key = body.slice(0, equals).trim();
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
            continue;
        }
        let value = body.slice(equals + 1).trim();
        if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
            value = value.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        } else if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
            value = value.slice(1, -1);
        } else {
            value = value.replace(/\s+#.*$/, '').trim();
        }
        result[key] = value;
    }
    return result;
}

export function summarizeEnvironment(env: Record<string, string>): LaravelEnvironment {
    return {
        appName: env.APP_NAME,
        appEnv: env.APP_ENV,
        appDebug: env.APP_DEBUG,
        appUrl: env.APP_URL,
        dbConnection: env.DB_CONNECTION,
        dbDatabase: env.DB_DATABASE,
        dbHost: env.DB_HOST,
        dbPort: env.DB_PORT,
        dbUsername: env.DB_USERNAME,
        hasAppKey: Boolean(env.APP_KEY?.trim())
    };
}

/**
 * Extract a JSON payload from command output that may contain warnings before
 * the actual payload (a common occurrence with Artisan and Composer).
 */
export function extractJson<T>(text: string): T | undefined {
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    let start = -1;
    if (firstBracket >= 0 && (firstBrace < 0 || firstBracket < firstBrace)) {
        start = firstBracket;
    } else if (firstBrace >= 0) {
        start = firstBrace;
    }
    if (start < 0) {
        return undefined;
    }
    const opener = text[start];
    const closer = opener === '{' ? '}' : ']';
    const end = text.lastIndexOf(closer);
    if (end <= start) {
        return undefined;
    }
    try {
        return JSON.parse(text.slice(start, end + 1)) as T;
    } catch {
        return undefined;
    }
}

interface ComposerPackage {
    name?: string;
    version?: string;
}

interface ComposerLock {
    packages?: ComposerPackage[];
    'packages-dev'?: ComposerPackage[];
}

export function findLaravelVersion(lockContents: string): string | undefined {
    try {
        const lock = JSON.parse(lockContents) as ComposerLock;
        const packages = [...(lock.packages ?? []), ...(lock['packages-dev'] ?? [])];
        const framework = packages.find(item => item.name === 'laravel/framework');
        if (framework?.version) {
            return framework.version.replace(/^v/, '').split('-')[0];
        }
        const installer = packages.find(item => item.name === 'laravel/installer');
        return installer?.version?.replace(/^v/, '').split('-')[0];
    } catch {
        const match = /"name"\s*:\s*"laravel\/framework"[\s\S]{0,400}?"version"\s*:\s*"v?([^"-]+)/.exec(lockContents);
        return match?.[1];
    }
}

export function hasPackage(lockContents: string | undefined, packageName: string): boolean {
    if (!lockContents) {
        return false;
    }
    return new RegExp(`"name"\\s*:\\s*"${packageName.replace('/', '\\/')}"`).test(lockContents);
}

interface RawLaravelRoute {
    domain?: string;
    method?: string;
    uri?: string;
    name?: string | null;
    action?: string;
    middleware?: string[] | string;
    [key: string]: unknown;
}

export function normalizeRoute(raw: RawLaravelRoute): RouteInfo {
    const method = String(raw.method ?? 'GET')
        .split('|')
        .map(value => value.trim().toUpperCase())
        .filter(Boolean)
        .join('|');
    const middleware = Array.isArray(raw.middleware)
        ? raw.middleware.map(String)
        : typeof raw.middleware === 'string'
            ? raw.middleware.split(',').map(value => value.trim()).filter(Boolean)
            : [];
    return {
        method: method || 'GET',
        uri: String(raw.uri ?? '/'),
        name: raw.name ?? undefined,
        action: raw.action !== undefined ? String(raw.action) : undefined,
        middleware
    };
}

export function parseRouteListJson(output: string): RouteInfo[] | undefined {
    const payload = extractJson<RawLaravelRoute[]>(output);
    if (!Array.isArray(payload)) {
        return undefined;
    }
    return payload.map(normalizeRoute);
}

interface RawArtisanCommand {
    name?: string;
    description?: string;
    hidden?: boolean;
    [key: string]: unknown;
}

export function parseArtisanListJson(output: string): { name: string; description: string; hidden?: boolean }[] | undefined {
    const payload = extractJson<RawArtisanCommand[] | { commands?: RawArtisanCommand[] }>(output);
    const commands = Array.isArray(payload) ? payload : payload?.commands;
    if (!Array.isArray(commands)) {
        return undefined;
    }
    return commands
        .filter(command => typeof command.name === 'string' && command.name.length > 0)
        .map(command => ({
            name: command.name as string,
            description: command.description ?? '',
            hidden: command.hidden
        }));
}

export function parseArtisanListRaw(output: string): { name: string; description: string }[] {
    const commands: { name: string; description: string }[] = [];
    for (const line of output.split(/\r?\n/)) {
        if (!/^\s{2,}\S/.test(line) || /^Available commands/i.test(line.trim())) {
            continue;
        }
        const match = /^\s{2,}([a-z][a-z0-9:_-]*)\s{2,}(.*)$/i.exec(line);
        if (match && !match[1].includes(':')) {
            commands.push({ name: match[1], description: match[2].trim() });
        } else if (match) {
            commands.push({ name: match[1], description: match[2].trim() });
        }
    }
    return commands;
}

export function commandNamespace(name: string): string {
    const separator = name.indexOf(':');
    return separator > 0 ? name.slice(0, separator) : 'General';
}

export async function readText(filePath: string): Promise<string | undefined> {
    try {
        return await fs.readFile(filePath, 'utf8');
    } catch {
        return undefined;
    }
}

export async function pathExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

export async function canWrite(directory: string): Promise<boolean> {
    try {
        await fs.access(directory, fsConstants.W_OK);
        return true;
    } catch {
        return false;
    }
}

export async function listDirectory(directory: string): Promise<Dirent[]> {
    try {
        return await fs.readdir(directory, { withFileTypes: true });
    } catch {
        return [];
    }
}

export function resolveSqlitePath(root: string, configured?: string): string {
    if (!configured || configured === ':memory:') {
        return configured || path.join(root, 'database', 'database.sqlite');
    }
    if (path.isAbsolute(configured)) {
        return configured;
    }
    return path.join(root, configured);
}
