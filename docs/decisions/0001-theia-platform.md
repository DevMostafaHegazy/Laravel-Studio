# ADR 0001: Build on Eclipse Theia

- **Status:** Accepted
- **Date:** 2026-10-29

## Context

Laravel Studio needs an editor, terminal, source control, extension host, debug
adapter support and cross-platform desktop packaging. Reimplementing those
capabilities would be a large maintenance burden and would make Laravel-specific
work compete with core IDE infrastructure.

## Decision

Build the desktop product on Eclipse Theia and the Monaco editor. Ship a
first-party extension for Laravel project intelligence and use Theia's extension
host for PHP, Blade, Tailwind and debugging integrations.

## Consequences

- The workbench, terminal and extension host are proven infrastructure.
- The application inherits Theia's extension compatibility limits and its
  Electron/native-module build matrix.
- Laravel-specific code stays isolated in `extensions/laravel-tools`.
- Packaging is handled per operating system because native modules cannot be
  cross-built safely.
