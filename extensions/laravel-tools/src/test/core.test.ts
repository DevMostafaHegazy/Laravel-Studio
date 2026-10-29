import assert from 'node:assert/strict';
import test from 'node:test';
import {
    commandNamespace,
    extractJson,
    findLaravelVersion,
    normalizeRoute,
    parseArtisanListJson,
    parseArtisanListRaw,
    parseEnv,
    parseRouteListJson,
    resolveSqlitePath,
    summarizeEnvironment
} from '../node/env-utils';
import { controllerFile, formatDuration, quoteSqlIdentifier, tokenizeCommand } from '../browser/components/utils';

test('parseEnv handles quoted values, comments and export prefixes', () => {
    const env = parseEnv([
        '# Laravel',
        'APP_NAME="Laravel Studio"',
        "DB_PASSWORD='secret # not a comment'",
        'export APP_ENV=local',
        'DB_HOST=127.0.0.1 # local server',
        'EMPTY=',
        'INVALID LINE'
    ].join('\n'));
    assert.equal(env.APP_NAME, 'Laravel Studio');
    assert.equal(env.DB_PASSWORD, 'secret # not a comment');
    assert.equal(env.APP_ENV, 'local');
    assert.equal(env.DB_HOST, '127.0.0.1');
    assert.equal(env.EMPTY, '');
    assert.equal(Object.hasOwn(env, 'INVALID LINE'), false);
});

test('summarizeEnvironment never exposes password fields', () => {
    const summary = summarizeEnvironment(parseEnv('APP_KEY=base64:abc\nDB_PASSWORD=secret\nDB_DATABASE=app\nDB_CONNECTION=mysql'));
    assert.equal(summary.hasAppKey, true);
    assert.equal(summary.dbDatabase, 'app');
    assert.equal(Object.hasOwn(summary, 'dbPassword'), false);
});

test('extractJson ignores noise printed before a payload', () => {
    const payload = extractJson<{ ok: boolean }>('Warning: something happened\n{"ok":true}\n');
    assert.deepEqual(payload, { ok: true });
    assert.deepEqual(extractJson<number[]>('notice\n[1,2,3]'), [1, 2, 3]);
});

test('findLaravelVersion reads the framework package from composer.lock', () => {
    const lock = JSON.stringify({
        packages: [{ name: 'laravel/framework', version: 'v11.44.7' }],
        'packages-dev': []
    });
    assert.equal(findLaravelVersion(lock), '11.44.7');
});

test('route JSON is normalized to stable method, middleware and action fields', () => {
    const routes = parseRouteListJson(JSON.stringify([
        {
            method: 'GET|HEAD',
            uri: 'users/{user}',
            name: 'users.show',
            action: 'App\\Http\\Controllers\\UserController@show',
            middleware: ['web', 'auth']
        }
    ]));
    assert.ok(routes);
    assert.equal(routes[0].method, 'GET|HEAD');
    assert.deepEqual(routes[0].middleware, ['web', 'auth']);
    assert.equal(normalizeRoute({ method: 'post', uri: '/' }).method, 'POST');
});

test('Artisan JSON and raw output both parse', () => {
    const json = parseArtisanListJson('Created command\n[{"name":"migrate","description":"Run the database migrations","hidden":false}]');
    assert.deepEqual(json, [{ name: 'migrate', description: 'Run the database migrations', hidden: false }]);
    const raw = parseArtisanListRaw('Available commands:\n  migrate     Run the database migrations\n  route:list  List all registered routes\n');
    assert.deepEqual(raw.map(command => command.name), ['migrate', 'route:list']);
    assert.equal(commandNamespace('route:list'), 'route');
    assert.equal(commandNamespace('migrate'), 'General');
});

test('shell-like tokenizer preserves quoted arguments without invoking a shell', () => {
    assert.deepEqual(tokenizeCommand('make:model "Blog Post" -m'), ['make:model', 'Blog Post', '-m']);
    assert.deepEqual(tokenizeCommand("tinker --execute='echo 1'"), ['tinker', '--execute=echo 1']);
    assert.deepEqual(tokenizeCommand('   '), []);
});

test('controller paths use Laravel conventions and closures are ignored', () => {
    assert.equal(
        controllerFile('D:/work/app', 'App\\Http\\Controllers\\Admin\\UserController@index'),
        'D:/work/app/app/Http/Controllers/Admin/UserController.php'
    );
    assert.equal(controllerFile('D:/work/app', 'Closure'), undefined);
});

test('SQLite paths resolve relative to the project', () => {
    assert.equal(resolveSqlitePath('D:/app', 'database/app.sqlite'), 'D:\\app\\database\\app.sqlite'.replace(/\\/g, require('path').sep));
    assert.equal(resolveSqlitePath('D:/app', ':memory:'), ':memory:');
});

test('utility formatting is stable', () => {
    assert.equal(quoteSqlIdentifier('user`name', 'mysql'), '`user``name`');
    assert.equal(quoteSqlIdentifier('user"name', 'pgsql'), '"user""name"');
    assert.equal(formatDuration(250), '250 ms');
    assert.equal(formatDuration(1_500), '1.5 s');
});
