import { ConnectionHandler, RpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { ContainerModule } from '@theia/core/shared/inversify';
import { LARAVEL_SERVICE_PATH, LaravelProjectService, LaravelServiceClient } from '../common/laravel-protocol';
import { LaravelProjectServiceImpl } from './laravel-service';
import { LaravelDatabaseClient } from './services/database-client';
import { LaravelDockerClient } from './services/docker-client';
import { LaravelProjectScaffolder } from './services/project-scaffolder';

export default new ContainerModule(bind => {
    bind(LaravelDatabaseClient).toSelf().inSingletonScope();
    bind(LaravelDockerClient).toSelf().inSingletonScope();
    bind(LaravelProjectScaffolder).toSelf().inSingletonScope();
    bind(LaravelProjectServiceImpl).toSelf().inSingletonScope();
    bind(LaravelProjectService).toService(LaravelProjectServiceImpl);
    bind(ConnectionHandler).toDynamicValue(context =>
        new RpcConnectionHandler<LaravelServiceClient>(LARAVEL_SERVICE_PATH, () => {
            return context.container.get<LaravelProjectService>(LaravelProjectService);
        })
    ).inSingletonScope();
});
