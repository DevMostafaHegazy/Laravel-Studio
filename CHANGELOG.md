# Changelog

All notable changes to Laravel Studio are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.0.1] - 2026-10-29

### Changed

- Show the main window immediately with the branded loading surface instead of
  keeping the workbench hidden behind a separate splash window.
- Reduced the blocking startup fade from 800 ms to 120 ms.
- Disabled terminal-session restoration at launch so layout restoration no
  longer waits on a previous terminal process.
- Removed unused built-in extensions from the bundled plugin set to reduce
  plugin-host startup work while keeping Laravel, PHP, frontend, Git and
  extension tooling intact.
- Added `npm run measure:startup` for repeatable start-up measurements.
- Release workflow now publishes all native platform artifacts and checksums
  directly from GitHub runners.

### Fixed

- Cross-platform packaging no longer requests an implicit GitHub publish during
  artifact creation.
- Corrected Linux executable/desktop metadata and Debian maintainer metadata.

### Previously completed in this repository

- Open-source documentation, contribution guides and architecture decision
  records.
- Focused backend database, Docker and project scaffolding services.
- Seti file icons, project-root selection and active-file reveal.
- Welcome page and automatic dashboard pop-over removed.

## [1.0.0] - 2026-10-29

### Added

- Electron/Theia desktop IDE for Laravel on Windows, Linux and macOS.
- Laravel project dashboard: health, routes, Artisan, database, containers and
  tests.
- PHP IntelliSense, Xdebug, Blade, Tailwind, EditorConfig and dotenv support.
- Laravel project creation and PHP debug configuration.
- Remote SSH development through Theia.
- Local-first privacy defaults and MIT licensing.

[Unreleased]: https://github.com/DevMostafaHegazy/Laravel-Studio/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/DevMostafaHegazy/Laravel-Studio/releases/tag/v1.0.1
[1.0.0]: https://github.com/DevMostafaHegazy/Laravel-Studio/releases/tag/v1.0.0
