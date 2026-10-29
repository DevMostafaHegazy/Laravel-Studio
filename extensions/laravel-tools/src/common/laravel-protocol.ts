/**
 * Shared contract between the Laravel Studio UI and the backend process.
 * Everything here must remain JSON serializable because it crosses the RPC boundary.
 */

export const LARAVEL_SERVICE_PATH = '/services/laravel-studio';

export type HealthStatus = 'ok' | 'warning' | 'error' | 'info';

export interface ToolInfo {
    id: string;
    label: string;
    available: boolean;
    version?: string;
    path?: string;
    error?: string;
}

export interface XdebugInfo {
    loaded: boolean;
    version?: string;
    mode?: string;
    clientHost?: string;
    clientPort?: string;
}

export interface RuntimeInfo {
    platform: string;
    arch: string;
    nodeVersion: string;
    shell: string;
    home: string;
    php: ToolInfo;
    composer: ToolInfo;
    git: ToolInfo;
    docker: ToolInfo;
    xdebug: XdebugInfo;
}

export interface LaravelEnvironment {
    appName?: string;
    appEnv?: string;
    appDebug?: string;
    appUrl?: string;
    dbConnection?: string;
    dbDatabase?: string;
    dbHost?: string;
    dbPort?: string;
    dbUsername?: string;
    hasAppKey: boolean;
}

export interface ProjectHealthItem {
    id: string;
    label: string;
    status: HealthStatus;
    detail: string;
    hint?: string;
}

export interface ProjectInfo {
    root: string;
    name: string;
    description?: string;
    isLaravel: boolean;
    laravelVersion?: string;
    phpVersion?: string;
    environment: LaravelEnvironment;
    health: ProjectHealthItem[];
    testRunner: 'pest' | 'phpunit' | 'artisan-test' | 'none';
    hasSail: boolean;
    artisanAvailable: boolean;
    databaseConfigured: boolean;
    gitBranch?: string;
    gitDirty?: boolean;
    tools: RuntimeInfo;
}

export interface RouteInfo {
    method: string;
    uri: string;
    name?: string;
    action?: string;
    middleware: string[];
}

export interface ArtisanCommandInfo {
    name: string;
    description: string;
    namespace: string;
    hidden?: boolean;
}

export interface CommandResult {
    command: string;
    success: boolean;
    code: number | null;
    stdout: string;
    stderr: string;
    durationMs: number;
    timedOut?: boolean;
}

export interface DatabaseOverview {
    supported: boolean;
    connected: boolean;
    driver: string;
    database?: string;
    host?: string;
    tables: string[];
    error?: string;
}

export type DatabaseValue = string | number | boolean | null;

export interface DatabaseQueryResult {
    success: boolean;
    columns: string[];
    rows: DatabaseValue[][];
    rowCount: number;
    truncated: boolean;
    durationMs: number;
    message: string;
    error?: string;
}

export interface DockerContainerInfo {
    service: string;
    name: string;
    state: string;
    status: string;
    ports: string;
}

export interface DockerStatus {
    available: boolean;
    engineRunning: boolean;
    engineVersion?: string;
    composeVersion?: string;
    composeFile?: string;
    projectName?: string;
    hasSail: boolean;
    containers: DockerContainerInfo[];
    error?: string;
}

export type DockerAction = 'up' | 'down' | 'restart' | 'stop' | 'start' | 'build' | 'logs' | 'ps';

export interface CreateProjectResult extends CommandResult {
    path: string;
}

export interface DebugSetupResult {
    created: boolean;
    path: string;
    message: string;
}

export const LaravelProjectService = Symbol('LaravelProjectService');

export interface LaravelProjectService {
    getRuntimeInfo(): Promise<RuntimeInfo>;
    inspectProject(root: string, refresh?: boolean): Promise<ProjectInfo>;
    getRoutes(root: string, refresh?: boolean): Promise<RouteInfo[]>;
    getArtisanCommands(root: string, refresh?: boolean): Promise<ArtisanCommandInfo[]>;
    runArtisan(root: string, args: string[]): Promise<CommandResult>;
    runTests(root: string, filter?: string): Promise<CommandResult>;
    runComposer(root: string, args: string[]): Promise<CommandResult>;
    getDatabaseOverview(root: string): Promise<DatabaseOverview>;
    runDatabaseQuery(root: string, sql: string): Promise<DatabaseQueryResult>;
    getDockerStatus(root: string): Promise<DockerStatus>;
    runDocker(root: string, action: DockerAction, service?: string): Promise<CommandResult>;
    createProject(parentDir: string, name: string): Promise<CreateProjectResult>;
    ensureDebugConfiguration(root: string): Promise<DebugSetupResult>;
}

export interface LaravelServiceClient {
    getName(): Promise<string>;
}
