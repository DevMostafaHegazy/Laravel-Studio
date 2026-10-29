import * as React from 'react';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import type { Disposable } from '@theia/core/lib/common/disposable';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { type Message } from '@theia/core/lib/browser/widgets/widget';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { LaravelProjectService, type ProjectInfo } from '../../common/laravel-protocol';
import { Badge, Button, EmptyState, ErrorBanner, SkeletonLines, StatusDot } from '../components/common';
import { Icon, type IconName } from '../components/icons';
import { LaravelDashboardState } from '../laravel-dashboard-state';
import { LaravelUiService } from '../laravel-ui-service';
import { LARAVEL_DASHBOARD_WIDGET_ID, type DashboardSection } from '../ui-constants';
import { ArtisanSection } from './artisan-section';
import { ContainersSection } from './containers-section';
import { DatabaseSection } from './database-section';
import { OverviewSection } from './overview-section';
import { RoutesSection } from './routes-section';
import { TestsSection } from './tests-section';

const SECTIONS: { id: DashboardSection; label: string; icon: IconName }[] = [
    { id: 'overview', label: 'Overview', icon: 'layers' },
    { id: 'routes', label: 'Routes', icon: 'route' },
    { id: 'artisan', label: 'Artisan', icon: 'command' },
    { id: 'database', label: 'Database', icon: 'database' },
    { id: 'containers', label: 'Containers', icon: 'container' },
    { id: 'tests', label: 'Tests', icon: 'flask' }
];

@injectable()
export class LaravelDashboardWidget extends ReactWidget {
    static readonly ID = LARAVEL_DASHBOARD_WIDGET_ID;
    static readonly LABEL = 'Project';

    @inject(LaravelUiService)
    protected readonly ui: LaravelUiService;

    @inject(LaravelProjectService)
    protected readonly laravel: LaravelProjectService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(LaravelDashboardState)
    protected readonly dashboardState: LaravelDashboardState;

    protected section: DashboardSection = 'overview';
    protected stateListener?: Disposable;
    protected workspaceListener?: Disposable;

    @postConstruct()
    protected init(): void {
        this.id = LaravelDashboardWidget.ID;
        this.title.label = LaravelDashboardWidget.LABEL;
        this.title.caption = 'Laravel project dashboard';
        this.title.iconClass = 'ls-dashboard-tab-icon';
        this.title.closable = true;
        this.addClass('ls-dashboard-widget');
        this.section = this.dashboardState.section;
        this.stateListener = this.dashboardState.onDidChange(section => {
            this.section = section;
            this.update();
        });
        this.workspaceListener = this.workspaceService.onWorkspaceChanged(() => this.update());
        this.update();
    }

    override dispose(): void {
        this.stateListener?.dispose();
        this.workspaceListener?.dispose();
        super.dispose();
    }

    protected setSection = (section: DashboardSection): void => {
        if (this.section !== section) {
            this.section = section;
            this.update();
        }
    };

    protected override render(): React.ReactNode {
        const root = this.workspaceService.tryGetRoots()[0];
        return (
            <DashboardView
                ui={this.ui}
                laravel={this.laravel}
                root={root ? FileUri.fsPath(root.resource) : undefined}
                workspaceName={this.ui.getWorkspaceName()}
                section={this.section}
                onSectionChange={this.setSection}
            />
        );
    }

    protected override onActivateRequest(message: Message): void {
        super.onActivateRequest(message);
    }
}

function DashboardView({
    ui,
    laravel,
    root,
    workspaceName,
    section,
    onSectionChange
}: {
    ui: LaravelUiService;
    laravel: LaravelProjectService;
    root?: string;
    workspaceName: string;
    section: DashboardSection;
    onSectionChange: (section: DashboardSection) => void;
}): React.ReactElement {
    const [info, setInfo] = React.useState<ProjectInfo>();
    const [loading, setLoading] = React.useState(Boolean(root));
    const [error, setError] = React.useState<string>();
    const [refreshToken, setRefreshToken] = React.useState(0);

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
                const project = await laravel.inspectProject(root, refreshToken > 0);
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
    }, [root, refreshToken, laravel, ui]);

    React.useEffect(() => {
        if (root) {
            setRefreshToken(0);
            setInfo(undefined);
        }
    }, [root]);

    const refresh = (): void => setRefreshToken(token => token + 1);

    if (!root) {
        return (
            <div className='ls-dashboard ls-dashboard--empty'>
                <EmptyState
                    icon='folder-open'
                    title='No Laravel project open'
                    action={
                        <div className='ls-empty__actions'>
                            <Button icon='folder-open' variant='primary' onClick={() => void ui.openFolder()}>Open project</Button>
                            <Button icon='plus' variant='secondary' onClick={() => void ui.newProject()}>New project</Button>
                        </div>
                    }
                >
                    Open a project folder to see routes, schema, containers and project health in one place.
                </EmptyState>
            </div>
        );
    }

    return (
        <div className='ls-dashboard'>
            <header className='ls-dashboard__header'>
                <div className='ls-dashboard__title-row'>
                    <div className='ls-dashboard__heading'>
                        <span className='ls-eyebrow'>Laravel Studio</span>
                        <div className='ls-dashboard__title'>
                            <h1>{info?.name ?? workspaceName}</h1>
                            {info?.environment.appEnv ? (
                                <Badge tone={info.environment.appEnv === 'production' ? 'amber' : 'green'}>{info.environment.appEnv}</Badge>
                            ) : null}
                            {info && !info.isLaravel ? <Badge tone='red'>Laravel not detected</Badge> : null}
                        </div>
                        <button
                            type='button'
                            className='ls-dashboard__path'
                            title='Copy project path'
                            onClick={() => void navigator.clipboard.writeText(root).catch(() => undefined)}
                        >
                            <Icon name='folder' size={13} />
                            <span>{root}</span>
                            <Icon name='copy' size={12} />
                        </button>
                    </div>
                    <div className='ls-dashboard__actions'>
                        {info ? (
                            <div className='ls-dashboard__meta'>
                                {info.laravelVersion ? <span>Laravel {info.laravelVersion}</span> : null}
                                {info.phpVersion ? <span>PHP {info.phpVersion}</span> : null}
                                {info.gitBranch ? (
                                    <span className='ls-dashboard__branch'>
                                        <Icon name='git-branch' size={13} />
                                        {info.gitBranch}{info.gitDirty ? ' *' : ''}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}
                        <Button icon='refresh' variant='secondary' onClick={refresh} loading={loading}>Refresh</Button>
                        <Button icon='terminal' variant='quiet' onClick={() => void ui.openShell()}>Terminal</Button>
                    </div>
                </div>

                <nav className='ls-dashboard-tabs' role='tablist' aria-label='Laravel project sections'>
                    {SECTIONS.map(tab => (
                        <button
                            key={tab.id}
                            type='button'
                            role='tab'
                            id={`ls-tab-${tab.id}`}
                            aria-selected={section === tab.id}
                            aria-controls={`ls-panel-${tab.id}`}
                            tabIndex={section === tab.id ? 0 : -1}
                            className={`ls-dashboard-tab ${section === tab.id ? 'is-active' : ''}`}
                            onClick={() => onSectionChange(tab.id)}
                            onKeyDown={event => {
                                const index = SECTIONS.findIndex(item => item.id === tab.id);
                                let next = index;
                                if (event.key === 'ArrowRight') {
                                    next = (index + 1) % SECTIONS.length;
                                } else if (event.key === 'ArrowLeft') {
                                    next = (index - 1 + SECTIONS.length) % SECTIONS.length;
                                } else if (event.key === 'Home') {
                                    next = 0;
                                } else if (event.key === 'End') {
                                    next = SECTIONS.length - 1;
                                } else {
                                    return;
                                }
                                event.preventDefault();
                                onSectionChange(SECTIONS[next].id);
                                requestAnimationFrame(() => {
                                    document.getElementById(`ls-tab-${SECTIONS[next].id}`)?.focus();
                                });
                            }}
                        >
                            <Icon name={tab.icon} size={15} />
                            <span>{tab.label}</span>
                            {tab.id === 'tests' && info && info.health.some(item => item.id === 'tests' && item.status === 'error') ? (
                                <StatusDot status='warning' />
                            ) : null}
                        </button>
                    ))}
                </nav>
            </header>

            <div className='ls-dashboard__content' role='tabpanel' id={`ls-panel-${section}`} aria-labelledby={`ls-tab-${section}`}>
                {error && (!info || refreshToken > 0) ? (
                    <ErrorBanner action={<Button variant='quiet' onClick={refresh}>Retry</Button>}>{error}</ErrorBanner>
                ) : null}
                {loading && !info ? (
                    <div className='ls-dashboard__loading'>
                        <SkeletonLines count={2} />
                        <div className='ls-dashboard__skeleton-grid'>
                            {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
                        </div>
                        <SkeletonLines count={4} />
                    </div>
                ) : !info ? (
                    <EmptyState icon='alert-circle' title='Could not inspect this project'>
                        {error ?? 'The project could not be loaded.'}
                    </EmptyState>
                ) : (
                    <>
                        {!info.isLaravel ? (
                            <div className='ls-project-notice'>
                                <Icon name='alert-circle' size={18} />
                                <div>
                                    <strong>This folder does not look like a Laravel project</strong>
                                    <p>You can still edit files here. Laravel actions will become available when an artisan file and Laravel framework are detected.</p>
                                </div>
                            </div>
                        ) : null}
                        {section === 'overview' ? (
                            <OverviewSection info={info} laravel={laravel} ui={ui} onNavigate={onSectionChange} onRefresh={refresh} />
                        ) : section === 'routes' ? (
                            <RoutesSection root={root} laravel={laravel} ui={ui} refreshToken={refreshToken} />
                        ) : section === 'artisan' ? (
                            <ArtisanSection root={root} phpPath={info.tools.php.path ?? 'php'} laravel={laravel} ui={ui} refreshToken={refreshToken} />
                        ) : section === 'database' ? (
                            <DatabaseSection root={root} laravel={laravel} ui={ui} refreshToken={refreshToken} />
                        ) : section === 'containers' ? (
                            <ContainersSection root={root} laravel={laravel} ui={ui} refreshToken={refreshToken} />
                        ) : (
                            <TestsSection root={root} info={info} laravel={laravel} ui={ui} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
