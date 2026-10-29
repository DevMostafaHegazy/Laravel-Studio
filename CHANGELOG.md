# Changelog

All notable changes to Laravel Studio are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Open-source repository documentation, contribution guides and architecture
  decision records.
- CI checks for the first-party extension and backend integration suite.
- Release workflow for Windows, Linux and macOS on native GitHub runners.

### Changed

- Backend database, Docker and project scaffolding responsibilities are now
  isolated in focused service classes behind the existing RPC contract.
- The project explorer uses Seti file and folder icons and selects the opened
  workspace folder.
- The explorer follows the active editor file so the project context stays
  visible while editing.

### Removed

- The welcome page and its unused implementation files.
- Dashboard auto-open when a project is first loaded.

## [1.0.0] - 2026-10-29

### Added

- Electron/Theia desktop IDE for Laravel on Windows, Linux and macOS.
- Laravel project dashboard: health, routes, Artisan, database, containers and
  tests.
- PHP IntelliSense, Xdebug, Blade, Tailwind, EditorConfig and dotenv support.
- Laravel project creation and PHP debug configuration.
- Remote SSH development through Theia.
- Local-first privacy defaults and MIT licensing.

[Unreleased]: https://github.com/DevMostafaHegazy/Laravel-Studio/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/DevMostafaHegazy/Laravel-Studio/releases/tag/v1.0.0
