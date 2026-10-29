import * as React from 'react';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import type { Disposable } from '@theia/core/lib/common/disposable';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { type Message } from '@theia/core/lib/browser/widgets/widget';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { LaravelProjectService, type ProjectInfo } from '../../common/laravel-protocol';
import { Badge, Button, ErrorBanner, SkeletonLines, StatusDot } from '../components/common';
import { BrandMark, Icon, type IconName } from '../components/icons';
import { LaravelUiService } from '../laravel-ui-service';
import { LaravelDashboardState } from '../laravel-dashboard-state';
import { LARAVEL_SIDEBAR_WIDGET_ID, type DashboardSection } from '../ui-constants';

@injectable()
export class LaravelSidebarWidget extends ReactWidget {
    static readonly ID = LARAVEL_SIDEBAR_WIDGET_ID;
    static readonly LABEL = 'Laravel';

    @inject(LaravelUiService)
    protected readonly ui: LaravelUiService;

    @inject(LaravelProjectService)
    protected readonly laravel: LaravelProjectService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(LaravelDashboardState)
    protected readonly dashboardState: LaravelDashboardState;

    protected root?: string;
    protected workspaceListener?: Disposable;

    @postConstruct()
    protected init(): void {
        this.id = LaravelSidebarWidget.ID;
        this.title.label = LaravelSidebarWidget.LABEL;
        this.title.caption = 'Laravel project overview';
        this.title.iconClass = 'ls-laravel-tab-icon';
        this.title.closable = false;
        this.addClass('ls-sidebar-widget');
        this.updateRoot();
        this.workspaceListener = this.workspaceService.onWorkspaceChanged(() => this.updateRoot());
    }

    override dispose(): void {
        this.workspaceListener?.dispose();
        super.dispose();
    }

    protected updateRoot(): void {
        const root = this.workspaceService.tryGetRoots()[0];
        this.root = root ? FileUri.fsPath(root.resource) : undefined;
        this.update();
    }

    protected override render(): React.ReactNode {
        return (
            <LaravelSidebar
                ui={this.ui}
                laravel={this.laravel}
                root={this.root}
                openSection={(section: DashboardSection) => void this.ui.openDashboard(section)}
            />
        );
    }

    protected override onActivateRequest(message: Message): void {
        super.onActivateRequest(message);
    }
}

function LaravelSidebar({
    ui,
    laravel,
    root,
    openSection
}: {
    ui: LaravelUiService;
    laravel: LaravelProjectService;
    root?: string;
    openSection: (section: DashboardSection) => void;
}): React.ReactElement {
    const [info, setInfo] = React.useState<ProjectInfo>();
    const [loading, setLoading] = React.useState(Boolean(root));
    const [error, setError] = React.useState<string>();
    const [refreshKey, setRefreshKey] = React.useState(0);

    React.useEffect(() => {
        if (!root) {
            setInfo(undefined);
            setLoading(false);
            setError(undefined);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(undefined);
        void (async () => {
            try {
                const project = await laravel.inspectProject(root, refreshKey > 0);
                if (!cancelled) {
                    setInfo(project);
                }
            } catch (inspectionError) {
                if (!cancelled) {
                    setError(ui.errorText(inspectionError));
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
    }, [root, refreshKey, laravel, ui]);

    if (!root) {
        return (
            <div className='ls-sidebar'>
                <div className='ls-sidebar__brand'>
                    <BrandMark size={30} />
                    <div>
                        <strong>Laravel Studio</strong>
                        <span>No project open</span>
                    </div>
                </div>
                <div className='ls-sidebar__empty'>
                    <div className='ls-sidebar__empty-icon'><Icon name='folder-open' size={22} /></div>
                    <h3>Start with a project</h3>
                    <p>Open an existing Laravel folder or create a fresh app to get started.</p>
                    <Button icon='folder-open' variant='primary' className='ls-sidebar__primary-action' onClick={() => void ui.openFolder()}>
                        Open existing project
                    </Button>
                    <Button icon='plus' variant='quiet' onClick={() => void ui.newProject()}>
                        Create Laravel project
                    </Button>
                    <p className='ls-sidebar__local-note'>No account or paid license is required.</p>
                </div>
            </div>
        );
    }

    if (loading && !info) {
        return (
            <div className='ls-sidebar'>
                <div className='ls-sidebar__brand'>
                    <BrandMark size={30} />
                    <div>
                        <strong>Inspecting project</strong>
                        <span className='ls-ellipsis'>{root}</span>
                    </div>
                </div>
                <div className='ls-sidebar__loading'>
                    <SkeletonLines count={6} />
                </div>
            </div>
        );
    }

    if (error && !info) {
        return (
            <div className='ls-sidebar'>
                <div className='ls-sidebar__brand'>
                    <BrandMark size={30} />
                    <div>
                        <strong>Project unavailable</strong>
                        <span className='ls-ellipsis'>{root}</span>
                    </div>
                </div>
                <div className='ls-sidebar__error'>
                    <ErrorBanner>{error}</ErrorBanner>
                    <Button icon='refresh' variant='secondary' onClick={() => setRefreshKey(key => key + 1)}>
                        Try again
                    </Button>
                </div>
            </div>
        );
    }

    if (!info) {
        return <div className='ls-sidebar' />;
    }

    const phpPath = info.tools.php.path ?? 'php';
    const healthOk = info.health.filter(item => item.status === 'ok').length;
    const healthIssues = info.health.filter(item => item.status === 'error' || item.status === 'warning').length;

    const runServe = (): void => {
        void ui.runInTerminal(phpPath, ['artisan', 'serve'], 'Artisan serve');
    };
    const openDebug = async (): Promise<void> => {
        try {
            const result = await laravel.ensureDebugConfiguration(info.root);
            await ui.openPath(result.path);
        } catch (debugError) {
            ui.showError('Could not set up PHP debugging.', debugError);
        }
    };

    return (
        <div className='ls-sidebar'>
            <div className='ls-sidebar__project'>
                <div className='ls-sidebar__project-top'>
                    <span className='ls-sidebar__project-icon'><Icon name='folder' size={17} /></span>
                    <div className='ls-sidebar__project-name'>
                        <strong title={info.name}>{info.name}</strong>
                        <span title={info.root}>{info.root}</span>
                    </div>
                    <button
                        type='button'
                        className='ls-icon-button'
                        title='Refresh project'
                        aria-label='Refresh project'
                        onClick={() => setRefreshKey(key => key + 1)}
                    >
                        <Icon name='refresh' size={15} />
                    </button>
                </div>
                <div className='ls-sidebar__badges'>
                    {info.isLaravel ? <Badge tone='blue'>Laravel {info.laravelVersion ?? ''}</Badge> : <Badge tone='amber'>Not Laravel</Badge>}
                    {info.environment.appEnv ? <Badge tone={info.environment.appEnv === 'production' ? 'amber' : 'green'}>{info.environment.appEnv}</Badge> : null}
                    {info.gitBranch ? <Badge tone='neutral' title='Git branch'>{info.gitBranch}{info.gitDirty ? ' *' : ''}</Badge> : null}
                </div>
                <button
                    type='button'
                    className='ls-sidebar__dashboard-link'
                    onClick={() => openSection('overview')}
                >
                    <Icon name='layers' size={15} />
                    <span>Open project dashboard</span>
                    <Icon name='arrow-right' size={14} />
                </button>
            </div>

            <div className='ls-sidebar__quick'>
                <button type='button' className='ls-quick-action' onClick={runServe}>
                    <span className='ls-quick-action__icon ls-quick-action__icon--green'><Icon name='play' size={16} /></span>
                    <span>
                        <strong>Serve</strong>
                        <small>Start the app</small>
                    </span>
                </button>
                <button type='button' className='ls-quick-action' onClick={() => openSection('tests')}>
                    <span className='ls-quick-action__icon'><Icon name='flask' size={16} /></span>
                    <span>
                        <strong>Run tests</strong>
                        <small>{info.testRunner === 'pest' ? 'Pest' : info.testRunner === 'phpunit' ? 'PHPUnit' : 'Artisan'}</small>
                    </span>
                </button>
                <button type='button' className='ls-quick-action' onClick={() => openSection('routes')}>
                    <span className='ls-quick-action__icon'><Icon name='route' size={16} /></span>
                    <span>
                        <strong>Routes</strong>
                        <small>Browse endpoints</small>
                    </span>
                </button>
                <button type='button' className='ls-quick-action' onClick={() => openSection('database')}>
                    <span className='ls-quick-action__icon'><Icon name='database' size={16} /></span>
                    <span>
                        <strong>Database</strong>
                        <small>{info.environment.dbConnection ?? 'No database'}</small>
                    </span>
                </button>
            </div>

            <nav className='ls-sidebar__nav' aria-label='Laravel project tools'>
                <span className='ls-sidebar__section-title'>Project tools</span>
                <NavButton icon='command' label='Artisan commands' meta='Command palette' onClick={() => openSection('artisan')} />
                <NavButton icon='container' label='Containers' meta={info.hasSail ? 'Laravel Sail' : 'Docker Compose'} onClick={() => openSection('containers')} />
                <NavButton icon='bug' label='PHP debugging' meta={info.tools.xdebug.loaded ? 'Xdebug ready' : 'Set up Xdebug'} onClick={openDebug} />
                <NavButton icon='globe' label='Remote development' meta='Connect over SSH' onClick={() => void ui.connectRemoteSsh()} />
            </nav>

            <div className='ls-sidebar__health'>
                <div className='ls-sidebar__health-head'>
                    <span className='ls-sidebar__section-title'>Project health</span>
                    <span className='ls-sidebar__health-count'>
                        <StatusDot status={healthIssues > 0 ? 'warning' : 'ok'} />
                        {healthIssues > 0 ? `${healthIssues} to review` : `${healthOk} OK`}
                    </span>
                </div>
                <ul className='ls-health-list'>
                    {info.health.map(item => (
                        <li key={item.id} title={`${item.detail}${item.hint ? `\n${item.hint}` : ''}`}>
                            <StatusDot status={item.status === 'info' ? 'info' : item.status} />
                            <span>{item.label}</span>
                            <span className='ls-health-list__detail ls-health-list__state'>
                                {item.status === 'ok' ? 'OK' : item.status === 'warning' ? 'Review' : item.status === 'error' ? 'Fix' : 'Info'}
                            </span>
                        </li>
                    ))}
                </ul>
                {healthIssues > 0 ? (
                    <button type='button' className='ls-sidebar__review' onClick={() => openSection('overview')}>
                        Review project health
                        <Icon name='arrow-right' size={13} />
                    </button>
                ) : null}
            </div>

            <div className='ls-sidebar__footer'>
                <span className={`ls-env-chip ${info.tools.php.available ? 'is-ready' : ''}`}>
                    PHP {info.tools.php.version ?? '—'}
                </span>
                <span className={`ls-env-chip ${info.tools.composer.available ? 'is-ready' : ''}`}>
                    Composer {info.tools.composer.version ?? '—'}
                </span>
                <span className={`ls-env-chip ${info.tools.xdebug.loaded ? 'is-ready' : ''}`}>
                    Xdebug
                </span>
            </div>
        </div>
    );
}

function NavButton({
    icon,
    label,
    meta,
    onClick
}: {
    icon: IconName;
    label: string;
    meta?: string;
    onClick: () => void;
}): React.ReactElement {
    return (
        <button type='button' className='ls-nav-row' onClick={onClick}>
            <span className='ls-nav-row__icon'><Icon name={icon} size={15} /></span>
            <span className='ls-nav-row__label'>{label}</span>
            {meta ? <span className='ls-nav-row__meta'>{meta}</span> : null}
            <Icon name='chevron-right' size={13} className='ls-nav-row__chevron' />
        </button>
    );
}
