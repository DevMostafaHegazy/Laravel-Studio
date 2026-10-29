import * as React from 'react';
import type { ArtisanCommandInfo, CommandResult, LaravelProjectService } from '../../common/laravel-protocol';
import { Badge, Button, EmptyState, ErrorBanner, SkeletonLines } from '../components/common';
import { Icon } from '../components/icons';
import { formatDuration, tokenizeCommand } from '../components/utils';
import { LaravelUiService } from '../laravel-ui-service';

export function ArtisanSection({
    root,
    phpPath,
    laravel,
    ui,
    refreshToken
}: {
    root: string;
    phpPath: string;
    laravel: LaravelProjectService;
    ui: LaravelUiService;
    refreshToken: number;
}): React.ReactElement {
    const [commands, setCommands] = React.useState<ArtisanCommandInfo[]>();
    const [selected, setSelected] = React.useState<ArtisanCommandInfo>();
    const [query, setQuery] = React.useState('');
    const [commandLine, setCommandLine] = React.useState('');
    const [error, setError] = React.useState<string>();
    const [loading, setLoading] = React.useState(true);
    const [running, setRunning] = React.useState(false);
    const [result, setResult] = React.useState<CommandResult>();
    const [localRefresh, setLocalRefresh] = React.useState(0);

    React.useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(undefined);
        void (async () => {
            try {
                const list = await laravel.getArtisanCommands(root, refreshToken > 0 || localRefresh > 0);
                if (!cancelled) {
                    setCommands(list);
                    setSelected(current => current ?? list.find(command => command.name === 'list') ?? list[0]);
                    if (!commandLine) {
                        setCommandLine(list.find(command => command.name === 'list')?.name ?? '');
                    }
                }
            } catch (commandsError) {
                if (!cancelled) {
                    setError(ui.errorText(commandsError));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
        // Command metadata only needs to be fetched when the workspace or an explicit refresh changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [root, laravel, ui, refreshToken, localRefresh]);

    const grouped = React.useMemo(() => {
        if (!commands) {
            return new Map<string, ArtisanCommandInfo[]>();
        }
        const filter = query.trim().toLowerCase();
        const resultMap = new Map<string, ArtisanCommandInfo[]>();
        for (const command of commands) {
            if (filter && !`${command.name} ${command.description}`.toLowerCase().includes(filter)) {
                continue;
            }
            const list = resultMap.get(command.namespace) ?? [];
            list.push(command);
            resultMap.set(command.namespace, list);
        }
        return resultMap;
    }, [commands, query]);

    const selectCommand = (command: ArtisanCommandInfo): void => {
        setSelected(command);
        setCommandLine(command.name);
    };

    const args = tokenizeCommand(commandLine);
    const canRun = args.length > 0 && !running;

    const runCaptured = async (): Promise<void> => {
        if (!canRun) {
            return;
        }
        setRunning(true);
        setError(undefined);
        try {
            const captured = await laravel.runArtisan(root, args);
            setResult(captured);
            if (!captured.success) {
                setError(captured.stderr || captured.stdout || 'The command failed.');
            }
        } catch (runError) {
            setError(ui.errorText(runError));
        } finally {
            setRunning(false);
        }
    };

    const runInTerminal = (): void => {
        if (args.length === 0) {
            return;
        }
        void ui.runInTerminal(phpPath, ['artisan', ...args], `Artisan ${args[0]}`);
    };

    const total = commands?.length ?? 0;

    return (
        <div className='ls-dashboard-section ls-artisan'>
            <div className='ls-toolbar-row'>
                <div className='ls-search-field'>
                    <Icon name='search' size={15} />
                    <input
                        type='search'
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        placeholder='Search Artisan commands'
                        aria-label='Search Artisan commands'
                    />
                </div>
                <div className='ls-toolbar-row__meta'>
                    {commands ? <span>{total} commands</span> : null}
                    <Button icon='refresh' variant='quiet' loading={loading} onClick={() => setLocalRefresh(value => value + 1)}>
                        Refresh
                    </Button>
                </div>
            </div>

            {error && !result ? <ErrorBanner>{error}</ErrorBanner> : null}

            <div className='ls-artisan__layout'>
                <aside className='ls-artisan__list' aria-label='Artisan commands'>
                    {loading && !commands ? <SkeletonLines count={9} /> : grouped.size === 0 ? (
                        <div className='ls-artisan__no-results'>No commands match “{query}”.</div>
                    ) : (
                        Array.from(grouped.entries()).map(([namespace, list]) => (
                            <section key={namespace} className='ls-command-group'>
                                <h3>{namespace}</h3>
                                {list.map(command => (
                                    <button
                                        type='button'
                                        key={command.name}
                                        className={`ls-command-row ${selected?.name === command.name ? 'is-selected' : ''}`}
                                        onClick={() => selectCommand(command)}
                                    >
                                        <span className='ls-command-row__name'>{command.name}</span>
                                        <span className='ls-command-row__description'>{command.description || '—'}</span>
                                    </button>
                                ))}
                            </section>
                        ))
                    )}
                </aside>

                <div className='ls-artisan__detail'>
                    {selected ? (
                        <div className='ls-artisan__command-head'>
                            <div>
                                <span className='ls-eyebrow'>{selected.namespace}</span>
                                <h2>{selected.name}</h2>
                                <p>{selected.description || 'No description provided.'}</p>
                            </div>
                            <Badge tone='blue'>artisan</Badge>
                        </div>
                    ) : (
                        <EmptyState icon='command' title='Choose a command'>
                            Search on the left, then run it with arguments below.
                        </EmptyState>
                    )}

                    <div className='ls-command-console'>
                        <label htmlFor='ls-artisan-command'>Command</label>
                        <div className='ls-command-input'>
                            <span className='ls-command-input__prompt' aria-hidden='true'>php artisan</span>
                            <input
                                id='ls-artisan-command'
                                type='text'
                                value={commandLine}
                                onChange={event => setCommandLine(event.target.value)}
                                onKeyDown={event => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        void runCaptured();
                                    }
                                }}
                                placeholder='make:model Post -m'
                                spellCheck={false}
                                autoComplete='off'
                            />
                        </div>
                        <div className='ls-command-console__actions'>
                            <Button icon='play' variant='primary' onClick={() => void runCaptured()} loading={running} disabled={!canRun}>
                                Run
                            </Button>
                            <Button icon='terminal' variant='secondary' onClick={runInTerminal} disabled={!canRun}>
                                Run in terminal
                            </Button>
                            {selected ? <span className='ls-command-console__hint'>Press Enter to capture output</span> : null}
                        </div>
                    </div>

                    {result ? (
                        <div className={`ls-output ls-output--${result.success ? 'success' : 'error'}`}>
                            <div className='ls-output__head'>
                                <span className='ls-output__status'>
                                    <span className={`ls-status-dot ls-status-dot--${result.success ? 'ok' : 'error'}`} />
                                    {result.success ? 'Completed' : result.timedOut ? 'Timed out' : 'Failed'}
                                </span>
                                <span className='ls-output__meta'>
                                    {formatDuration(result.durationMs)}
                                    <button type='button' className='ls-output__close' onClick={() => setResult(undefined)} aria-label='Clear output'>
                                        <Icon name='close' size={13} />
                                    </button>
                                </span>
                            </div>
                            <pre className='ls-output__body'>{result.stdout || result.stderr || 'The command completed without output.'}</pre>
                            {result.success && result.stderr ? (
                                <pre className='ls-output__stderr'>{result.stderr}</pre>
                            ) : null}
                        </div>
                    ) : (
                        <div className='ls-command-help'>
                            <Icon name='info' size={15} />
                            <p>
                                Commands run with <code>--no-interaction</code>. Use <strong>Run in terminal</strong> for prompts,
                                Tinker, or long-running processes.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
