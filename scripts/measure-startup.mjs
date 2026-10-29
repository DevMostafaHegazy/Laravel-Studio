import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.LARAVEL_STUDIO_STARTUP_PORT ?? 9555);

function executablePath() {
    if (process.platform === 'win32') {
        return path.join(root, 'electron-app', 'dist', 'win-unpacked', 'Laravel Studio.exe');
    }
    if (process.platform === 'darwin') {
        return path.join(root, 'electron-app', 'dist', 'mac-arm64', 'Laravel Studio.app', 'Contents', 'MacOS', 'Laravel Studio');
    }
    return path.join(root, 'electron-app', 'dist', 'linux-unpacked', 'laravel-studio');
}

function workspacePath() {
    return process.env.LARAVEL_STUDIO_STARTUP_WORKSPACE ?? path.join(root, 'test-artifacts', 'fixture-laravel');
}

async function waitForWorkbenchTarget(deadline) {
    while (Date.now() < deadline) {
        try {
            const response = await fetch(`http://127.0.0.1:${port}/json/list`);
            if (response.ok) {
                const targets = await response.json();
                if (targets.some(target => target.type === 'page' && target.url.includes('index.html'))) {
                    return;
                }
            }
        } catch {
            // The app is still starting.
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Timed out waiting for the workbench window.');
}

async function main() {
    const application = executablePath();
    if (!fs.existsSync(application)) {
        throw new Error(`Packaged application not found: ${application}. Run npm run package:win (or the platform equivalent) first.`);
    }
    const started = Date.now();
    const output = [];
    const child = spawn(application, [`--remote-debugging-port=${port}`, workspacePath()], {
        cwd: root,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
    });
    child.stdout.on('data', chunk => output.push(chunk.toString()));
    child.stderr.on('data', chunk => output.push(chunk.toString()));
    let browser;
    try {
        await waitForWorkbenchTarget(started + 60_000);
        const endpoint = Date.now();
        browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
        let page;
        while (!page && Date.now() < started + 60_000) {
            page = browser.contexts()
                .flatMap(context => context.pages())
                .find(candidate => candidate.url().includes('index.html'));
            if (!page) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        if (!page) {
            throw new Error('Timed out waiting for the workbench page.');
        }
        const pageAvailable = Date.now();
        await page.waitForFunction(
            () => !document.querySelector('.theia-preload'),
            undefined,
            { timeout: 60_000 }
        );
        const workbenchReady = Date.now();
        await page.waitForFunction(
            () => Boolean(document.body && document.body.innerText.includes('EXPLORER')),
            undefined,
            { timeout: 60_000 }
        );
        const explorerReady = Date.now();
        await new Promise(resolve => setTimeout(resolve, 600));
        console.log(JSON.stringify({
            endpointMs: endpoint - started,
            pageMs: pageAvailable - started,
            workbenchMs: workbenchReady - started,
            explorerMs: explorerReady - started
        }, null, 2));
        const timings = output.join('')
            .split(/\r?\n/)
            .filter(line => /Stopwatch|Splash|plugin-host|PluginManager|Load contributions|Sync of|Start of|ready/i.test(line));
        if (timings.length > 0) {
            console.log('\nStartup log:');
            console.log(timings.join('\n'));
        }
    } finally {
        await browser?.close().catch(() => undefined);
        if (process.platform === 'win32') {
            spawn('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
        } else {
            child.kill('SIGTERM');
        }
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
