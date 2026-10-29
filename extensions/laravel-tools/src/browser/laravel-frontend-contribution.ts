import { inject, injectable } from '@theia/core/shared/inversify';
import { SelectableTreeNode } from '@theia/core/lib/browser';
import type { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { StatusBar, StatusBarAlignment } from '@theia/core/lib/browser/status-bar/status-bar-types';
import { MessageService } from '@theia/core/lib/common/message-service';
import type { Disposable } from '@theia/core/lib/common/disposable';
import { FileUri } from '@theia/core/lib/common/file-uri';
import URI from '@theia/core/lib/common/uri';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { FileNavigatorContribution } from '@theia/navigator/lib/browser/navigator-contribution';
import { WorkspaceNode } from '@theia/navigator/lib/browser/navigator-tree';
import { LaravelProjectService } from '../common/laravel-protocol';
import { LaravelUiService } from './laravel-ui-service';

const STATUS_ITEM_ID = 'laravel-studio.project-status';

/**
 * Product-level startup behaviour: brand the DOM, keep the Laravel status item in
 * sync and keep the active workspace visible in the file navigator.
 */
@injectable()
export class LaravelFrontendContribution implements FrontendApplicationContribution {
    @inject(FrontendApplicationStateService)
    protected readonly applicationState: FrontendApplicationStateService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(StatusBar)
    protected readonly statusBar: StatusBar;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(LaravelProjectService)
    protected readonly laravel: LaravelProjectService;

    @inject(LaravelUiService)
    protected readonly ui: LaravelUiService;

    @inject(FileNavigatorContribution)
    protected readonly fileNavigator: FileNavigatorContribution;

    protected ready = false;
    protected workspaceListener?: Disposable;
    protected statusRequest = 0;
    protected readonly notifiedProjects = new Set<string>();

    initialize(): void {
        document.documentElement.classList.add('laravel-studio-dark');
        document.body.classList.add('ls-product');
    }

    onStart(): void {
        // Do not await the `ready` state inside a contribution's onStart: Theia
        // reaches that state only after all onStart hooks have returned.
        void this.startWhenReady();
    }

    protected async startWhenReady(): Promise<void> {
        await this.applicationState.reachedState('ready');
        await this.workspaceService.ready;
        this.ready = true;
        this.workspaceListener = this.workspaceService.onWorkspaceChanged(() => void this.handleWorkspace(false));
        await this.handleWorkspace(true);
    }

    onStop(): void {
        this.workspaceListener?.dispose();
    }

    protected async handleWorkspace(initial = false): Promise<void> {
        if (!this.ready) {
            return;
        }
        const roots = this.workspaceService.tryGetRoots();
        const workspaceRoot = roots[0];
        const root = workspaceRoot ? FileUri.fsPath(workspaceRoot.resource) : undefined;

        if (!workspaceRoot || !root) {
            await this.statusBar.removeElement(STATUS_ITEM_ID);
            return;
        }

        await this.fileNavigator.openView({ activate: true, reveal: true });
        await this.revealWorkspaceRoot(workspaceRoot.resource);
        await this.updateStatus(root);
        if (!initial) {
            await this.notifyProject(root);
        }
    }

    /**
     * The navigator model is refreshed asynchronously after a workspace change.
     * Retry briefly so the root node is selected even on the first launch.
     */
    protected async revealWorkspaceRoot(uri: URI): Promise<void> {
        for (let attempt = 0; attempt < 12; attempt++) {
            if (await this.fileNavigator.selectFileNode(uri)) {
                return;
            }
            const navigator = await this.fileNavigator.widget;
            const workspace = navigator.model.root;
            if (WorkspaceNode.is(workspace)) {
                const root = workspace.children[0];
                if (root && SelectableTreeNode.is(root)) {
                    navigator.model.selectNode(root);
                    return;
                }
            }
            await new Promise(resolve => setTimeout(resolve, 150));
        }
    }

    protected async updateStatus(root: string): Promise<void> {
        const request = ++this.statusRequest;
        try {
            const info = await this.laravel.inspectProject(root);
            if (request !== this.statusRequest) {
                return;
            }
            if (!info.isLaravel) {
                await this.statusBar.removeElement(STATUS_ITEM_ID);
                return;
            }
            const text = info.laravelVersion ? `Laravel ${info.laravelVersion}` : 'Laravel project';
            await this.statusBar.setElement(STATUS_ITEM_ID, {
                text,
                alignment: StatusBarAlignment.LEFT,
                priority: 120,
                name: 'Laravel Studio',
                className: 'ls-status-laravel',
                tooltip: `${info.name}${info.environment.appEnv ? ` · ${info.environment.appEnv}` : ''}${info.environment.dbConnection ? ` · ${info.environment.dbConnection}` : ''}`,
                command: 'laravel-studio:open-dashboard'
            });
        } catch {
            if (request === this.statusRequest) {
                await this.statusBar.removeElement(STATUS_ITEM_ID);
            }
        }
    }

    protected async notifyProject(root: string): Promise<void> {
        if (this.notifiedProjects.has(root)) {
            return;
        }
        this.notifiedProjects.add(root);
        try {
            const info = await this.laravel.inspectProject(root);
            if (!info.isLaravel) {
                return;
            }
            const action = await this.messageService.info(
                `Laravel project detected · ${info.laravelVersion ? `Laravel ${info.laravelVersion}` : info.name}`,
                { timeout: 7_000 },
                'Open dashboard'
            );
            if (action === 'Open dashboard') {
                await this.ui.openDashboard('overview');
            }
        } catch {
            // Project discovery is optional and should never block opening a folder.
        }
    }
}
