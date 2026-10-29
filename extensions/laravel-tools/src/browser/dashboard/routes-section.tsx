import * as React from 'react';
import type { LaravelProjectService, RouteInfo } from '../../common/laravel-protocol';
import { Badge, Button, EmptyState, ErrorBanner, SkeletonLines } from '../components/common';
import { Icon } from '../components/icons';
import { methodTone, openControllerAction } from '../components/utils';
import { LaravelUiService } from '../laravel-ui-service';

export function RoutesSection({
    root,
    laravel,
    ui,
    refreshToken
}: {
    root: string;
    laravel: LaravelProjectService;
    ui: LaravelUiService;
    refreshToken: number;
}): React.ReactElement {
    const [routes, setRoutes] = React.useState<RouteInfo[]>();
    const [error, setError] = React.useState<string>();
    const [loading, setLoading] = React.useState(true);
    const [localRefresh, setLocalRefresh] = React.useState(0);
    const [filter, setFilter] = React.useState('');

    React.useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(undefined);
        void (async () => {
            try {
                const result = await laravel.getRoutes(root, refreshToken > 0 || localRefresh > 0);
                if (!cancelled) {
                    setRoutes(result);
                }
            } catch (routesError) {
                if (!cancelled) {
                    setError(ui.errorText(routesError));
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
    }, [root, laravel, ui, refreshToken, localRefresh]);

    const visible = React.useMemo(() => {
        if (!routes) {
            return [];
        }
        const query = filter.trim().toLowerCase();
        if (!query) {
            return routes;
        }
        return routes.filter(route =>
            [route.method, route.uri, route.name, route.action, route.middleware.join(' ')]
                .filter(Boolean)
                .some(value => value!.toLowerCase().includes(query))
        );
    }, [routes, filter]);

    const refresh = (): void => setLocalRefresh(value => value + 1);

    return (
        <div className='ls-dashboard-section ls-routes'>
            <div className='ls-toolbar-row'>
                <div className='ls-search-field'>
                    <Icon name='search' size={15} />
                    <input
                        type='search'
                        value={filter}
                        onChange={event => setFilter(event.target.value)}
                        placeholder='Filter routes by URI, name or controller'
                        aria-label='Filter routes'
                    />
                    {filter ? (
                        <button type='button' className='ls-search-field__clear' onClick={() => setFilter('')} aria-label='Clear route filter'>
                            <Icon name='close' size={13} />
                        </button>
                    ) : null}
                </div>
                <div className='ls-toolbar-row__meta'>
                    {routes ? <span>{visible.length} of {routes.length} routes</span> : null}
                    <Button icon='refresh' variant='quiet' onClick={refresh} loading={loading}>Refresh</Button>
                </div>
            </div>

            {error ? <ErrorBanner action={<Button variant='quiet' onClick={refresh}>Retry</Button>}>{error}</ErrorBanner> : null}
            {loading && !routes ? (
                <div className='ls-card ls-routes__loading'><SkeletonLines count={8} /></div>
            ) : visible.length === 0 && routes && routes.length > 0 ? (
                <EmptyState icon='search' title='No matching routes'>
                    Try a different endpoint name, URI, or controller.
                </EmptyState>
            ) : visible.length === 0 ? (
                <EmptyState icon='route' title='No routes found'>
                    This Laravel application has not registered any routes yet.
                </EmptyState>
            ) : (
                <div className='ls-table-wrap'>
                    <table className='ls-table ls-routes-table'>
                        <caption className='ls-visually-hidden'>Application routes</caption>
                        <thead>
                            <tr>
                                <th scope='col'>Method</th>
                                <th scope='col'>URI</th>
                                <th scope='col'>Name</th>
                                <th scope='col'>Action</th>
                                <th scope='col'>Middleware</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((route, index) => {
                                const target = openControllerAction(root, route.action);
                                return (
                                    <tr key={`${route.method}-${route.uri}-${index}`}>
                                        <td>
                                            <span className='ls-method-stack'>
                                                {route.method.split('|').map(method => (
                                                    <Badge key={method} tone={methodTone(method)}>{method}</Badge>
                                                ))}
                                            </span>
                                        </td>
                                        <td><code className='ls-route-uri'>/{route.uri === '/' ? '' : route.uri}</code></td>
                                        <td className='ls-route-name'>{route.name ?? <span className='ls-muted'>—</span>}</td>
                                        <td>
                                            {target ? (
                                                <button
                                                    type='button'
                                                    className='ls-route-action'
                                                    title={`Open ${target.path}`}
                                                    onClick={() => void ui.openPath(target.path)}
                                                >
                                                    <span>{route.action}</span>
                                                    <Icon name='file' size={13} />
                                                </button>
                                            ) : (
                                                <span className='ls-route-action ls-route-action--static'>{route.action ?? '—'}</span>
                                            )}
                                        </td>
                                        <td>
                                            {route.middleware.length > 0 ? (
                                                <span className='ls-middleware' title={route.middleware.join('\n')}>
                                                    {route.middleware.length} {route.middleware.length === 1 ? 'layer' : 'layers'}
                                                </span>
                                            ) : <span className='ls-muted'>—</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            <p className='ls-section-note'>
                <Icon name='info' size={13} />
                Route metadata is read from <code>php artisan route:list --json</code>. Controller actions open in the editor.
            </p>
        </div>
    );
}
