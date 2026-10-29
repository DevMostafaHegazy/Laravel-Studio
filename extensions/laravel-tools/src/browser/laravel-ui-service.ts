import { inject, injectable } from '@theia/core/shared/inversify';
import { ApplicationShell, QuickInputService, WidgetManager } from '@theia/core/lib/browser';
import { ConfirmDialog } from '@theia/core/lib/browser/dialogs';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { CommandService } from '@theia/core/lib/common/command';
import { MessageService } from '@theia/core/lib/common/message-service';
import URI from '@theia/core/lib/common/uri';
import { EditorManager } from '@theia/editor/lib/browser/editor-manager';
import { FileDialogService } from '@theia/filesystem/lib/browser/file-dialog/file-dialog-service';
import type { TerminalWidget } from '@theia/terminal/lib/browser/base/terminal-widget';
import { TerminalService } from '@theia/terminal/lib/browser/base/terminal-service';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { LaravelProjectService } from '../common/laravel-protocol';
import { LaravelDashboardState } from './laravel-dashboard-state';
import { DashboardSection, LARAVEL_DASHBOARD_WIDGET_ID } from './ui-constants';

@injectable()
export class LaravelUiService {
    @inject(LaravelProjectService)
    protected readonly laravel: LaravelProjectService;

    @inject(LaravelDashboardState)
    protected readonly dashboardState: LaravelDashboardState;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(FileDialogService)
    protected readonly fileDialogService: FileDialogService;

    @inject(QuickInputService)
    protected readonly quickInputService: QuickInputService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(EditorManager)
    protected readonly editorManager: EditorManager;

    @inject(TerminalService)
    protected readonly terminalService: TerminalService;

    @inject(CommandService)
    protected readonly commandService: CommandService;

    getRoot(): string | undefined {
        const root = this.workspaceService.tryGetRoots()[0];
        return root ? FileUri.fsPath(root.resource) : undefined;
    }

    getWorkspaceName(): string {
        const root = this.workspaceService.tryGetRoots()[0];
        if (!root) {
            return 'No project open';
        }
        return this.baseName(FileUri.fsPath(root.resource));
    }

    async openFolder(): Promise<void> {
        let folder: URI | URI[] | undefined;
        try {
            folder = await this.fileDialogService.showOpenDialog({
                title: 'Open a Laravel project',
                openLabel: 'Open Project',
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false
            });
        } catch (error) {
            this.showError('Could not open the folder picker.', error);
            return;
        }
        const selected = Array.isArray(folder) ? folder[0] : folder;
        if (selected) {
            this.openWorkspace(selected);
        }
    }

    protected openWorkspace(uri: URI): void {
        try {
            this.workspaceService.open(uri);
        } catch (error) {
            this.showError('Could not open this workspace.', error);
        }
    }

    async newProject(): Promise<void> {
        const name = await this.quickInputService.input({
            title: 'New Laravel project',
            prompt: 'Create a fresh Laravel application with Composer.',
            placeHolder: 'my-laravel-app',
            validateInput: async input => {
                if (!input.trim()) {
                    return 'Enter a project name.';
                }
                if (!/^[a-z0-9][a-z0-9_-]{0,62}$/i.test(input.trim())) {
                    return 'Use letters, numbers, dashes and underscores only.';
                }
                return undefined;
            }
        });
        if (!name) {
            return;
        }

        let parent: URI | URI[] | undefined;
        try {
            parent = await this.fileDialogService.showOpenDialog({
                title: 'Choose where to create the project',
                openLabel: 'Choose Folder',
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false
            });
        } catch (error) {
            this.showError('Could not open the folder picker.', error);
            return;
        }
        const parentUri = Array.isArray(parent) ? parent[0] : parent;
        if (!parentUri) {
            return;
        }

        const progress = await this.messageService.showProgress({
            text: 'Creating Laravel project',
            options: { cancelable: false }
        });
        progress.report({ message: 'Running Composer…' });
        try {
            const result = await this.laravel.createProject(FileUri.fsPath(parentUri), name.trim());
            progress.cancel();
            if (!result.success) {
                const details = this.cleanOutput(result.stderr || result.stdout || 'Composer did not complete the project.');
                this.messageService.error(`Could not create the Laravel project.\n${details}`, { timeout: 12_000 });
                return;
            }
            await this.messageService.info(`Created ${name.trim()}. Opening the project…`, { timeout: 4_000 });
            this.openWorkspace(FileUri.create(result.path));
        } catch (error) {
            progress.cancel();
            this.showError('Could not create the Laravel project.', error);
        }
    }

    async openDashboard(section: DashboardSection = 'overview'): Promise<void> {
        this.dashboardState.setSection(section);
        const widget = await this.widgetManager.getOrCreateWidget(LARAVEL_DASHBOARD_WIDGET_ID);
        if (!widget.isAttached) {
            await this.shell.addWidget(widget, { area: 'main', mode: 'tab-after' });
        }
        await this.shell.activateWidget(widget.id);
    }

    async confirmDestructive(title: string, message: string, confirmLabel: string): Promise<boolean> {
        const dialog = new ConfirmDialog({
            title,
            msg: message,
            ok: confirmLabel,
            cancel: 'Cancel'
        });
        return (await dialog.open()) === true;
    }

    async openShell(title = 'Terminal', cwd?: string): Promise<void> {
        const root = cwd ?? this.getRoot();
        if (!root) {
            await this.messageService.warn('Open a project before opening a project terminal.');
            return;
        }
        try {
            await this.createTerminal(root, title);
        } catch (error) {
            this.showError('Could not open a terminal.', error);
        }
    }

    async runInTerminal(command: string, args: string[], title: string): Promise<void> {
        const root = this.getRoot();
        if (!root) {
            await this.messageService.warn('Open a project before running a command.');
            return;
        }
        try {
            const terminal = await this.createTerminal(root, title);
            await terminal.executeCommand({
                cwd: root,
                args: [command, ...args]
            });
        } catch (error) {
            this.showError('Could not start the terminal command.', error);
        }
    }

    protected async createTerminal(cwd: string, title: string): Promise<TerminalWidget> {
        const terminal = await this.terminalService.newTerminal({
            title,
            cwd,
            iconClass: 'ls-terminal-tab-icon',
            destroyTermOnClose: true
        });
        const connected = new Promise<void>(resolve => {
            let timer: ReturnType<typeof setTimeout> | undefined;
            const listener = terminal.onDidOpen(() => {
                if (timer) {
                    clearTimeout(timer);
                }
                listener.dispose();
                resolve();
            });
            timer = setTimeout(() => {
                listener.dispose();
                resolve();
            }, 5_000);
        });
        // TerminalService.newTerminal only creates the widget. The PTY is
        // started (or restored) explicitly, exactly like Theia's own commands.
        await terminal.start();
        await this.terminalService.open(terminal, {
            mode: 'activate',
            widgetOptions: { area: 'bottom' }
        });
        await connected;
        return terminal;
    }

    async openPath(filePath: string, line?: number, column?: number): Promise<void> {
        try {
            await this.editorManager.open(FileUri.create(filePath), {
                revealOption: 'centerIfOutsideViewport',
                selection: line
                    ? {
                        start: { line: Math.max(0, line - 1), character: Math.max(0, (column ?? 1) - 1) }
                    }
                    : undefined
            });
        } catch (error) {
            this.showError('Could not open that file.', error);
        }
    }

    async connectRemoteSsh(): Promise<void> {
        try {
            await this.commandService.executeCommand('remote.ssh.connect');
        } catch (error) {
            this.showError('Remote SSH is not available.', error);
        }
    }

    async copy(text: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            this.messageService.warn('The clipboard is not available.');
        }
    }

    showError(context: string, error: unknown): void {
        const detail = this.errorText(error);
        void this.messageService.error(detail ? `${context}\n${detail}` : context, { timeout: 12_000 });
    }

    errorText(error: unknown): string {
        const message = this.cleanOutput(error instanceof Error ? error.message : String(error));
        return message.length > 2_000 ? `${message.slice(0, 2_000)}…` : message;
    }

    cleanOutput(value: string): string {
        return value
            .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
            .split(/\r?\n/)
            .filter(line => line.trim().length > 0)
            .slice(-18)
            .join('\n');
    }

    protected baseName(filePath: string): string {
        const parts = filePath.split(/[\\/]/).filter(Boolean);
        return parts[parts.length - 1] ?? filePath;
    }
}
