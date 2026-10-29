const path = require('path');
const fs = require('fs');

// Bundled extensions and the product theme live outside the Electron app bundle.
// They are copied to `resources/app/plugins` when packaged.
const isPackaged = __dirname.includes('.asar');
const bundledPluginsDir = isPackaged
    ? path.join(process.resourcesPath, 'app', 'plugins')
    : path.resolve(__dirname, '..', '..', 'plugins');

if (fs.existsSync(bundledPluginsDir)) {
    process.env.THEIA_DEFAULT_PLUGINS = `local-dir:${bundledPluginsDir}`;
}

process.env.LARAVEL_STUDIO = '1';

// Hand over to the generated Theia Electron entry point.
require('../lib/backend/electron-main.js');
