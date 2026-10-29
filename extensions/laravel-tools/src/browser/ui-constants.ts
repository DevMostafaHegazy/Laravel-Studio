export type DashboardSection = 'overview' | 'routes' | 'artisan' | 'database' | 'containers' | 'tests';

export const LARAVEL_DASHBOARD_WIDGET_ID = 'laravel-studio:dashboard';
export const LARAVEL_SIDEBAR_WIDGET_ID = 'laravel-studio:sidebar';

export namespace LaravelCommands {
    export const OPEN_DASHBOARD = { id: 'laravel-studio:open-dashboard', label: 'Laravel Studio: Open Dashboard' };
    export const OPEN_SIDEBAR = { id: 'laravel-studio:toggle-sidebar', label: 'Laravel Studio: Toggle Project Panel' };
    export const OPEN_FOLDER = { id: 'laravel-studio:open-folder', label: 'Laravel Studio: Open Project Folder…' };
    export const NEW_PROJECT = { id: 'laravel-studio:new-project', label: 'Laravel Studio: New Laravel Project…' };
    export const SERVE = { id: 'laravel-studio:serve', label: 'Laravel Studio: Start Development Server' };
    export const TEST = { id: 'laravel-studio:test', label: 'Laravel Studio: Run Tests' };
    export const MIGRATE = { id: 'laravel-studio:migrate', label: 'Laravel Studio: Run Migrations' };
    export const MIGRATE_FRESH = { id: 'laravel-studio:migrate-fresh', label: 'Laravel Studio: Fresh Migrations' };
    export const OPTIMIZE_CLEAR = { id: 'laravel-studio:optimize-clear', label: 'Laravel Studio: Clear Caches' };
    export const SETUP_DEBUG = { id: 'laravel-studio:setup-debug', label: 'Laravel Studio: Set Up PHP Debugging' };
    export const OPEN_DATABASE = { id: 'laravel-studio:open-database', label: 'Laravel Studio: Open Database' };
    export const OPEN_ROUTES = { id: 'laravel-studio:open-routes', label: 'Laravel Studio: Open Routes' };
    export const OPEN_ARTISAN = { id: 'laravel-studio:open-artisan', label: 'Laravel Studio: Open Artisan Commands' };
    export const OPEN_CONTAINERS = { id: 'laravel-studio:open-containers', label: 'Laravel Studio: Open Containers' };
    export const REMOTE_SSH = { id: 'laravel-studio:remote-ssh', label: 'Laravel Studio: Connect to Remote Host over SSH…' };
}
