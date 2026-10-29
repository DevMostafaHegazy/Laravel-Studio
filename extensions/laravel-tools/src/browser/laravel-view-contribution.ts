import { injectable } from '@theia/core/shared/inversify';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { LaravelSidebarWidget } from './sidebar/laravel-sidebar-widget';
import { LaravelCommands } from './ui-constants';

@injectable()
export class LaravelViewContribution extends AbstractViewContribution<LaravelSidebarWidget> {
    protected applyInitialWidth = false;

    constructor() {
        super({
            widgetId: LaravelSidebarWidget.ID,
            widgetName: LaravelSidebarWidget.LABEL,
            defaultWidgetOptions: {
                area: 'left',
                rank: 70
            },
            toggleCommandId: LaravelCommands.OPEN_SIDEBAR.id
        });
    }

    async initializeLayout(): Promise<void> {
        await this.openView({ activate: false, reveal: false });
        // On a brand-new workbench, start with the project rail visible. The
        // user's saved layout takes precedence on subsequent launches.
        this.shell.expandPanel('left');
        this.applyInitialWidth = true;
    }

    /**
     * The shell computes its final split sizes after all `initializeLayout`
     * contributions run, so apply the roomier first-run panel width afterwards.
     * Saved layouts intentionally remain under the user's control.
     */
    onDidInitializeLayout(): void {
        if (this.applyInitialWidth) {
            this.applyInitialWidth = false;
            this.shell.resize(360, 'left');
            // The Outline view is a second inspector rail. It can be reopened
            // from the View menu, but a first launch should stay focused on the
            // project navigator and the editor.
            const outline = this.shell.getWidgets('right').find(widget => widget.id === 'outline-view');
            if (outline) {
                void this.shell.closeWidget(outline.id);
            }
        }
    }
}
