# Installing Laravel Studio

## Windows

The ready-to-use Windows builds are produced in `electron-app/dist/`:

- `LaravelStudio-Setup-<version>.exe` — the Windows installer.
- `LaravelStudio-<version>-x64.exe` — a portable executable.
- `win-unpacked/` — an unpacked build for diagnostics.

Run the installer and choose an installation folder. The build is unsigned until
production signing certificates are configured, so Windows SmartScreen may ask for
confirmation on first launch.

After installation, install or confirm these tools are available on `PATH`:

1. PHP 8.2 or newer.
2. Composer 2.
3. Git.
4. Optional: Docker Desktop for containers and Sail.
5. Optional: Xdebug 3 for PHP debugging.

Laravel Studio detects tools individually. A missing optional tool disables only the
related commands; the editor still works.

## Linux

Native Linux packages must be built on Linux because Theia's terminal, watcher and
credential modules contain platform-specific native binaries.

```bash
# Ubuntu / Debian build host
sudo apt-get update
sudo apt-get install -y build-essential libnss3 libatk-bridge2.0-0 libgtk-3-0 libasound2
git clone https://github.com/DevMostafaHegazy/Laravel-Studio.git laravel-studio
cd laravel-studio
nvm use 24 # or install Node 24.x
npm ci
npm run plugins
npm run package:linux
```

Artifacts are written to `electron-app/dist/`:

- `LaravelStudio-<version>-x86_64.AppImage`
- `LaravelStudio-<version>-amd64.deb`

The included `.github/workflows/release.yml` performs the same build on Ubuntu for every
tag or manual workflow run.

## macOS

Native macOS packages must be built on macOS:

```bash
git clone https://github.com/DevMostafaHegazy/Laravel-Studio.git laravel-studio
cd laravel-studio
nvm use 24
npm ci
npm run plugins
npm run package:mac
```

Artifacts:

- `LaravelStudio-<version>-x64.dmg` / `.zip` on Intel.
- `LaravelStudio-<version>-arm64.dmg` / `.zip` on Apple Silicon.

The included GitHub Actions workflow builds both Intel and Apple Silicon targets on a
macOS runner and uploads them as workflow artifacts.

Code signing and notarization are not configured in the repository. Add your Apple
Developer ID credentials to the runner before distributing a signed DMG outside your
team.

## All platforms from CI

1. Push the repository to GitHub.
2. Open **Actions → Release → Run workflow**.
3. Download `laravel-studio-windows-x64`, `laravel-studio-linux-x64`,
   `laravel-studio-macos-x64`, or `laravel-studio-macos-arm64`, depending on your system.

The workflow runs unit and backend integration tests before packaging.

Laravel Studio is MIT-licensed and does not require a paid license or account. Telemetry is off by default, and local project files are not automatically uploaded. Network use is limited to explicit operations (for example, installing an extension, Composer creating a project, or connecting to a remote host). Separately installed extensions may have their own network behavior. The bundled Intelephense extension has optional premium features, but Studio includes no key and does not require them. See the [Privacy and licensing](../README.md#privacy-and-licensing) notes.

## First run

- The file explorer is available when no workspace is open; use **Open Folder** to get started.
- Use **New Laravel Project** to run Composer's `create-project`, or **Open project** to
  choose an existing folder.
- Open the Laravel dashboard from the `L` icon in the left rail or from the Laravel menu.
- The Extensions view uses Open VSX. Use **Install from VSIX…** for local `.vsix` files.

## Troubleshooting

### PHP, Composer or Docker is reported missing

Make sure the executable is available on the same `PATH` that launches Laravel Studio.
Restart the IDE after changing system environment variables.

### Windows warns about the installer

The build is unsigned. Verify the file came from your own build, or sign the installer
with a Windows code-signing certificate before distributing it.

### An extension does not work

Extensions that depend on Microsoft Marketplace-only services or private VS Code APIs
may not be compatible. Use an alternative from Open VSX or a local VSIX.

### Xdebug does not connect

Run `Laravel: Set Up PHP Debugging`, install Xdebug 3 for the PHP binary used by the
project, set `xdebug.mode=debug`, and use port `9003`. The Debug view will show the
connection state.

### Database connection fails

Check the `DB_*` values in `.env`, confirm the database server is running, and use the
Database tab's **Refresh schema** action after changing `.env`.

### Linux packages fail to start

Install the distro dependencies listed above. If you use a custom native PHP or Node
installation, confirm it is on `PATH`. For Sandbox errors on Ubuntu 24.04, ensure the
AppImage has a working user namespace or run the Debian package instead.
