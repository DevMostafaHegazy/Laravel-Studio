import * as React from 'react';
import type { LaravelProjectService, ProjectHealthItem, ProjectInfo } from '../../common/laravel-protocol';
import { Badge, Button, StatusDot, ToolStatus } from '../components/common';
import { Icon, type IconName } from '../components/icons';
import { LaravelUiService } from '../laravel-ui-service';
import type { DashboardSection } from '../ui-constants';

export function OverviewSection({
    info,
    laravel,
    ui,
    onNavigate,
    onRefresh
}: {
    info: ProjectInfo;
    laravel: LaravelProjectService;
    ui: LaravelUiService;
    onNavigate: (section: DashboardSection) => void;
    onRefresh: () => void;
}): React.ReactElement {
    const php = info.tools.php.path ?? 'php';
    const composer = info.tools.composer.path ?? 'composer';

    const serve = (): void => {
        void ui.runInTerminal(php, ['artisan', 'serve'], 'Artisan serve');
    };
    const terminal = (): void => {
        void ui.openShell();
    };
    const migrate = (): void => {
        void ui.runInTerminal(php, ['artisan', 'migrate'], 'Artisan migrate');
    };
    const freshMigrate = async (): Promise<void> => {
        const confirmed = await ui.confirmDestructive(
            'Fresh migrations',
            'This drops every table in the configured database before running migrations again. This cannot be undone.',
            'Drop and migrate'
        );
        if (confirmed) {
            void ui.runInTerminal(php, ['artisan', 'migrate:fresh', '--force'], 'Fresh migrations');
        }
    };
    const clearCache = (): void => {
        void ui.runInTerminal(php, ['artisan', 'optimize:clear'], 'Clear caches');
    };
    const composerInstall = (): void => {
        void ui.runInTerminal(composer, ['install'], 'Composer install');
    };
    const setupDebug = async (): Promise<void> => {
        try {
            const result = await laravel.ensureDebugConfiguration(info.root);
            await ui.openPath(result.path);
        } catch (error) {
            ui.showError('Could not set up PHP debugging.', error);
        }
    };

    return (
        <div className='ls-dashboard-section ls-overview'>
            <section className='ls-overview__actions' aria-labelledby='quick-actions-heading'>
                <div className='ls-section-heading-row'>
                    <div>
                        <span className='ls-eyebrow'>Everyday work</span>
                        <h2 id='quick-actions-heading'>Quick actions</h2>
                    </div>
                    <Badge tone={info.tools.php.available ? 'green' : 'amber'}>
                        {info.tools.php.available ? 'Runtime ready' : 'Runtime issue'}
                    </Badge>
                </div>
                <div className='ls-action-grid'>
                    <ActionCard icon='play' tone='green' title='Start server' description='php artisan serve' onClick={serve} />
                    <ActionCard icon='flask' title='Run tests' description={testLabel(info.testRunner)} onClick={() => onNavigate('tests')} />
                    <ActionCard icon='route' title='Routes' description='Browse application endpoints' onClick={() => onNavigate('routes')} />
                    <ActionCard icon='database' title='Database' description={info.databaseConfigured ? 'Run queries and inspect tables' : 'Set up a connection in .env'} onClick={() => onNavigate('database')} />
                    <ActionCard icon='command' title='Artisan' description='Explore every command' onClick={() => onNavigate('artisan')} />
                    <ActionCard icon='container' title='Containers' description={info.hasSail ? 'Laravel Sail detected' : 'Docker Compose tools'} onClick={() => onNavigate('containers')} />
                </div>
            </section>

            <div className='ls-overview__grid'>
                <section className='ls-card ls-card--health' aria-labelledby='health-heading'>
                    <header className='ls-card__header'>
                        <div>
                            <span className='ls-eyebrow'>Diagnostics</span>
                            <h2 id='health-heading'>Project health</h2>
                        </div>
                        <button type='button' className='ls-text-button' onClick={onRefresh}>
                            <Icon name='refresh' size={14} /> Refresh
                        </button>
                    </header>
                    <ul className='ls-health-cards'>
                        {info.health.map(item => <HealthRow key={item.id} item={item} />)}
                    </ul>
                </section>

                <div className='ls-overview__side'>
                    <section className='ls-card' aria-labelledby='environment-facts-heading'>
                        <header className='ls-card__header'>
                            <div>
                                <span className='ls-eyebrow'>Context</span>
                                <h2 id='environment-facts-heading'>Environment</h2>
                            </div>
                            <Badge tone='neutral'>{info.environment.appEnv ?? 'unknown'}</Badge>
                        </header>
                        <dl className='ls-facts'>
                            <Fact label='Application' value={info.environment.appName ?? info.name} />
                            <Fact label='Laravel' value={info.laravelVersion ?? 'Not detected'} />
                            <Fact label='PHP' value={info.phpVersion ?? 'Not detected'} />
                            <Fact label='Database' value={info.environment.dbConnection ? `${info.environment.dbConnection}${info.environment.dbDatabase ? ` · ${info.environment.dbDatabase}` : ''}` : 'Not configured'} />
                            <Fact label='App URL' value={info.environment.appUrl ?? 'Not set'} copyable={Boolean(info.environment.appUrl)} />
                            <Fact label='Git' value={info.gitBranch ? `${info.gitBranch}${info.gitDirty ? ' · dirty' : ''}` : 'Not a repository'} />

                            <Fact label='Tests' value={testLabel(info.testRunner)} />
                        </dl>
                    </section>

                    <section className='ls-card' aria-labelledby='tools-heading'>
                        <header className='ls-card__header'>
                            <div>
                                <span className='ls-eyebrow'>Toolchain</span>
                                <h2 id='tools-heading'>Available tools</h2>
                            </div>
                        </header>
                        <div className='ls-tool-list'>
                            <ToolStatus label='PHP' available={info.tools.php.available} version={info.tools.php.version} detail={info.tools.php.path} />
                            <ToolStatus label='Composer' available={info.tools.composer.available} version={info.tools.composer.version} detail={info.tools.composer.path} />
                            <ToolStatus label='Git' available={info.tools.git.available} version={info.tools.git.version} detail={info.tools.git.path} />
                            <ToolStatus label='Docker' available={info.tools.docker.available} version={info.tools.docker.version} detail={info.tools.docker.path} />
                        </div>
                        <div className={`ls-xdebug-card ${info.tools.xdebug.loaded ? 'is-ready' : ''}`}>
                            <span className='ls-xdebug-card__icon'><Icon name='bug' size={16} /></span>
                            <div>
                                <strong>{info.tools.xdebug.loaded ? 'Xdebug is listening-ready' : 'Debugging is not configured'}</strong>
                                <span>
                                    {info.tools.xdebug.loaded
                                        ? `${info.tools.xdebug.version ? `v${info.tools.xdebug.version}` : 'Xdebug'}${info.tools.xdebug.mode ? ` · ${info.tools.xdebug.mode}` : ''}`
                                        : 'Create a launch configuration for PHP debugging.'}
                                </span>
                            </div>
                            <Button icon='bug' variant='quiet' onClick={setupDebug}>
                                {info.tools.xdebug.loaded ? 'Configure' : 'Set up'}
                            </Button>
                        </div>
                    </section>
                </div>
            </div>

            <section className='ls-card ls-card--maintenance' aria-labelledby='maintenance-heading'>
                <header className='ls-card__header'>
                    <div>
                        <span className='ls-eyebrow'>Maintenance</span>
                        <h2 id='maintenance-heading'>Project commands</h2>
                    </div>
                </header>
                <div className='ls-maintenance-actions'>
                    <Button icon='terminal' variant='secondary' onClick={terminal}>Open terminal</Button>
                    <Button icon='arrow-right' variant='secondary' onClick={migrate}>Migrate</Button>
                    <Button icon='refresh' variant='secondary' onClick={clearCache}>Clear caches</Button>
                    <Button icon='layers' variant='secondary' onClick={composerInstall}>Composer install</Button>
                    <Button icon='bug' variant='secondary' onClick={setupDebug}>Debug config</Button>
                    <Button icon='alert-circle' variant='danger' onClick={freshMigrate}>Fresh migrate</Button>
                </div>
            </section>
        </div>
    );
}

function ActionCard({
    icon,
    title,
    description,
    onClick,
    tone
}: {
    icon: IconName;
    title: string;
    description: string;
    onClick: () => void;
    tone?: 'green';
}): React.ReactElement {
    return (
        <button type='button' className={`ls-action-card ${tone ? `ls-action-card--${tone}` : ''}`} onClick={onClick}>
            <span className='ls-action-card__icon'><Icon name={icon} size={19} /></span>
            <span className='ls-action-card__text'>
                <strong>{title}</strong>
                <small>{description}</small>
            </span>
            <Icon name='arrow-right' size={15} className='ls-action-card__arrow' />
        </button>
    );
}

function HealthRow({ item }: { item: ProjectHealthItem }): React.ReactElement {
    const icon = item.status === 'ok'
        ? 'check-circle'
        : item.status === 'error'
            ? 'x-circle'
            : item.status === 'warning'
                ? 'alert-circle'
                : 'info';
    return (
        <li className={`ls-health-row ls-health-row--${item.status}`}>
            <span className='ls-health-row__icon'><Icon name={icon} size={17} /></span>
            <div>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
                {item.hint ? <small>{item.hint}</small> : null}
            </div>
        </li>
    );
}

function Fact({ label, value, copyable }: { label: string; value: string; copyable?: boolean }): React.ReactElement {
    return (
        <div className='ls-fact'>
            <dt>{label}</dt>
            <dd title={value}>
                <span>{value}</span>
                {copyable ? (
                    <button
                        type='button'
                        className='ls-fact__copy'
                        title='Copy value'
                        aria-label={`Copy ${label}`}
                        onClick={() => void navigator.clipboard.writeText(value).catch(() => undefined)}
                    >
                        <Icon name='copy' size={12} />
                    </button>
                ) : null}
            </dd>
        </div>
    );
}

function testLabel(runner: ProjectInfo['testRunner']): string {
    return runner === 'pest' ? 'Pest' : runner === 'phpunit' ? 'PHPUnit' : runner === 'artisan-test' ? 'Artisan test' : 'Not configured';
}
