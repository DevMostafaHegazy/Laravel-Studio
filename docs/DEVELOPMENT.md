# Development guide

## Prerequisites

- Node.js **24.x** (see `.nvmrc`)
- npm 10+
- PHP **8.2+** and Composer 2 for backend integration tests
- Git
- Optional: Docker Desktop/Engine and Xdebug 3

## First setup

```bash
nvm use
npm ci
npm run plugins
npm start
```

`npm start` compiles the first-party Theia extension and launches the Electron
workbench. If native Electron modules need to be rebuilt after an upgrade:

```bash
npm --prefix electron-app run rebuild
```

## Quality gates

Run these before opening a pull request:

```bash
npm test
npm run build:app
```

`npm test` compiles the extension, runs the unit tests and runs the backend
integration suite. `npm run build:app` verifies that the Electron/Theia
production bundle can be generated.

For installer work:

```bash
npm run package:win
npm run package:linux
npm run package:mac
```

After packaging, measure launch time against the packaged application:

```bash
npm run measure:startup
```

The script reports time to the Electron endpoint, the workbench page, and the
ready application shell. It requires a packaged build for the current platform.

Native installers must be built on the matching operating system. The release
workflow does this on GitHub-hosted runners.

## Working with the Theia extension

The first-party extension lives in `extensions/laravel-tools`.

- Compile: `npm run build:extension`
- Watch: `npm run watch:extension`
- Unit tests: `node --test extensions/laravel-tools/lib/test/core.test.js`
- Backend integration tests: `npm run test:backend`

The extension has two entry points:

- `src/browser/laravel-studio-frontend-module.ts` registers browser views,
  commands and UI services.
- `src/node/laravel-studio-backend-module.ts` registers the backend RPC service.

### Adding a backend operation

1. Add a JSON-serializable method to `LaravelProjectService` in
   `src/common/laravel-protocol.ts`.
2. Put the behavior in a focused `src/node/services/*` collaborator when it owns
   a distinct external resource or policy.
3. Delegate through `LaravelProjectServiceImpl`; update the backend module if a
   new collaborator is introduced.
4. Add or extend a test in `src/test/core.test.ts` or
   `scripts/verify-backend.mjs`.
5. Keep secrets out of protocol models and errors.

### Adding a dashboard section

1. Extend `DashboardSection` in `src/browser/ui-constants.ts`.
2. Add a React section under `src/browser/dashboard/`.
3. Render it through the section switch in `laravel-dashboard-widget.tsx`.
4. Reuse primitives in `components/common.tsx` and tokens in `style/index.css`.
5. Verify keyboard focus, reduced motion and the narrow-panel layout.

## UI conventions

- Use the semantic tokens (`--ls-*`) instead of one-off colors.
- Keep icon buttons labelled with an accessible name.
- Preserve visible focus rings.
- Do not introduce decorative animation; motion should explain state changes.
- Test at the default window size and at the minimum supported width.

## Dependency policy

- Prefer existing Theia, Monaco and React capabilities over new packages.
- Pin new runtime dependencies deliberately and explain why they are needed in
  the pull request.
- Do not add a dependency that requires a paid license for the core workflow.
- Third-party extensions remain under their own licenses. See
  `THIRD_PARTY_NOTICES.md`.

## Commit and pull request style

Use Conventional Commits:

```text
feat: add route search keyboard shortcut
fix: keep explorer selection in sync with the active editor
docs: document the backend boundary
```

Keep each pull request focused. Include reproduction steps, screenshots for UI
changes, and the commands used to validate the change.
