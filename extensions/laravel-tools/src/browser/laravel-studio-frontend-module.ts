import { ContainerModule } from '@theia/core/shared/inversify';
import { CommandContribution, MenuContribution } from '@theia/core/lib/common';
import {
    bindViewContribution,
    FrontendApplicationContribution,
    RemoteConnectionProvider,
    ServiceConnectionProvider,
    WidgetFactory
} from '@theia/core/lib/browser';
import { LARAVEL_SERVICE_PATH, LaravelProjectService } from '../common/laravel-protocol';
import { ShellLayoutTransformer } from '@theia/core/lib/browser/shell/shell-layout-restorer';
import { LaravelCommandContribution } from './laravel-command-contribution';
import { LaravelDashboardState } from './laravel-dashboard-state';
import { LaravelDashboardWidget } from './dashboard/laravel-dashboard-widget';
import { LaravelFrontendContribution } from './laravel-frontend-contribution';
import { LaravelUiService } from './laravel-ui-service';
import { LaravelViewContribution } from './laravel-view-contribution';
import { LaravelSidebarWidget } from './sidebar/laravel-sidebar-widget';
import { StartupLayoutTransformer } from './startup-layout-transformer';
import { LARAVEL_DASHBOARD_WIDGET_ID } from './ui-constants';

import '../../src/browser/style/fonts.css';
import '../../src/browser/style/index.css';
import '../../src/browser/style/dashboard.css';
import '../../src/browser/style/workbench.css';

export default new ContainerModule(bind => {
    bind(LaravelDashboardState).toSelf().inSingletonScope();
    bind(LaravelUiService).toSelf().inSingletonScope();
    bind(ShellLayoutTransformer).to(StartupLayoutTransformer).inSingletonScope();

    bind(LaravelProjectService).toDynamicValue(context => {
        const connection = context.container.get<ServiceConnectionProvider>(RemoteConnectionProvider);
        return connection.createProxy<LaravelProjectService>(LARAVEL_SERVICE_PATH);
    }).inSingletonScope();

    bind(LaravelDashboardWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(context => ({
        id: LARAVEL_DASHBOARD_WIDGET_ID,
        createWidget: () => context.container.get<LaravelDashboardWidget>(LaravelDashboardWidget)
    })).inSingletonScope();

    bind(LaravelSidebarWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(context => ({
        id: LaravelSidebarWidget.ID,
        createWidget: () => context.container.get<LaravelSidebarWidget>(LaravelSidebarWidget)
    })).inSingletonScope();

    bindViewContribution(bind, LaravelViewContribution);
    bind(FrontendApplicationContribution).toService(LaravelViewContribution);

    bind(LaravelCommandContribution).toSelf().inSingletonScope();
    [CommandContribution, MenuContribution].forEach(serviceIdentifier =>
        bind(serviceIdentifier).toService(LaravelCommandContribution)
    );

    bind(LaravelFrontendContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(LaravelFrontendContribution);
});
