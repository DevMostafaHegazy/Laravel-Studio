/**
 * Split an Artisan command line into arguments without invoking a shell.
 * Supports single and double quotes, plus backslash escapes inside them.
 */
export function tokenizeCommand(input: string): string[] {
    const result: string[] = [];
    let current = '';
    let quote: '"' | "'" | undefined;
    let escaped = false;

    for (const character of input) {
        if (escaped) {
            current += character;
            escaped = false;
            continue;
        }
        if (character === '\\' && quote !== "'") {
            escaped = true;
            continue;
        }
        if (quote) {
            if (character === quote) {
                quote = undefined;
            } else {
                current += character;
            }
            continue;
        }
        if (character === '"' || character === "'") {
            quote = character;
            continue;
        }
        if (/\s/.test(character)) {
            if (current) {
                result.push(current);
                current = '';
            }
            continue;
        }
        current += character;
    }
    if (current) {
        result.push(current);
    }
    return result;
}

export function controllerFile(root: string, action?: string): string | undefined {
    if (!action || action === 'Closure') {
        return undefined;
    }
    const match = /^(?:App\\Http\\Controllers\\)?([A-Za-z0-9_\\]+)@([A-Za-z0-9_]+)/.exec(action);
    if (!match) {
        return undefined;
    }
    const classPath = match[1].replace(/\\/g, '/');
    return `${root.replace(/[\\/]+$/, '')}/app/Http/Controllers/${classPath}.php`;
}

export function openControllerAction(root: string, action?: string): { path: string; line?: number } | undefined {
    const path = controllerFile(root, action);
    if (!path) {
        return undefined;
    }
    return { path };
}

export function compactPath(value: string, max = 46): string {
    if (value.length <= max) {
        return value;
    }
    const head = Math.max(10, Math.floor(max * 0.42));
    const tail = Math.max(8, max - head - 1);
    return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function methodTone(method: string): 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'neutral' {
    const first = method.split('|')[0];
    switch (first) {
        case 'GET':
            return 'blue';
        case 'POST':
            return 'green';
        case 'PUT':
        case 'PATCH':
            return 'amber';
        case 'DELETE':
            return 'red';
        case 'OPTIONS':
        case 'HEAD':
            return 'neutral';
        default:
            return 'purple';
    }
}

export function formatDuration(ms: number): string {
    if (ms < 1_000) {
        return `${ms} ms`;
    }
    return `${(ms / 1_000).toFixed(ms < 10_000 ? 1 : 0)} s`;
}

export function quoteSqlIdentifier(identifier: string, driver?: string): string {
    if (driver === 'mysql') {
        return `\`${identifier.replace(/`/g, '``')}\``;
    }
    return `"${identifier.replace(/"/g, '""')}"`;
}
