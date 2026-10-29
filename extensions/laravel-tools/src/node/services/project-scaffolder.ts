import * as fs from 'fs/promises';
import * as path from 'path';
import type { CreateProjectResult, DebugSetupResult } from '../../common/laravel-protocol';
import { pathExists, readText } from '../env-utils';
import { getTool, runCommand } from '../process-utils';
import { assertProjectRoot, isRecord } from './project-support';

/**
 * Creates projects and writes editor configuration. These are the only
 * backend operations allowed to mutate files outside `.env` credentials.
 */
export class LaravelProjectScaffolder {
    async createProject(parentDir: string, name: string): Promise<CreateProjectResult> {
        const parent = path.resolve(parentDir);
        if (!await pathExists(parent)) {
            throw new Error('Choose an existing parent directory for the new project.');
        }
        const trimmedName = name.trim();
        if (!/^[a-z0-9][a-z0-9_-]{0,62}$/i.test(trimmedName)) {
            throw new Error('Project names may only contain letters, numbers, dashes and underscores.');
        }
        const target = path.join(parent, trimmedName);
        if (await pathExists(target)) {
            throw new Error(`The destination already exists: ${target}`);
        }
        const composer = await getTool('composer', 'Composer');
        if (!composer.available || !composer.command) {
            throw new Error('Composer is not available. Install Composer before creating a Laravel project.');
        }

        const result = await runCommand(composer.command, [
            'create-project',
            'laravel/laravel',
            trimmedName,
            '--prefer-dist',
            '--no-interaction'
        ], {
            cwd: parent,
            timeoutMs: 1_200_000,
            maxOutputBytes: 8 * 1024 * 1024
        });
        return { ...result, path: target };
    }

    async ensureDebugConfiguration(root: string): Promise<DebugSetupResult> {
        const projectRoot = await assertProjectRoot(root);
        const directory = path.join(projectRoot, '.vscode');
        const filePath = path.join(directory, 'launch.json');
        await fs.mkdir(directory, { recursive: true });

        const existing = await readText(filePath);
        if (existing) {
            try {
                const parsed = JSON.parse(existing) as { configurations?: unknown[] };
                const configurations = Array.isArray(parsed.configurations) ? parsed.configurations : [];
                if (configurations.some(configuration => isRecord(configuration) && configuration.type === 'php')) {
                    return { created: false, path: filePath, message: 'A PHP debug configuration already exists.' };
                }
                const config = this.phpDebugConfiguration();
                parsed.configurations = [...configurations, config];
                await fs.writeFile(filePath, `${JSON.stringify(parsed, null, 4)}\n`, 'utf8');
                return { created: true, path: filePath, message: 'Added a PHP debug configuration.' };
            } catch {
                return {
                    created: false,
                    path: filePath,
                    message: 'launch.json contains comments or invalid JSON, so it was left untouched.'
                };
            }
        }

        const contents = {
            version: '0.2.0',
            configurations: [this.phpDebugConfiguration()]
        };
        await fs.writeFile(filePath, `${JSON.stringify(contents, null, 4)}\n`, 'utf8');
        return { created: true, path: filePath, message: 'Created a PHP debug configuration.' };
    }

    private phpDebugConfiguration(): Record<string, unknown> {
        return {
            name: 'Listen for Xdebug',
            type: 'php',
            request: 'launch',
            port: 9003,
            hostname: '127.0.0.1',
            pathMappings: {
                '${workspaceFolder}': '${workspaceFolder}'
            },
            xdebugSettings: {
                max_data: -1,
                max_children: -1,
                max_depth: 5
            }
        };
    }
}
