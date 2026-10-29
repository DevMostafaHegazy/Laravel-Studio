import * as path from 'path';
import type {
    DatabaseOverview,
    DatabaseQueryResult,
    DatabaseValue
} from '../../common/laravel-protocol';
import { parseEnv, pathExists, readText, resolveSqlitePath } from '../env-utils';
import { assertProjectRoot } from './project-support';

interface DatabaseConfig {
    driver: 'sqlite' | 'mysql' | 'pgsql';
    database: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    filePath?: string;
}

const ROW_LIMIT = 500;

/**
 * Owns all direct access to the project's configured database.
 *
 * The service deliberately returns plain protocol objects and never exposes
 * credentials, keeping the renderer independent from database drivers.
 */
export class LaravelDatabaseClient {
    async getOverview(root: string): Promise<DatabaseOverview> {
        const projectRoot = await assertProjectRoot(root);
        let config: DatabaseConfig;
        try {
            config = await this.loadDatabaseConfig(projectRoot);
        } catch (error) {
            return {
                supported: false,
                connected: false,
                driver: 'unknown',
                tables: [],
                error: this.toErrorMessage(error)
            };
        }

        try {
            if (config.driver === 'sqlite') {
                const { DatabaseSync } = await import('node:sqlite');
                if (!config.filePath || (config.filePath !== ':memory:' && !await pathExists(config.filePath))) {
                    return {
                        supported: true,
                        connected: false,
                        driver: 'sqlite',
                        database: config.database,
                        tables: [],
                        error: `SQLite file not found: ${config.filePath}`
                    };
                }
                const db = new DatabaseSync(config.filePath);
                try {
                    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[];
                    return {
                        supported: true,
                        connected: true,
                        driver: 'sqlite',
                        database: config.database,
                        tables: tables.map(row => row.name)
                    };
                } finally {
                    db.close();
                }
            }

            if (config.driver === 'mysql') {
                const mysql = await import('mysql2/promise');
                const connection = await mysql.createConnection({
                    host: config.host,
                    port: config.port,
                    user: config.user,
                    password: config.password,
                    database: config.database,
                    connectTimeout: 6_000,
                    multipleStatements: false
                });
                try {
                    const [rows] = await connection.query(
                        'SELECT TABLE_NAME AS tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
                        [config.database]
                    ) as unknown as [{ tableName: string }[]];
                    return {
                        supported: true,
                        connected: true,
                        driver: 'mysql',
                        database: config.database,
                        host: config.host,
                        tables: rows.map(row => row.tableName)
                    };
                } finally {
                    await connection.end();
                }
            }

            const { Client } = await import('pg');
            const client = new Client({
                host: config.host,
                port: config.port,
                user: config.user,
                password: config.password,
                database: config.database,
                connectionTimeoutMillis: 6_000
            });
            await client.connect();
            try {
                const result = await client.query<{ table_name: string }>(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_name"
                );
                return {
                    supported: true,
                    connected: true,
                    driver: 'pgsql',
                    database: config.database,
                    host: config.host,
                    tables: result.rows.map(row => row.table_name)
                };
            } finally {
                await client.end();
            }
        } catch (error) {
            return {
                supported: true,
                connected: false,
                driver: config.driver,
                database: config.database,
                host: config.host,
                tables: [],
                error: this.friendlyDatabaseError(error)
            };
        }
    }

    async runQuery(root: string, sql: string): Promise<DatabaseQueryResult> {
        const projectRoot = await assertProjectRoot(root);
        if (!sql.trim()) {
            return this.emptyQueryResult('Write a query to run.', 0);
        }
        if (/\x00/.test(sql)) {
            return this.emptyQueryResult('The query contains an invalid character.', 0);
        }

        const started = Date.now();
        let config: DatabaseConfig;
        try {
            config = await this.loadDatabaseConfig(projectRoot);
        } catch (error) {
            return this.failedQueryResult(this.toErrorMessage(error), started);
        }

        try {
            if (config.driver === 'sqlite') {
                return await this.runSqliteQuery(config, sql, started);
            }
            if (config.driver === 'mysql') {
                return await this.runMysqlQuery(config, sql, started);
            }
            return await this.runPostgresQuery(config, sql, started);
        } catch (error) {
            return this.failedQueryResult(this.friendlyDatabaseError(error), started);
        }
    }

    private async loadDatabaseConfig(root: string): Promise<DatabaseConfig> {
        const envText = await readText(path.join(root, '.env'));
        if (!envText) {
            throw new Error('No .env file found. The database connection is not configured.');
        }
        const env = parseEnv(envText);
        const driver = (env.DB_CONNECTION || '').toLowerCase();
        if (!driver) {
            throw new Error('DB_CONNECTION is missing from .env.');
        }
        if (driver === 'sqlite') {
            const configured = env.DB_DATABASE || 'database/database.sqlite';
            const filePath = resolveSqlitePath(root, configured);
            return {
                driver: 'sqlite',
                database: path.relative(root, filePath) || path.basename(filePath),
                filePath
            };
        }
        if (driver === 'mysql' || driver === 'mariadb') {
            if (!env.DB_DATABASE) {
                throw new Error('DB_DATABASE is missing from .env.');
            }
            return {
                driver: 'mysql',
                database: env.DB_DATABASE,
                host: env.DB_HOST || '127.0.0.1',
                port: Number(env.DB_PORT || 3306),
                user: env.DB_USERNAME || 'root',
                password: env.DB_PASSWORD || ''
            };
        }
        if (driver === 'pgsql' || driver === 'postgres' || driver === 'postgresql') {
            if (!env.DB_DATABASE) {
                throw new Error('DB_DATABASE is missing from .env.');
            }
            return {
                driver: 'pgsql',
                database: env.DB_DATABASE,
                host: env.DB_HOST || '127.0.0.1',
                port: Number(env.DB_PORT || 5432),
                user: env.DB_USERNAME || 'postgres',
                password: env.DB_PASSWORD || ''
            };
        }
        throw new Error(`Database driver "${driver}" is not supported yet. Laravel Studio supports SQLite, MySQL/MariaDB and PostgreSQL.`);
    }

    private async runSqliteQuery(config: DatabaseConfig, sql: string, started: number): Promise<DatabaseQueryResult> {
        if (!config.filePath || (config.filePath !== ':memory:' && !await pathExists(config.filePath))) {
            return this.failedQueryResult(`SQLite file not found: ${config.filePath}`, started);
        }
        const { DatabaseSync } = await import('node:sqlite');
        const db = new DatabaseSync(config.filePath);
        try {
            const statement = db.prepare(sql);
            const reader = /^\s*(select|with|pragma|explain)\b/i.test(sql);
            let rows: Record<string, unknown>[] = [];
            let columns: string[] = [];
            let message = '';
            if (reader) {
                rows = statement.all() as Record<string, unknown>[];
                columns = rows.length > 0 ? Object.keys(rows[0]) : this.sqliteColumns(statement);
                message = `${rows.length} row${rows.length === 1 ? '' : 's'} returned.`;
            } else {
                const result = statement.run();
                message = `${Number(result.changes ?? 0)} row${Number(result.changes ?? 0) === 1 ? '' : 's'} affected.`;
            }
            const truncated = rows.length > ROW_LIMIT;
            const limited = rows.slice(0, ROW_LIMIT);
            return {
                success: true,
                columns,
                rows: limited.map(row => columns.map(column => normalizeCell(row[column]))),
                rowCount: rows.length,
                truncated,
                durationMs: Date.now() - started,
                message
            };
        } finally {
            db.close();
        }
    }

    private sqliteColumns(statement: unknown): string[] {
        try {
            const columns = (statement as { columns?: () => { name: string }[] }).columns?.();
            return Array.isArray(columns) ? columns.map(column => column.name) : [];
        } catch {
            return [];
        }
    }

    private async runMysqlQuery(config: DatabaseConfig, sql: string, started: number): Promise<DatabaseQueryResult> {
        const mysql = await import('mysql2/promise');
        const connection = await mysql.createConnection({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
            connectTimeout: 6_000,
            multipleStatements: false,
            dateStrings: true
        });
        try {
            const [rawRows, fields] = await connection.query({ sql, timeout: 30_000 }) as unknown as [Record<string, unknown>[] | { affectedRows?: number }, { name: string }[] | undefined];
            if (Array.isArray(rawRows)) {
                const columns = Array.isArray(fields) ? fields.map(field => field.name) : rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
                const truncated = rawRows.length > ROW_LIMIT;
                return {
                    success: true,
                    columns,
                    rows: rawRows.slice(0, ROW_LIMIT).map(row => columns.map(column => normalizeCell(row[column]))),
                    rowCount: rawRows.length,
                    truncated,
                    durationMs: Date.now() - started,
                    message: `${rawRows.length} row${rawRows.length === 1 ? '' : 's'} returned.`
                };
            }
            const affected = Number(rawRows.affectedRows ?? 0);
            return {
                success: true,
                columns: [],
                rows: [],
                rowCount: 0,
                truncated: false,
                durationMs: Date.now() - started,
                message: `${affected} row${affected === 1 ? '' : 's'} affected.`
            };
        } finally {
            await connection.end();
        }
    }

    private async runPostgresQuery(config: DatabaseConfig, sql: string, started: number): Promise<DatabaseQueryResult> {
        const { Client } = await import('pg');
        const client = new Client({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
            connectionTimeoutMillis: 6_000
        });
        await client.connect();
        try {
            await client.query('SET statement_timeout = 30000');
            const result = await client.query({ text: sql, rowMode: 'array' });
            const commands = new Set(['SELECT', 'SHOW', 'EXPLAIN', 'VALUES', 'WITH', 'TABLE']);
            if (commands.has(result.command) || result.rows.length > 0) {
                const truncated = result.rows.length > ROW_LIMIT;
                return {
                    success: true,
                    columns: result.fields.map(field => field.name),
                    rows: (result.rows as unknown[][]).slice(0, ROW_LIMIT).map(row => row.map(normalizeCell)),
                    rowCount: result.rows.length,
                    truncated,
                    durationMs: Date.now() - started,
                    message: `${result.rows.length} row${result.rows.length === 1 ? '' : 's'} returned.`
                };
            }
            return {
                success: true,
                columns: [],
                rows: [],
                rowCount: 0,
                truncated: false,
                durationMs: Date.now() - started,
                message: `${result.rowCount ?? 0} row${result.rowCount === 1 ? '' : 's'} affected.`
            };
        } finally {
            await client.end();
        }
    }

    private emptyQueryResult(message: string, started: number): DatabaseQueryResult {
        return { success: false, columns: [], rows: [], rowCount: 0, truncated: false, durationMs: Date.now() - started, message, error: message };
    }

    private failedQueryResult(message: string, started: number): DatabaseQueryResult {
        return { success: false, columns: [], rows: [], rowCount: 0, truncated: false, durationMs: Date.now() - started, message, error: message };
    }

    private friendlyDatabaseError(error: unknown): string {
        const message = this.toErrorMessage(error);
        if (/ECONNREFUSED/i.test(message)) {
            return 'The database refused the connection. Make sure it is running and the connection details are correct.';
        }
        if (/Access denied/i.test(message)) {
            return 'The database rejected these credentials. Check DB_USERNAME and DB_PASSWORD in .env.';
        }
        if (/password authentication failed/i.test(message)) {
            return 'The database rejected these credentials. Check DB_USERNAME and DB_PASSWORD in .env.';
        }
        if (/database .* does not exist/i.test(message)) {
            return 'The configured database does not exist yet.';
        }
        return message.length > 1_200 ? `${message.slice(0, 1_200)}…` : message;
    }

    private toErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }
}

function normalizeCell(value: unknown): DatabaseValue {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'bigint') {
        return value.toString();
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (Buffer.isBuffer(value)) {
        return `<binary ${value.length} bytes>`;
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}
