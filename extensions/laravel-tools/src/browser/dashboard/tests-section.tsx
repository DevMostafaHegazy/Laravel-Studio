import * as React from 'react';
import type { CommandResult, LaravelProjectService, ProjectInfo } from '../../common/laravel-protocol';
import { Badge, Button, EmptyState, ErrorBanner } from '../components/common';
import { Icon } from '../components/icons';
import { formatDuration } from '../components/utils';
import { LaravelUiService } from '../laravel-ui-service';

export function TestsSection({
    root,
    info,
    laravel,
    ui
}: {
    root: string;
    info: ProjectInfo;
    laravel: LaravelProjectService;
    ui: LaravelUiService;
}): React.ReactElement {
    const [filter, setFilter] = React.useState('');
    const [running, setRunning] = React.useState(false);
    const [result, setResult] = React.useState<CommandResult>();
    const [error, setError] = React.useState<string>();

    const runner = runnerLabel(info.testRunner);
    const php = info.tools.php.path ?? 'php';

    const run = async (): Promise<void> => {
        if (running) {
            return;
        }
        setRunning(true);
        setError(undefined);
        setResult(undefined);
        try {
            const testResult = await laravel.runTests(root, filter.trim() || undefined);
            setResult(testResult);
            if (!testResult.success) {
                setError(testResult.stderr || 'The test suite reported failures.');
            }
        } catch (testError) {
            setError(ui.errorText(testError));
        } finally {
            setRunning(false);
        }
    };

    const runInTerminal = (): void => {
        const args = ['artisan', 'test'];
        if (filter.trim()) {
            args.push(`--filter=${filter.trim()}`);
        }
        void ui.runInTerminal(php, args, 'Run tests');
    };

    return (
        <div className='ls-dashboard-section ls-tests'>
            <div className='ls-test-hero'>
                <div className='ls-test-hero__identity'>
                    <span className='ls-test-hero__icon'><Icon name='flask' size={22} /></span>
                    <div>
                        <div className='ls-test-hero__title'>
                            <h2>Test suite</h2>
                            <Badge tone={info.testRunner === 'pest' ? 'purple' : 'blue'}>{runner}</Badge>
                        </div>
                        <p>Run the full Laravel test suite or narrow it down with a filter.</p>
                    </div>
                </div>
                <Button icon='terminal' variant='quiet' onClick={runInTerminal}>Run in terminal</Button>
            </div>

            <div className='ls-test-controls'>
                <label className='ls-test-filter'>
                    <span>Filter</span>
                    <input
                        type='text'
                        value={filter}
                        onChange={event => setFilter(event.target.value)}
                        placeholder='Test name, class, or method'
                        onKeyDown={event => {
                            if (event.key === 'Enter') {
                                void run();
                            }
                        }}
                        spellCheck={false}
                    />
                </label>
                <Button icon='play' variant='primary' onClick={() => void run()} loading={running}>
                    Run tests
                </Button>
                <span className='ls-test-controls__hint'>
                    <Icon name='clock' size={13} />
                    {running ? 'Running — this can take a moment' : 'Runs through Artisan without a shell'}
                </span>
            </div>

            {error ? <ErrorBanner>{error}</ErrorBanner> : null}

            {result ? (
                <div className={`ls-test-output ${result.success ? 'is-success' : 'is-failure'}`}>
                    <div className='ls-test-output__head'>
                        <div className='ls-test-output__status'>
                            <Icon name={result.success ? 'check-circle' : 'x-circle'} size={18} />
                            <div>
                                <strong>{result.success ? 'Tests passed' : 'Tests failed'}</strong>
                                <span>{summarize(result.stdout || result.stderr)}</span>
                            </div>
                        </div>
                        <span className='ls-test-output__meta'>{formatDuration(result.durationMs)}</span>
                    </div>
                    <pre className='ls-test-output__body'>{stripAnsi(result.stdout || result.stderr || 'No output was returned.')}</pre>
                </div>
            ) : running ? (
                <div className='ls-test-running' role='status'>
                    <span className='ls-test-running__art'><Icon name='flask' size={24} /></span>
                    <div>
                        <strong>Running {runner}…</strong>
                        <p>Laravel Studio is capturing the test output. Use the terminal runner if you need to interact with prompts.</p>
                    </div>
                </div>
            ) : (
                <EmptyState icon='flask' title='Ready when you are'>
                    Run the suite to see pass/fail output here. The result stays in this panel while you switch tabs.
                </EmptyState>
            )}
        </div>
    );
}

function runnerLabel(runner: ProjectInfo['testRunner']): string {
    switch (runner) {
        case 'pest':
            return 'Pest';
        case 'phpunit':
            return 'PHPUnit';
        case 'artisan-test':
            return 'Artisan test';
        default:
            return 'Not detected';
    }
}

function summarize(output: string): string {
    const clean = stripAnsi(output);
    for (const line of clean.split(/\r?\n/).map(value => value.trim()).filter(Boolean)) {
        if (!line.startsWith('{')) {
            continue;
        }
        try {
            const payload = JSON.parse(line) as { tool?: string; tests?: number; passed?: number; failed?: number; duration_ms?: number };
            if (typeof payload.tests === 'number') {
                return `${payload.passed ?? 0}/${payload.tests} ${payload.tool ?? 'tests'} passed${payload.failed ? ` · ${payload.failed} failed` : ''}${typeof payload.duration_ms === 'number' ? ` · ${payload.duration_ms} ms` : ''}`;
            }
        } catch {
            // Fall through to textual summaries.
        }
    }
    const lines = clean.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const summary = lines.find(line => /^Tests:\s/i.test(line))
        ?? lines.find(line => /^Duration:\s/i.test(line))
        ?? lines[lines.length - 1]
        ?? 'The test run finished without a summary.';
    return summary.length > 160 ? `${summary.slice(0, 160)}…` : summary;
}

function stripAnsi(value: string): string {
    return value.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
}
