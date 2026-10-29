import * as React from 'react';
import type { DatabaseOverview, DatabaseQueryResult, DatabaseValue, LaravelProjectService } from '../../common/laravel-protocol';
import { Badge, Button, EmptyState, ErrorBanner, SkeletonLines, Spinner } from '../components/common';
import { Icon } from '../components/icons';
import { formatDuration, quoteSqlIdentifier } from '../components/utils';
import { LaravelUiService } from '../laravel-ui-service';

export function DatabaseSection({
    root,
    laravel,
    ui,
    refreshToken
}: {
    root: string;
    laravel: LaravelProjectService;
    ui: LaravelUiService;
    refreshToken: number;
}): React.ReactElement {
    const [overview, setOverview] = React.useState<DatabaseOverview>();
    const [loadingSchema, setLoadingSchema] = React.useState(true);
    const [schemaError, setSchemaError] = React.useState<string>();
    const [tableFilter, setTableFilter] = React.useState('');
    const [selectedTable, setSelectedTable] = React.useState<string>();
    const [sql, setSql] = React.useState('');
    const [running, setRunning] = React.useState(false);
    const [result, setResult] = React.useState<DatabaseQueryResult>();
    const [localRefresh, setLocalRefresh] = React.useState(0);

    React.useEffect(() => {
        let cancelled = false;
        setLoadingSchema(true);
        setSchemaError(undefined);
        void (async () => {
            try {
                const schema = await laravel.getDatabaseOverview(root);
                if (!cancelled) {
                    setOverview(schema);
                    if (!schema.supported || !schema.connected) {
                        setSchemaError(schema.error);
                    }
                }
            } catch (error) {
                if (!cancelled) {
                    setSchemaError(ui.errorText(error));
                }
            } finally {
                if (!cancelled) {
                    setLoadingSchema(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [root, laravel, ui, refreshToken, localRefresh]);

    const chooseTable = (table: string): void => {
        setSelectedTable(table);
        const identifier = quoteSqlIdentifier(table, overview?.driver);
        setSql(`SELECT *\nFROM ${identifier}\nLIMIT 100;`);
        setResult(undefined);
    };

    const runQuery = async (): Promise<void> => {
        if (!sql.trim() || running) {
            return;
        }
        setRunning(true);
        try {
            const queryResult = await laravel.runDatabaseQuery(root, sql);
            setResult(queryResult);
        } catch (error) {
            setResult({
                success: false,
                columns: [],
                rows: [],
                rowCount: 0,
                truncated: false,
                durationMs: 0,
                message: ui.errorText(error),
                error: ui.errorText(error)
            });
        } finally {
            setRunning(false);
        }
    };

    const filteredTables = React.useMemo(() => {
        if (!overview) {
            return [];
        }
        const filter = tableFilter.trim().toLowerCase();
        return filter ? overview.tables.filter(table => table.toLowerCase().includes(filter)) : overview.tables;
    }, [overview, tableFilter]);

    const handleEditorKeys = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            void runQuery();
        }
    };

    if (loadingSchema && !overview) {
        return <div className='ls-dashboard-section ls-database'><div className='ls-card'><SkeletonLines count={8} /></div></div>;
    }

    if (!overview) {
        return (
            <div className='ls-dashboard-section ls-database'>
                <EmptyState icon='database' title='Database unavailable'>
                    {schemaError ?? 'Laravel Studio could not read the database configuration.'}
                </EmptyState>
            </div>
        );
    }

    return (
        <div className='ls-dashboard-section ls-database'>
            <div className='ls-db-topbar'>
                <div className='ls-db-connection'>
                    <span className={`ls-db-connection__icon ${overview.connected ? 'is-connected' : ''}`}><Icon name='database' size={18} /></span>
                    <div>
                        <div className='ls-db-connection__title'>
                            <strong>{overview.driver}</strong>
                            <Badge tone={overview.connected ? 'green' : 'red'}>{overview.connected ? 'Connected' : 'Offline'}</Badge>
                        </div>
                        <span className='ls-db-connection__detail'>
                            {overview.database ?? 'No database'}
                            {overview.host ? ` · ${overview.host}` : ''}
                            {` · ${overview.tables.length} ${overview.tables.length === 1 ? 'relation' : 'relations'}`}
                        </span>
                    </div>
                </div>
                <Button icon='refresh' variant='quiet' loading={loadingSchema} onClick={() => setLocalRefresh(value => value + 1)}>
                    Refresh schema
                </Button>
            </div>

            {schemaError ? <ErrorBanner>{schemaError}</ErrorBanner> : null}

            <div className='ls-db-layout'>
                <aside className='ls-db-tables' aria-label='Database tables'>
                    <div className='ls-db-tables__head'>
                        <span className='ls-sidebar__section-title'>Tables</span>
                        <span>{overview.tables.length}</span>
                    </div>
                    <div className='ls-search-field ls-search-field--compact'>
                        <Icon name='search' size={14} />
                        <input
                            type='search'
                            value={tableFilter}
                            onChange={event => setTableFilter(event.target.value)}
                            placeholder='Filter tables'
                            aria-label='Filter database tables'
                        />
                    </div>
                    {filteredTables.length === 0 ? (
                        <p className='ls-db-tables__empty'>
                            {overview.connected ? 'No tables yet. Run your migrations to create a schema.' : 'Connect to a database to see tables.'}
                        </p>
                    ) : (
                        <ul className='ls-db-table-list'>
                            {filteredTables.map(table => (
                                <li key={table}>
                                    <button
                                        type='button'
                                        className={selectedTable === table ? 'is-selected' : ''}
                                        onClick={() => chooseTable(table)}
                                    >
                                        <Icon name='table' size={14} />
                                        <span>{table}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </aside>

                <div className='ls-db-workbench'>
                    <section className='ls-sql-editor' aria-label='SQL query editor'>
                        <div className='ls-sql-editor__head'>
                            <div className='ls-sql-editor__title'>
                                <Icon name='code' size={15} />
                                <span>{selectedTable ? `${selectedTable}.sql` : 'query.sql'}</span>
                            </div>
                            <span className='ls-sql-editor__hint'>Ctrl/Cmd + Enter to run</span>
                        </div>
                        <textarea
                            className='ls-sql-editor__input'
                            value={sql}
                            onChange={event => setSql(event.target.value)}
                            onKeyDown={handleEditorKeys}
                            placeholder='SELECT * FROM users LIMIT 20;'
                            spellCheck={false}
                            aria-label='SQL query'
                        />
                        <div className='ls-sql-editor__actions'>
                            <Button icon='play' variant='primary' onClick={() => void runQuery()} loading={running} disabled={!sql.trim()}>
                                Run query
                            </Button>
                            <Button variant='quiet' onClick={() => { setSql(''); setResult(undefined); setSelectedTable(undefined); }}>
                                Clear
                            </Button>
                            {result ? (
                                <span className={`ls-query-status ${result.success ? 'is-success' : 'is-error'}`}>
                                    {result.success ? <Icon name='check-circle' size={14} /> : <Icon name='alert-circle' size={14} />}
                                    {result.success ? result.message : 'Query failed'}
                                    <span className='ls-query-status__time'>· {formatDuration(result.durationMs)}</span>
                                </span>
                            ) : null}
                        </div>
                    </section>

                    {result?.error ? <ErrorBanner>{result.error}</ErrorBanner> : null}

                    {result && result.columns.length > 0 ? (
                        <section className='ls-query-results' aria-label='Query results'>
                            <div className='ls-query-results__head'>
                                <span>{result.rowCount} {result.rowCount === 1 ? 'row' : 'rows'}</span>
                                {result.truncated ? <Badge tone='amber'>Showing first 500</Badge> : null}
                            </div>
                            <div className='ls-table-wrap ls-table-wrap--results'>
                                <table className='ls-table ls-results-table'>
                                    <caption className='ls-visually-hidden'>SQL query results</caption>
                                    <thead>
                                        <tr>
                                            <th scope='col' className='ls-results-table__index'>#</th>
                                            {result.columns.map(column => <th scope='col' key={column}>{column}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.rows.map((row, rowIndex) => (
                                            <tr key={rowIndex}>
                                                <td className='ls-results-table__index'>{rowIndex + 1}</td>
                                                {row.map((value, columnIndex) => (
                                                    <td key={columnIndex} title={displayValue(value)}>
                                                        {renderValue(value)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    ) : result?.success ? (
                        <div className='ls-query-message'>
                            <Icon name='check-circle' size={18} />
                            <div>
                                <strong>{result.message}</strong>
                                <span>Completed in {formatDuration(result.durationMs)}.</span>
                            </div>
                        </div>
                    ) : !result ? (
                        <div className='ls-db-placeholder'>
                            {running ? <Spinner size={22} label='Running query' /> : <Icon name='terminal' size={22} />}
                            <p>Choose a table or write a query. Results are capped at 500 rows for responsiveness.</p>
                        </div>
                    ) : null}
                </div>
            </div>

            <p className='ls-section-note'>
                <Icon name='info' size={13} />
                Connections come from <code>.env</code> and support SQLite, MySQL/MariaDB and PostgreSQL. Credentials never leave the local backend.
            </p>
        </div>
    );
}

function displayValue(value: DatabaseValue): string {
    if (value === null) {
        return 'NULL';
    }
    const text = String(value);
    return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}

function renderValue(value: DatabaseValue): React.ReactNode {
    if (value === null) {
        return <span className='ls-null'>NULL</span>;
    }
    if (typeof value === 'number') {
        return <span className='ls-number'>{value}</span>;
    }
    if (typeof value === 'boolean') {
        return <span className='ls-boolean'>{String(value)}</span>;
    }
    const text = value.length > 180 ? `${value.slice(0, 180)}…` : value;
    return text;
}
