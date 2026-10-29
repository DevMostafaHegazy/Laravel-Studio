import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plugins = path.join(root, 'plugins');
const required = [
    ['laravel-studio-theme', 'package.json'],
    ['laravel-studio-theme', 'themes/laravel-studio-dark.json'],
    ['laravel-studio-snippets', 'package.json'],
    ['laravel-studio-snippets', 'snippets/laravel.code-snippets'],
    ['laravel-studio-snippets', 'snippets/blade.code-snippets']
];

fs.mkdirSync(plugins, { recursive: true });
for (const [directory, file] of required) {
    const target = path.join(plugins, directory, file);
    if (!fs.existsSync(target)) {
        throw new Error(`Missing local extension asset: ${path.relative(root, target)}`);
    }
}

console.log('Local Laravel Studio extensions are ready.');
