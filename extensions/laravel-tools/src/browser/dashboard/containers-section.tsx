import * as React from 'react';
import type { CommandResult, DockerAction, DockerStatus, LaravelProjectService } from '../../common/laravel-protocol';
import { Badge, Button, EmptyState, ErrorBanner, SkeletonLines, StatusDot } from '../components/common';
import { Icon } from '../components/icons';
import { formatDuration } from '../components/utils';
import { LaravelUiService } from '../laravel-ui-service';

type ContainerAction = DockerAction;

export function ContainersSection({
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
    const [status, setStatus] = React.useState<DockerStatus>();
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string>();
    const [busyAction, setBusyAction] = React.useState<ContainerAction>();
    const [actionResult, setActionResult] = React.useState<CommandResult>();
    const [localRefresh, setLocalRefresh] = React.useState(0);

    const load = React.useCallback(async () => {
        setLoading(true);
        setError(undefined);
        try {
            const docker = await laravel.getDockerStatus(root);
            setStatus(docker);
            if (!docker.available || !docker.engineRunning) {
                setError(docker.error);
            }
        } catch (dockerError) {
            setError(ui.errorText(dockerError));
        } finally {
            setLoading(false);
        }
    }, [root, laravel, ui]);

    React.useEffect(() => {
        void load();
    }, [load, refreshToken, localRefresh]);

    const execute = async (action: ContainerAction, confirm = false): Promise<void> => {
        if (busyAction) {
            return;
        }
        if (confirm) {
            const title = action === 'down'
                ? 'Stop the Compose stack'
                : action === 'stop'
                    ? 'Stop services'
                    : 'Rebuild containers';
            const ok = await ui.confirmDestructive(
                title,
                action === 'down'
                    ? 'This stops and removes the project containers and networks. Volumes are not deleted.'
                    : 'Running requests may be interrupted while Docker applies the change.',
                action === 'down' ? 'Stop stack' : 'Continue'
            );
            if (!ok) {
                return;
            }
        }
        setBusyAction(action);
        setActionResult(undefined);
        try {
            const result = await laravel.runDocker(root, action);
            setActionResult(result);
            if (!result.success) {
                setError(result.stderr || result.stdout || 'Docker command failed.');
            }
            setLocalRefresh(value => value + 1);
        } catch (actionError) {
            setError(ui.errorText(actionError));
        } finally {
            setBusyAction(undefined);
        }
    };

    const followLogs = (): void => {
        void ui.runInTerminal('docker', ['compose', 'logs', '-f', '--tail=200'], 'Docker logs');
    };

    if (loading && !status) {
        return <div className='ls-dashboard-section ls-containers'><div className='ls-card'><SkeletonLines count={7} /></div></div>;
    }

    if (!status) {
        return (
            <div className='ls-dashboard-section ls-containers'>
                <EmptyState icon='container' title='Docker is unavailable'>
                    {error ?? 'Laravel Studio could not inspect the Docker environment.'}
                </EmptyState>
            </div>
        );
    }

    if (!status.available) {
        return (
            <div className='ls-dashboard-section ls-containers'>
                <EmptyState
                    icon='container'
                    title='Install Docker to run containers'
                    action={<Button icon='refresh' variant='secondary' onClick={() => setLocalRefresh(value => value + 1)}>Check again</Button>}
                >
                    Docker Desktop or Docker Engine is required to manage Laravel Sail and Compose services.
                </EmptyState>
            </div>
        );
    }

    const canUseCompose = Boolean(status.composeFile);
    const runningContainers = status.containers.filter(container => /running|up/i.test(container.state) || /up/i.test(container.status)).length;

    return (
        <div className='ls-dashboard-section ls-containers'>
            <div className='ls-docker-hero'>
                <div className='ls-docker-hero__identity'>
                    <span className={`ls-docker-mark ${status.engineRunning ? 'is-running' : ''}`}><Icon name='container' size={23} /></span>
                    <div>
                        <div className='ls-docker-hero__title'>
                            <h2>Containers</h2>
                            <Badge tone={status.engineRunning ? 'green' : 'red'}>
                                {status.engineRunning ? 'Engine running' : 'Engine offline'}
                            </Badge>
                            {status.hasSail ? <Badge tone='blue'>Sail</Badge> : null}
                        </div>
                        <p>
                            {status.composeFile
                                ? status.composeFile
                                : 'No docker-compose file detected in this project.'}
                            {status.composeVersion ? ` · Compose ${status.composeVersion}` : ''}
                            {status.engineVersion ? ` · Docker ${status.engineVersion}` : ''}
                        </p>
                    </div>
                </div>
                <div className='ls-docker-hero__summary'>
                    <span><strong>{runningContainers}</strong> running</span>
                    <span><strong>{status.containers.length}</strong> services</span>
                </div>
            </div>

            {error ? <ErrorBanner action={<Button variant='quiet' onClick={() => setLocalRefresh(value => value + 1)}>Retry</Button>}>{error}</ErrorBanner> : null}

            <div className='ls-docker-toolbar'>
                <div className='ls-docker-toolbar__primary'>
                    <Button icon='play' variant='primary' onClick={() => void execute('up')} loading={busyAction === 'up'} disabled={!canUseCompose || !status.engineRunning}>
                        Start
                    </Button>
                    <Button icon='refresh' variant='secondary' onClick={() => void execute('restart', true)} loading={busyAction === 'restart'} disabled={!canUseCompose || !status.engineRunning}>
                        Restart
                    </Button>
                    <Button icon='alert-circle' variant='secondary' onClick={() => void execute('stop', true)} loading={busyAction === 'stop'} disabled={!canUseCompose || !status.engineRunning}>
                        Stop
                    </Button>
                </div>
                <div className='ls-docker-toolbar__secondary'>
                    <Button icon='terminal' variant='quiet' onClick={followLogs} disabled={!canUseCompose || !status.engineRunning}>Follow logs</Button>
                    <Button icon='layers' variant='quiet' onClick={() => void execute('build')} loading={busyAction === 'build'} disabled={!canUseCompose || !status.engineRunning}>
                        Build
                    </Button>
                    <Button icon='refresh' variant='quiet' onClick={() => setLocalRefresh(value => value + 1)} loading={loading}>Refresh</Button>
                </div>
            </div>

            {(!status.composeFile || !status.engineRunning) && !error ? (
                <div className='ls-card ls-docker-note'>
                    <Icon name='info' size={17} />
                    <div>
                        <strong>{status.engineRunning ? 'No Compose stack found' : 'Start Docker'}</strong>
                        <p>
                            {status.engineRunning
                                ? 'Add a compose.yaml or docker-compose.yml file to manage services here.'
                                : 'Open Docker Desktop, then refresh this panel. Terminal and editor features remain available.'}
                        </p>
                    </div>
                </div>
            ) : null}

            <section className='ls-card ls-containers-card' aria-labelledby='compose-services-heading'>
                <header className='ls-card__header'>
                    <div>
                        <span className='ls-eyebrow'>Compose</span>
                        <h2 id='compose-services-heading'>Services</h2>
                    </div>
                    {status.projectName ? <Badge tone='neutral'>{status.projectName}</Badge> : null}
                </header>
                {status.containers.length === 0 ? (
                    <EmptyState icon='container' title='No services running'>
                        {canUseCompose ? 'Start the stack to bring up the services defined in your Compose file.' : 'Add a Compose file to define your local services.'}
                    </EmptyState>
                ) : (
                    <div className='ls-container-list'>
                        {status.containers.map(container => (
                            <div className='ls-container-row' key={`${container.name}-${container.service}`}>
                                <span className='ls-container-row__icon'><Icon name='container' size={17} /></span>
                                <div className='ls-container-row__identity'>
                                    <strong>{container.service || container.name}</strong>
                                    <span>{container.name}</span>
                                </div>
                                <div className='ls-container-row__ports' title={container.ports}>
                                    {container.ports || 'No published ports'}
                                </div>
                                <div className='ls-container-row__state'>
                                    <StatusDot status={/running|up/i.test(container.state) ? 'ok' : /exit|dead/i.test(container.state) ? 'error' : 'warning'} />
                                    <span>{container.state || container.status || 'unknown'}</span>
                                </div>
                                <button
                                    type='button'
                                    className='ls-icon-button'
                                    aria-label={`Show logs for ${container.service}`}
                                    title='Show recent logs'
                                    onClick={() => {
                                        setBusyAction('logs');
                                        void (async () => {
                                            try {
                                                const result = await laravel.runDocker(root, 'logs', container.service);
                                                setActionResult(result);
                                            } catch (logError) {
                                                setError(ui.errorText(logError));
                                            } finally {
                                                setBusyAction(undefined);
                                            }
                                        })();
                                    }}
                                >
                                    <Icon name='terminal' size={15} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {actionResult ? (
                <div className={`ls-output ${actionResult.success ? 'ls-output--success' : 'ls-output--error'}`}>
                    <div className='ls-output__head'>
                        <span className='ls-output__status'>
                            <StatusDot status={actionResult.success ? 'ok' : 'error'} />
                            {actionResult.command}
                        </span>
                        <span className='ls-output__meta'>
                            {formatDuration(actionResult.durationMs)}
                            <button type='button' className='ls-output__close' onClick={() => setActionResult(undefined)} aria-label='Clear Docker output'>
                                <Icon name='close' size={13} />
                            </button>
                        </span>
                    </div>
                    <pre className='ls-output__body'>{actionResult.stdout || actionResult.stderr || 'Command completed without output.'}</pre>
                    {actionResult.success && actionResult.stderr ? <pre className='ls-output__stderr'>{actionResult.stderr}</pre> : null}
                </div>
            ) : null}
        </div>
    );
}
