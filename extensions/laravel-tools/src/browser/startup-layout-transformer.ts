import { injectable } from '@theia/core/shared/inversify';
import type { ApplicationShell } from '@theia/core/lib/browser/shell/application-shell';
import type { ShellLayoutTransformer } from '@theia/core/lib/browser/shell/shell-layout-restorer';

/**
 * The bottom panel is intentionally not restored at launch.
 *
 * Terminal sessions are transient in Laravel Studio, so restoring the saved
 * panel only recreates empty terminal widgets and can block the workbench while
 * stale PTY ids are resolved. Editors, the explorer and side panels are still
 * restored normally; the terminal, problems and output panels can be opened
 * from the workbench when needed.
 */
@injectable()
export class StartupLayoutTransformer implements ShellLayoutTransformer {
    transformLayoutOnRestore(layoutData: ApplicationShell.LayoutData): void {
        delete layoutData.bottomPanel;
    }
}
