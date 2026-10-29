# Third-party notices

Laravel Studio is a product built on top of open-source software. This file is a
summary, not a replacement for the license files shipped with each component.

## Eclipse Theia

The desktop shell, workbench, terminal, debugger, extension host and related
packages are provided by Eclipse Theia.

- Project: https://github.com/eclipse-theia/theia
- License: Eclipse Public License 2.0 (EPL-2.0) OR GNU General Public License,
  version 2, with the GNU Classpath exception
- Copyright: Eclipse Foundation and contributors

Theia's source and notices are available with the distributed application and at
the project URL above.

## Monaco Editor / VS Code services

Parts of the editor and extension APIs are derived from Visual Studio Code and
Monaco Editor.

- Project: https://github.com/microsoft/vscode and https://github.com/microsoft/monaco-editor
- License: MIT
- Copyright: Microsoft Corporation and contributors

## Fonts

- **Inter** — Copyright 2016 The Inter Project Authors, SIL Open Font License 1.1.
  See `licenses/Inter-OFL.txt`.
- **JetBrains Mono** — Copyright 2020 The JetBrains Mono Project Authors, SIL Open
  Font License 1.1. See `licenses/JetBrains-Mono-OFL.txt`.

## Bundled extensions

The following extensions are downloaded at build time from Open VSX and are
distributed under their own licenses. Their `LICENSE` files are present inside
each extension directory under `plugins/`:

- PHP Intelephense (`bmewburn.vscode-intelephense-client`)
- PHP Debug (`xdebug.php-debug`)
- Laravel Extra Intellisense (`amiralizadeh9480.laravel-extra-intellisense`)
- Laravel Blade Snippets (`onecentlin.laravel-blade`)
- Laravel 5 Snippets (`onecentlin.laravel5-snippets`)
- Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)
- EditorConfig (`EditorConfig.EditorConfig`)
- DotENV (`mikestead.dotenv`)
- Built-in VS Code extensions from the Eclipse Theia project

Users may install additional extensions at runtime; those extensions remain under
their respective licenses and are not part of Laravel Studio's MIT license.

PHP Intelephense's extension client is MIT-licensed, while its bundled language
server has separate terms. Its free feature set does not require a paid key;
premium features are optional and require a license purchased from its vendor.
Laravel Studio includes no Intelephense license key and does not require premium
features. Review `plugins/bmewburn.vscode-intelephense-client/extension/LICENSE.txt`
before using or redistributing that extension.

## Runtime libraries

Laravel Studio also bundles npm dependencies including React, Inversify, MySQL2,
PostgreSQL (`pg`), cross-spawn, Docker tooling integrations, and other transitive
dependencies. Their license metadata is available in `package-lock.json` and the
corresponding package directories.
