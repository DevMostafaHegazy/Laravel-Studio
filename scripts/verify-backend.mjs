import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = path.join(root, 'test-artifacts', 'fixture-laravel');
const { LaravelProjectServiceImpl } = require(path.join(root, 'extensions', 'laravel-tools', 'lib', 'node', 'laravel-service.js'));

fs.rmSync(fixture, { recursive: true, force: true });
for (const directory of ['app/Http/Controllers', 'bootstrap/cache', 'database', 'storage/framework/cache', 'storage/framework/sessions', 'storage/framework/views', 'vendor', '.vscode', 'docker']) {
    fs.mkdirSync(path.join(fixture, directory), { recursive: true });
}

fs.writeFileSync(path.join(fixture, 'composer.json'), JSON.stringify({
    name: 'laravel-studio/fixture',
    description: 'Laravel Studio backend verification fixture',
    require: {
        php: '^8.2',
        'laravel/framework': '^11.0'
    }
}, null, 2));

fs.writeFileSync(path.join(fixture, 'composer.lock'), JSON.stringify({
    packages: [{ name: 'laravel/framework', version: 'v11.44.7' }],
    'packages-dev': [{ name: 'phpunit/phpunit', version: 'v11.5.0' }]
}, null, 2));

fs.writeFileSync(path.join(fixture, '.env'), [
    'APP_NAME="Studio Fixture"',
    'APP_ENV=local',
    'APP_DEBUG=true',
    'APP_KEY=base64:fixture',
    'APP_URL=http://localhost',
    'DB_CONNECTION=sqlite',
    'DB_DATABASE=database/database.sqlite'
].join('\n'));

fs.writeFileSync(path.join(fixture, 'vendor', 'autoload.php'), '<?php\n');
fs.writeFileSync(path.join(fixture, 'compose.yaml'), 'services:\n  app:\n    image: php:8.4-cli\n');

fs.writeFileSync(path.join(fixture, 'artisan'), `<?php
$args = array_values(array_filter(array_slice($argv, 1), function ($arg) { return $arg !== '--no-interaction'; }));
$command = $args[0] ?? '';
if ($command === 'route:list') {
    echo json_encode([
        ['method' => 'GET|HEAD', 'uri' => 'users/{user}', 'name' => 'users.show', 'action' => 'App\\\\Http\\\\Controllers\\\\UserController@show', 'middleware' => ['web', 'auth']],
        ['method' => 'POST', 'uri' => 'logout', 'name' => 'logout', 'action' => 'App\\\\Http\\\\Controllers\\\\Auth\\\\LogoutController@__invoke', 'middleware' => ['web']]
    ]);
    exit(0);
}
if ($command === 'list') {
    if (in_array('--format=json', $args, true)) {
        echo json_encode([
            ['name' => 'migrate', 'description' => 'Run the database migrations'],
            ['name' => 'route:list', 'description' => 'List all registered routes'],
            ['name' => 'demo:hello', 'description' => 'Fixture command']
        ]);
    } else {
        echo "Available commands:\\n  migrate     Run the database migrations\\n  route:list  List all registered routes\\n";
    }
    exit(0);
}
if ($command === 'test') {
    echo "PASS  Tests\\\\Feature\\\\ExampleTest\\n\\nTests:    1 passed (1 assertions)\\nDuration: 0.12s\\n";
    exit(0);
}
if ($command === 'demo:hello') {
    echo "Hello from the Laravel Studio fixture.\\n";
    exit(0);
}
fwrite(STDERR, 'Unsupported fixture command: ' . implode(' ', $args) . "\\n");
exit(1);
`);

const sqlite = await import('node:sqlite');
const db = new sqlite.DatabaseSync(path.join(fixture, 'database', 'database.sqlite'));
db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE, active INTEGER NOT NULL DEFAULT 1)');
db.exec("INSERT INTO users (name, email, active) VALUES ('Ada', 'ada@example.com', 1), ('Grace', 'grace@example.com', 0)");
db.close();

const service = new LaravelProjectServiceImpl();
const info = await service.inspectProject(fixture, true);
assert.equal(info.isLaravel, true);
assert.equal(info.name, 'Studio Fixture');
assert.equal(info.laravelVersion, '11.44.7');
assert.equal(info.environment.hasAppKey, true);
assert.equal(info.testRunner, 'phpunit');
assert.equal(info.artisanAvailable, true);

const routes = await service.getRoutes(fixture, true);
assert.equal(routes.length, 2);
assert.equal(routes[0].method, 'GET|HEAD');

const commands = await service.getArtisanCommands(fixture, true);
assert.ok(commands.some(command => command.name === 'demo:hello'));

const artisan = await service.runArtisan(fixture, ['demo:hello']);
assert.equal(artisan.success, true);
assert.match(artisan.stdout, /Hello from the Laravel Studio fixture/);

const tests = await service.runTests(fixture);
assert.equal(tests.success, true);
assert.match(tests.stdout, /1 passed/);

const database = await service.getDatabaseOverview(fixture);
assert.equal(database.connected, true);
assert.ok(database.tables.includes('users'));

const query = await service.runDatabaseQuery(fixture, 'SELECT id, name, email FROM users ORDER BY id');
assert.equal(query.success, true);
assert.equal(query.rowCount, 2);
assert.deepEqual(query.columns, ['id', 'name', 'email']);
assert.equal(query.rows[0][1], 'Ada');

const debug = await service.ensureDebugConfiguration(fixture);
assert.equal(debug.created, true);
const launch = JSON.parse(fs.readFileSync(debug.path, 'utf8'));
assert.equal(launch.configurations[0].port, 9003);

const docker = await service.getDockerStatus(fixture);
assert.equal(typeof docker.available, 'boolean');

await assert.rejects(
    () => service.createProject(fixture, '../escape'),
    /Project names may only contain/
);

console.log('\nBackend integration checks passed: project, routes, Artisan, tests, SQLite, debug config, Docker detection.');
