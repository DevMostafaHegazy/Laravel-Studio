import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const electron = require('electron');
const appPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootPath = path.resolve(appPath, '..');
const args = [appPath, ...process.argv.slice(2)];
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function ensureBuild() {
    const extensionEntry = path.join(rootPath, 'extensions', 'laravel-tools', 'lib', 'node', 'index.js');
    const frontendEntry = path.join(appPath, 'lib', 'frontend', 'bundle.js');
    if (fs.existsSync(extensionEntry) && fs.existsSync(frontendEntry)) {
        return;
    }
    console.log('Build output is missing. Running the one-time production build...');
    if (!fs.existsSync(extensionEntry)) {
        const extensionBuild = spawnSync(npm, ['run', 'build:extension'], {
            cwd: rootPath,
            stdio: 'inherit',
            shell: process.platform === 'win32'
        });
        if (extensionBuild.status !== 0) {
            process.exit(extensionBuild.status ?? 1);
        }
    }
    const appBuild = spawnSync(npm, ['run', 'bundle'], {
        cwd: appPath,
        stdio: 'inherit',
        shell: process.platform === 'win32'
    });
    if (appBuild.status !== 0) {
        process.exit(appBuild.status ?? 1);
    }
}

ensureBuild();

/**
 * Start the already-built local Electron application directly.
 *
 * Theia's `theia start` development command bootstraps a full application
 * manager before opening the window. That path can add tens of seconds on
 * Windows; the direct Electron entry point is the same application without the
 * unnecessary launcher overhead.
 */
const child = spawn(electron, args, {
    cwd: appPath,
    stdio: 'inherit',
    env: {
        ...process.env,
        THEIA_PARENT_PID: String(process.pid)
    }
});

child.on('error', error => {
    console.error(`Could not start Laravel Studio: ${error.message}`);
    process.exitCode = 1;
});

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
    } else {
        process.exit(code ?? 0);
    }
});
