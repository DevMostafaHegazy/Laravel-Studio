import { inject, injectable } from '@theia/core/shared/inversify';
import * as os from 'os';
import * as path from 'path';
import type {
    ArtisanCommandInfo,
    CommandResult,
    CreateProjectResult,
    DatabaseOverview,
    DatabaseQueryResult,
    DebugSetupResult,
    DockerAction,
    DockerStatus,
    LaravelProjectService,
    ProjectHealthItem,
    ProjectInfo,
    RouteInfo,
    RuntimeInfo
} from '../common/laravel-protocol';
import {
    canWrite,
    commandNamespace,
    extractJson,
    findLaravelVersion,
    hasPackage,
    parseArtisanListJson,
    parseArtisanListRaw,
    parseEnv,
    parseRouteListJson,
    pathExists,
    readText,
    summarizeEnvironment
} from './env-utils';
import { getPhpTool, getRuntimeTools, getTool, getXdebugInfo, runCommand } from './process-utils';
import { LaravelDatabaseClient } from './services/database-client';
import { LaravelDockerClient } from './services/docker-client';
import { LaravelProjectScaffolder } from './services/project-scaffolder';
import { assertProjectRoot, cleanCommandError, isRecord } from './services/project-support';

interface CacheEntry<T> {
    expires: number;
    value: T;
}

const PROJECT_CACHE_MS = 10_000;
const METADATA_CACHE_MS = 20_000;

@injectable()
export class LaravelProjectServiceImpl implements LaravelProjectService {
    @inject(LaravelDatabaseClient)
    protected database: LaravelDatabaseClient = new LaravelDatabaseClient();

    @inject(LaravelDockerClient)
    protected docker: LaravelDockerClient = new LaravelDockerClient();

    @inject(LaravelProjectScaffolder)
    protected scaffolder: LaravelProjectScaffolder = new LaravelProjectScaffolder();

    private readonly projectCache = new Map<string, CacheEntry<ProjectInfo>>();
    private readonly routeCache = new Map<string, CacheEntry<RouteInfo[]>>();
    private readonly commandCache = new Map<string, CacheEntry<ArtisanCommandInfo[]>>();

    async getRuntimeInfo(): Promise<RuntimeInfo> {
        return this.buildRuntimeInfo();
    }

    private async buildRuntimeInfo(force = false): Promise<RuntimeInfo> {
        const [tools, xdebug] = await Promise.all([getRuntimeTools(force), getXdebugInfo(force)]);
        return {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            shell: process.env.SHELL || process.env.ComSpec || (process.platform === 'win32' ? 'cmd.exe' : '/bin/sh'),
            home: os.homedir(),
            php: tools.php,
            composer: tools.composer,
            git: tools.git,
            docker: tools.docker,
            xdebug
        };
    }

    async inspectProject(root: string, refresh = false): Promise<ProjectInfo> {
        const projectRoot = await assertProjectRoot(root);
        const cached = this.projectCache.get(projectRoot);
        if (!refresh && cached && cached.expires > Date.now()) {
            return cached.value;
        }

        const artisanPath = path.join(projectRoot, 'artisan');
        const composerPath = path.join(projectRoot, 'composer.json');
        const lockPath = path.join(projectRoot, 'composer.lock');
        const envPath = path.join(projectRoot, '.env');
        const vendorPath = path.join(projectRoot, 'vendor', 'autoload.php');
        const storagePath = path.join(projectRoot, 'storage');
        const bootstrapCachePath = path.join(projectRoot, 'bootstrap', 'cache');

        const [tools, xdebug, composerText, lockText, envText, artisanAvailable, vendorInstalled, storageWritable, bootstrapWritable] = await Promise.all([
            this.buildRuntimeInfo(),
            getXdebugInfo(),
            readText(composerPath),
            readText(lockPath),
            readText(envPath),
            pathExists(artisanPath),
            pathExists(vendorPath),
            canWrite(storagePath),
            canWrite(bootstrapCachePath)
        ]);

        let composerJson: Record<string, unknown> = {};
        if (composerText) {
            try {
                composerJson = JSON.parse(composerText) as Record<string, unknown>;
            } catch {
                composerJson = {};
            }
        }

        const require = isRecord(composerJson.require) ? composerJson.require : {};
        const env = envText ? parseEnv(envText) : {};
        const laravelVersion = lockText ? findLaravelVersion(lockText) : undefined;
        const isLaravel = artisanAvailable && Boolean(require['laravel/framework'] || require['laravel/lumen-framework'] || laravelVersion);
        const testRunner = await this.detectTestRunner(projectRoot, lockText);
        const hasSail = await pathExists(path.join(projectRoot, 'vendor', 'bin', 'sail'))
            || await pathExists(path.join(projectRoot, 'vendor', 'bin', 'sail.bat'));
        const databaseConfigured = Boolean(env.DB_CONNECTION && (env.DB_DATABASE || env.DB_CONNECTION === 'sqlite'));

        const [gitBranch, gitDirty, frontendBuilt] = await Promise.all([
            this.gitBranch(projectRoot, tools.git.available),
            this.gitDirty(projectRoot, tools.git.available),
            this.hasFrontendBuild(projectRoot)
        ]);

        const health: ProjectHealthItem[] = [];
        if (!envText) {
            health.push({
                id: 'env',
                label: 'Environment file',
                status: 'error',
                detail: '.env is missing.',
                hint: 'Copy .env.example to .env and generate an application key.'
            });
        } else if (!env.APP_KEY?.trim()) {
            health.push({
                id: 'app-key',
                label: 'Application key',
                status: 'error',
                detail: 'APP_KEY is not set.',
                hint: 'Run php artisan key:generate.'
            });
        } else {
            health.push({
                id: 'app-key',
                label: 'Application key',
                status: 'ok',
                detail: 'Application encryption key is configured.'
            });
        }

        health.push({
            id: 'dependencies',
            label: 'Composer dependencies',
            status: vendorInstalled ? 'ok' : 'error',
            detail: vendorInstalled ? 'Dependencies are installed.' : 'vendor/ is missing.',
            hint: vendorInstalled ? undefined : 'Run composer install.'
        });

        const writable = storageWritable && bootstrapWritable;
        health.push({
            id: 'permissions',
            label: 'Writable directories',
            status: writable ? 'ok' : 'warning',
            detail: writable ? 'storage/ and bootstrap/cache/ are writable.' : 'Laravel may not be able to write cache or logs.',
            hint: writable ? undefined : 'Check permissions on storage/ and bootstrap/cache/.'
        });

        health.push({
            id: 'database',
            label: 'Database',
            status: databaseConfigured ? 'ok' : 'info',
            detail: databaseConfigured
                ? `${env.DB_CONNECTION ?? 'database'}${env.DB_DATABASE ? ` · ${env.DB_DATABASE}` : ''}`
                : 'No database connection is configured.',
            hint: databaseConfigured ? undefined : 'Add DB_* values to .env.'
        });

        if (tools.php.available) {
            health.push({
                id: 'php',
                label: 'PHP runtime',
                status: 'ok',
                detail: `PHP ${tools.php.version ?? 'available'} detected.`
            });
        } else {
            health.push({
                id: 'php',
                label: 'PHP runtime',
                status: 'error',
                detail: 'PHP is not available on PATH.',
                hint: 'Install PHP 8.2+ and make the php executable available on PATH.'
            });
        }

        health.push({
            id: 'xdebug',
            label: 'Xdebug',
            status: xdebug.loaded ? 'ok' : 'info',
            detail: xdebug.loaded
                ? `Loaded${xdebug.version ? ` · ${xdebug.version}` : ''}${xdebug.mode ? ` · ${xdebug.mode}` : ''}`
                : 'Not detected. Debugging can be configured later.',
            hint: xdebug.loaded ? undefined : 'Install Xdebug and set XDEBUG_MODE=debug to step through PHP.'
        });

        if (!frontendBuilt) {
            health.push({
                id: 'frontend',
                label: 'Frontend assets',
                status: 'info',
                detail: 'No production asset manifest found.',
                hint: 'Run npm run build when you are ready to serve compiled assets.'
            });
        }

        const name = env.APP_NAME?.replace(/^["']|["']$/g, '').trim()
            || (typeof composerJson.name === 'string' ? composerJson.name.split('/').pop() : undefined)
            || path.basename(projectRoot);

        const info: ProjectInfo = {
            root: projectRoot,
            name,
            description: typeof composerJson.description === 'string' ? composerJson.description : undefined,
            isLaravel,
            laravelVersion,
            phpVersion: tools.php.version,
            environment: summarizeEnvironment(env),
            health,
            testRunner,
            hasSail,
            artisanAvailable,
            databaseConfigured,
            gitBranch,
            gitDirty,
            tools
        };

        this.projectCache.set(projectRoot, { expires: Date.now() + PROJECT_CACHE_MS, value: info });
        return info;
    }

    async getRoutes(root: string, refresh = false): Promise<RouteInfo[]> {
        const projectRoot = await assertProjectRoot(root);
        const cached = this.routeCache.get(projectRoot);
        if (!refresh && cached && cached.expires > Date.now()) {
            return cached.value;
        }

        const result = await this.runPhpArtisan(projectRoot, ['route:list', '--json'], 60_000);
        if (!result.success) {
            throw new Error(cleanCommandError(result, 'Unable to read Laravel routes.'));
        }
        const routes = parseRouteListJson(result.stdout);
        if (!routes) {
            throw new Error('Laravel returned an unexpected route list. Update Laravel or run php artisan route:list manually.');
        }
        this.routeCache.set(projectRoot, { expires: Date.now() + METADATA_CACHE_MS, value: routes });
        return routes;
    }

    async getArtisanCommands(root: string, refresh = false): Promise<ArtisanCommandInfo[]> {
        const projectRoot = await assertProjectRoot(root);
        const cached = this.commandCache.get(projectRoot);
        if (!refresh && cached && cached.expires > Date.now()) {
            return cached.value;
        }

        let commands: { name: string; description: string; hidden?: boolean }[] | undefined;
        const jsonResult = await this.runPhpArtisan(projectRoot, ['list', '--format=json'], 60_000);
        if (jsonResult.success) {
            commands = parseArtisanListJson(jsonResult.stdout);
        }
        if (!commands) {
            const rawResult = await this.runPhpArtisan(projectRoot, ['list', '--raw'], 60_000);
            if (!rawResult.success) {
                throw new Error(cleanCommandError(rawResult, 'Unable to read Artisan commands.'));
            }
            commands = parseArtisanListRaw(rawResult.stdout);
        }

        const result = commands
            .filter(command => !command.hidden)
            .map(command => ({
                name: command.name,
                description: command.description,
                namespace: commandNamespace(command.name),
                hidden: command.hidden
            }))
            .sort((left, right) => left.name.localeCompare(right.name));
        this.commandCache.set(projectRoot, { expires: Date.now() + METADATA_CACHE_MS, value: result });
        return result;
    }

    async runArtisan(root: string, args: string[]): Promise<CommandResult> {
        const projectRoot = await assertProjectRoot(root);
        const safeArgs = args.map(String).filter(arg => arg.length > 0);
        if (safeArgs.length === 0) {
            throw new Error('Choose an Artisan command first.');
        }
        if (!safeArgs.includes('--no-interaction') && !safeArgs.includes('-n')) {
            // Symfony global options must precede the command; appending this
            // would forward it to test/PHPUnit and other wrapped commands.
            safeArgs.unshift('--no-interaction');
        }
        return this.runPhpArtisan(projectRoot, safeArgs, 300_000);
    }

    async runTests(root: string, filter?: string): Promise<CommandResult> {
        const projectRoot = await assertProjectRoot(root);
        // `artisan test` delegates unknown options to PHPUnit, so do not add
        // the Artisan --no-interaction flag here. PHPUnit is non-interactive.
        const args = ['test'];
        if (filter?.trim()) {
            args.push(`--filter=${filter.trim()}`);
        }
        return this.runPhpArtisan(projectRoot, args, 600_000);
    }

    async runComposer(root: string, args: string[]): Promise<CommandResult> {
        const projectRoot = await assertProjectRoot(root);
        const allowed = new Set(['install', 'update', 'dump-autoload', 'require', 'remove', 'run-script', 'validate', 'outdated']);
        const command = args[0];
        if (!command || !allowed.has(command)) {
            throw new Error(`Composer command "${command ?? ''}" is not supported from Laravel Studio.`);
        }
        const composer = await getTool('composer', 'Composer');
        if (!composer.available || !composer.command) {
            throw new Error('Composer is not available. Install Composer or add it to PATH.');
        }
        const finalArgs = [command, ...args.slice(1)];
        if (command !== 'validate' && command !== 'outdated' && !finalArgs.includes('--no-interaction') && !finalArgs.includes('-n')) {
            finalArgs.push('--no-interaction');
        }
        return runCommand(composer.command, finalArgs, { cwd: projectRoot, timeoutMs: 900_000, maxOutputBytes: 8 * 1024 * 1024 });
    }

    async getDatabaseOverview(root: string): Promise<DatabaseOverview> {
        return this.database.getOverview(root);
    }

    async runDatabaseQuery(root: string, sql: string): Promise<DatabaseQueryResult> {
        return this.database.runQuery(root, sql);
    }

    async getDockerStatus(root: string): Promise<DockerStatus> {
        return this.docker.getStatus(root);
    }

    async runDocker(root: string, action: DockerAction, service?: string): Promise<CommandResult> {
        return this.docker.runAction(root, action, service);
    }

    async createProject(parentDir: string, name: string): Promise<CreateProjectResult> {
        return this.scaffolder.createProject(parentDir, name);
    }

    async ensureDebugConfiguration(root: string): Promise<DebugSetupResult> {
        return this.scaffolder.ensureDebugConfiguration(root);
    }

    private async runPhpArtisan(root: string, args: string[], timeoutMs: number): Promise<CommandResult> {
        const artisan = await pathExists(path.join(root, 'artisan'));
        if (!artisan) {
            throw new Error('This folder does not contain a Laravel artisan file.');
        }
        const php = await getPhpTool();
        if (!php.available || !php.command) {
            throw new Error('PHP is not available. Install PHP and add it to PATH.');
        }
        return runCommand(php.command, [path.join(root, 'artisan'), ...args], {
            cwd: root,
            timeoutMs,
            maxOutputBytes: 8 * 1024 * 1024
        });
    }

    private async detectTestRunner(root: string, lockText?: string): Promise<ProjectInfo['testRunner']> {
        if (await pathExists(path.join(root, 'vendor', 'bin', 'pest')) || await pathExists(path.join(root, 'vendor', 'bin', 'pest.bat'))) {
            return 'pest';
        }
        if (await pathExists(path.join(root, 'vendor', 'bin', 'phpunit')) || await pathExists(path.join(root, 'vendor', 'bin', 'phpunit.bat'))) {
            return 'phpunit';
        }
        if (hasPackage(lockText, 'pestphp/pest')) {
            return 'pest';
        }
        if (hasPackage(lockText, 'phpunit/phpunit')) {
            return 'phpunit';
        }
        return await pathExists(path.join(root, 'artisan')) ? 'artisan-test' : 'none';
    }

    private async hasFrontendBuild(root: string): Promise<boolean> {
        return await pathExists(path.join(root, 'public', 'build', 'manifest.json'))
            || await pathExists(path.join(root, 'public', 'mix-manifest.json'));
    }

    private async gitBranch(root: string, gitAvailable: boolean): Promise<string | undefined> {
        if (!gitAvailable) {
            return undefined;
        }
        const result = await runCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root, timeoutMs: 2_000, maxOutputBytes: 8_000 });
        return result.success ? result.stdout.trim() || undefined : undefined;
    }

    private async gitDirty(root: string, gitAvailable: boolean): Promise<boolean | undefined> {
        if (!gitAvailable) {
            return undefined;
        }
        const result = await runCommand('git', ['status', '--porcelain'], { cwd: root, timeoutMs: 2_500, maxOutputBytes: 64_000 });
        return result.success ? Boolean(result.stdout.trim()) : undefined;
    }
}