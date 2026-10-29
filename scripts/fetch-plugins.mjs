import fs from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let cli;
try {
    cli = require.resolve('@theia/cli/bin/theia.js', { paths: [root, path.join(root, 'electron-app')] });
} catch {
    console.error('Theia CLI is not installed yet. Run npm install first.');
    process.exit(1);
}

const result = spawnSync(process.execPath, [cli, 'download:plugins', '--rate-limit=10', '--parallel=false'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env
});

if (result.error) {
    console.error(result.error);
    process.exit(1);
}
if (result.status !== 0) {
    process.exit(result.status ?? 1);
}

// The Theia downloader does not remove extensions that were downloaded before
// an id was added to the exclusion list. Keep the local plugin folder lean so
// startup stays predictable.
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const excluded = new Set(packageJson.theiaPluginsExcludeIds ?? []);
const pluginsDir = path.join(root, packageJson.theiaPluginsDir ?? 'plugins');
let removed = 0;
for (const id of excluded) {
    const directory = path.join(pluginsDir, id);
    if (fs.existsSync(directory)) {
        fs.rmSync(directory, { recursive: true, force: true });
        removed++;
    }
}
console.log(removed > 0 ? `Pruned ${removed} excluded extension folders.` : 'No stale extension folders to prune.');
