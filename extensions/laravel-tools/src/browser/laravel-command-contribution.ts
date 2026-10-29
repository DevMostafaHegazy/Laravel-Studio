import { inject, injectable } from '@theia/core/shared/inversify';
import {
    Command,
    CommandContribution,
    CommandRegistry,
    MenuContribution,
    MenuModelRegistry,
    MessageService,
    MAIN_MENU_BAR
} from '@theia/core/lib/common';
import { CommonMenus } from '@theia/core/lib/browser/common-menus';
import { LaravelProjectService } from '../common/laravel-protocol';
import { LaravelUiService } from './laravel-ui-service';
import { LaravelCommands, type DashboardSection } from './ui-constants';

const LARAVEL_MENU = [...MAIN_MENU_BAR, '3_laravel'];

@injectable()
export class LaravelCommandContribution implements CommandContribution, MenuContribution {
    @inject(LaravelUiService)
    protected readonly ui: LaravelUiService;

    @inject(LaravelProjectService)
    protected readonly laravel: LaravelProjectService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(LaravelCommands.OPEN_DASHBOARD, {
            execute: (section?: DashboardSection) => this.ui.openDashboard(isSection(section) ? section : 'overview')
        });
        commands.registerCommand(LaravelCommands.OPEN_FOLDER, {
            execute: () => this.ui.openFolder()
        });
        commands.registerCommand(LaravelCommands.NEW_PROJECT, {
            execute: () => this.ui.newProject()
        });
        commands.registerCommand(LaravelCommands.SERVE, {
            execute: () => this.runWorkspaceCommand(['artisan', 'serve'], 'Artisan serve')
        });
        commands.registerCommand(LaravelCommands.TEST, {
            execute: () => this.runWorkspaceCommand(['artisan', 'test'], 'Run tests')
        });
        commands.registerCommand(LaravelCommands.MIGRATE, {
            execute: () => this.runWorkspaceCommand(['artisan', 'migrate'], 'Artisan migrate')
        });
        commands.registerCommand(LaravelCommands.MIGRATE_FRESH, {
            execute: async () => {
                const confirmed = await this.ui.confirmDestructive(
                    'Fresh migrations',
                    'This drops every table in the configured database before running migrations again.',
                    'Drop and migrate'
                );
                if (confirmed) {
                    await this.runWorkspaceCommand(['artisan', 'migrate:fresh', '--force'], 'Fresh migrations');
                }
            }
        });
        commands.registerCommand(LaravelCommands.OPTIMIZE_CLEAR, {
            execute: () => this.runWorkspaceCommand(['artisan', 'optimize:clear'], 'Clear caches')
        });
        commands.registerCommand(LaravelCommands.SETUP_DEBUG, {
            execute: () => this.setupDebugging()
        });
        commands.registerCommand(LaravelCommands.OPEN_DATABASE, { execute: () => this.ui.openDashboard('database') });
        commands.registerCommand(LaravelCommands.OPEN_ROUTES, { execute: () => this.ui.openDashboard('routes') });
        commands.registerCommand(LaravelCommands.OPEN_ARTISAN, { execute: () => this.ui.openDashboard('artisan') });
        commands.registerCommand(LaravelCommands.OPEN_CONTAINERS, { execute: () => this.ui.openDashboard('containers') });
        commands.registerCommand(LaravelCommands.REMOTE_SSH, {
            execute: () => this.ui.connectRemoteSsh()
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerSubmenu(LARAVEL_MENU, 'Laravel', { sortString: '3_laravel' });

        menus.registerMenuAction(LARAVEL_MENU, {
            commandId: LaravelCommands.OPEN_DASHBOARD.id,
            label: 'Open Project Dashboard',
            order: '1'
        });
        menus.registerMenuAction(LARAVEL_MENU, {
            commandId: LaravelCommands.OPEN_FOLDER.id,
            label: 'Open Project Folder…',
            order: '2'
        });
        menus.registerMenuAction(LARAVEL_MENU, {
            commandId: LaravelCommands.NEW_PROJECT.id,
            label: 'New Laravel Project…',
            order: '3'
        });
        menus.registerMenuAction(LARAVEL_MENU, {
            commandId: LaravelCommands.SERVE.id,
            label: 'Start Development Server',
            order: '4'
        });
        menus.registerMenuAction(LARAVEL_MENU, {
            commandId: LaravelCommands.TEST.id,
            label: 'Run Test Suite',
            order: '5'
        });
        menus.registerMenuAction(LARAVEL_MENU, {
            commandId: LaravelCommands.OPEN_ROUTES.id,
            label: 'Browse Routes',
            order: '6'
        });
        menus.registerMenuAction(LARAVEL_MENU, {
            commandId: LaravelCommands.OPEN_ARTISAN.id,
            label: 'Browse Artisan Commands',
            order: '7'
        });
        menus.registerMenuAction(LARAVEL_MENU, {
            commandId: LaravelCommands.OPEN_DATABASE.id,
            label: 'Open Database',
            order: '8'
        });
        menus.registerMenuAction(LARAVEL_MENU, {
            commandId: LaravelCommands.OPEN_CONTAINERS.id,
            label: 'Open Containers',
            order: '9'
        });
        menus.registerMenuAction(LARAVEL_MENU, {
            commandId: LaravelCommands.MIGRATE.id,
            label: 'Run Migrations',
            order: '10'
        });
        menus.registerMenuAction(LARAVEL_MENU, {
            commandId: LaravelCommands.MIGRATE_FRESH.id,
            label: 'Fresh Migrations…',
            order: '11'
        });
        menus.registerMenuAction(LARAVEL_MENU, {
            commandId: LaravelCommands.OPTIMIZE_CLEAR.id,
            label: 'Clear Caches',
            order: '12'
        });
        menus.registerMenuAction(LARAVEL_MENU, {
            commandId: LaravelCommands.SETUP_DEBUG.id,
            label: 'Set Up PHP Debugging',
            order: '13'
        });
        menus.registerMenuAction(LARAVEL_MENU, {
            commandId: LaravelCommands.REMOTE_SSH.id,
            label: 'Connect to Remote Host over SSH…',
            order: '14'
        });
        menus.registerMenuAction(CommonMenus.FILE_NEW, {
            commandId: LaravelCommands.NEW_PROJECT.id,
            label: 'New Laravel Project…',
            order: 'z1'
        });
    }

    protected async runWorkspaceCommand(artisanArgs: string[], terminalTitle: string): Promise<void> {
        const root = this.ui.getRoot();
        if (!root) {
            const action = await this.messageService.info('Open a Laravel project first.', 'Open folder');
            if (action === 'Open folder') {
                await this.ui.openFolder();
            }
            return;
        }
        try {
            const info = await this.laravel.inspectProject(root);
            if (!info.artisanAvailable) {
                await this.messageService.warn('This folder does not contain a Laravel artisan file.');
                return;
            }
            await this.ui.runInTerminal(info.tools.php.path ?? 'php', artisanArgs, terminalTitle);
        } catch (error) {
            this.ui.showError('Could not run the Artisan command.', error);
        }
    }

    protected async setupDebugging(): Promise<void> {
        const root = this.ui.getRoot();
        if (!root) {
            await this.messageService.warn('Open a Laravel project first.');
            return;
        }
        try {
            const result = await this.laravel.ensureDebugConfiguration(root);
            await this.ui.openPath(result.path);
            await this.messageService.info(result.message);
        } catch (error) {
            this.ui.showError('Could not set up PHP debugging.', error);
        }
    }
}

function isSection(value: unknown): value is DashboardSection {
    return value === 'overview'
        || value === 'routes'
        || value === 'artisan'
        || value === 'database'
        || value === 'containers'
        || value === 'tests';
}

export { LARAVEL_MENU };
