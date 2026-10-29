import * as path from 'path';
import type {
    CommandResult,
    DockerAction,
    DockerContainerInfo,
    DockerStatus
} from '../../common/laravel-protocol';
import { pathExists } from '../env-utils';
import { getTool, runCommand } from '../process-utils';
import { assertProjectRoot, cleanCommandError, isRecord } from './project-support';

/**
 * Docker Compose and Laravel Sail integration. This collaborator only knows
 * how to query and operate containers; project inspection remains separate.
 */
export class LaravelDockerClient {
    async getStatus(root: string): Promise<DockerStatus> {
        const projectRoot = await assertProjectRoot(root);
        const docker = await getTool('docker', 'Docker');
        const composeFile = await this.findComposeFile(projectRoot);
        const hasSail = await pathExists(path.join(projectRoot, 'vendor', 'bin', 'sail'))
            || await pathExists(path.join(projectRoot, 'vendor', 'bin', 'sail.bat'));

        if (!docker.available) {
            return {
                available: false,
                engineRunning: false,
                hasSail,
                containers: [],
                error: 'Docker is not installed or is not available on PATH.'
            };
        }

        let engineRunning = false;
        let engineVersion: string | undefined;
        try {
            const engine = await runCommand('docker', ['info', '--format', '{{.ServerVersion}}'], { timeoutMs: 4_000, maxOutputBytes: 16_000 });
            engineRunning = engine.success && Boolean(engine.stdout.trim());
            engineVersion = engine.success ? engine.stdout.trim() : undefined;
        } catch {
            engineRunning = false;
        }

        let composeVersion: string | undefined;
        const compose = await runCommand('docker', ['compose', 'version', '--short'], { timeoutMs: 5_000, maxOutputBytes: 16_000 });
        if (compose.success) {
            composeVersion = compose.stdout.trim();
        }

        let containers: DockerContainerInfo[] = [];
        let error: string | undefined;
        if (!engineRunning) {
            error = 'Docker is installed, but the engine is not running.';
        } else if (!composeFile) {
            error = 'No compose.yaml or docker-compose.yml found in this project.';
        } else {
            const ps = await runCommand('docker', ['compose', 'ps', '--format', 'json'], { cwd: projectRoot, timeoutMs: 15_000, maxOutputBytes: 512_000 });
            if (ps.success) {
                containers = this.parseDockerPs(ps.stdout);
            } else {
                error = cleanCommandError(ps, 'Unable to list Docker Compose services.');
            }
        }

        return {
            available: true,
            engineRunning,
            engineVersion,
            composeVersion,
            composeFile: composeFile ? path.relative(projectRoot, composeFile) : undefined,
            projectName: path.basename(projectRoot).toLowerCase().replace(/[^a-z0-9_-]/g, ''),
            hasSail,
            containers,
            error
        };
    }

    async runAction(root: string, action: DockerAction, service?: string): Promise<CommandResult> {
        const projectRoot = await assertProjectRoot(root);
        const composeFile = await this.findComposeFile(projectRoot);
        if (!composeFile) {
            throw new Error('This project does not contain a Docker Compose file.');
        }
        const docker = await getTool('docker', 'Docker');
        if (!docker.available) {
            throw new Error('Docker is not available on PATH.');
        }

        const allowed: Record<DockerAction, string[]> = {
            up: ['up', '-d'],
            down: ['down'],
            restart: ['restart'],
            stop: ['stop'],
            start: ['start'],
            build: ['build'],
            logs: ['logs', '--no-color', '--tail=250'],
            ps: ['ps']
        };
        const args = ['compose', ...allowed[action]];
        if (service?.trim() && /^[\w.-]+$/.test(service.trim())) {
            args.push(service.trim());
        }
        return runCommand('docker', args, {
            cwd: projectRoot,
            timeoutMs: action === 'up' || action === 'build' ? 600_000 : 90_000,
            maxOutputBytes: 2 * 1024 * 1024
        });
    }

    private async findComposeFile(root: string): Promise<string | undefined> {
        for (const name of ['compose.yaml', 'compose.yml', 'docker-compose.yml', 'docker-compose.yaml']) {
            const candidate = path.join(root, name);
            if (await pathExists(candidate)) {
                return candidate;
            }
        }
        return undefined;
    }

    private parseDockerPs(output: string): DockerContainerInfo[] {
        const trimmed = output.trim();
        if (!trimmed) {
            return [];
        }
        let entries: Record<string, unknown>[] = [];
        try {
            const parsed = JSON.parse(trimmed) as unknown;
            entries = Array.isArray(parsed) ? parsed as Record<string, unknown>[] : [parsed as Record<string, unknown>];
        } catch {
            entries = trimmed.split(/\r?\n/).flatMap(line => {
                try {
                    const value = JSON.parse(line) as unknown;
                    return isRecord(value) ? [value] : [];
                } catch {
                    return [];
                }
            });
        }
        return entries.map(entry => {
            const ports = entry.Ports ?? entry.ports;
            let portText = '';
            if (Array.isArray(ports)) {
                portText = ports.map(port => {
                    if (!isRecord(port)) {
                        return String(port);
                    }
                    return [port.PublicPort, port.PrivatePort, port.Type].filter(Boolean).join(':');
                }).join(', ');
            } else if (typeof ports === 'string') {
                portText = ports;
            }
            return {
                service: String(entry.Service ?? entry.service ?? ''),
                name: String(entry.Name ?? entry.name ?? ''),
                state: String(entry.State ?? entry.state ?? ''),
                status: String(entry.Status ?? entry.status ?? ''),
                ports: portText
            };
        });
    }
}
