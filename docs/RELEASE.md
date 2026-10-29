# Release process

## Versioning

Laravel Studio uses [Semantic Versioning](https://semver.org/):

- **MAJOR** for incompatible product or extension-contract changes.
- **MINOR** for backward-compatible features.
- **PATCH** for backward-compatible fixes.

The version is stored in `package.json` and `electron-app/package.json`. Update
both, add a `CHANGELOG.md` entry, and commit the change before tagging.

## Local verification

```bash
npm ci
npm run plugins
npm test
npm run package:win   # on Windows
npm run package:linux # on Linux
npm run package:mac   # on macOS
```

Check the generated files under `electron-app/dist/`:

- Windows: NSIS installer and portable `.exe`
- Linux: `.AppImage` and `.deb`
- macOS: `.dmg` and `.zip` (Intel and Apple Silicon)

The build is unsigned unless signing credentials are supplied. See the
installation guide for platform warnings.

## GitHub release

1. Push the commit to `main`.
2. Create and push an annotated tag: `git tag -a v1.0.0 -m "Laravel Studio 1.0.0"` then `git push origin v1.0.0`.
3. The **Release** workflow runs the test suite and packages Windows, Linux,
   Intel macOS and Apple Silicon macOS builds.
4. When all build jobs pass, the workflow creates the GitHub release and uploads
   the installers.
5. Edit the generated release notes if needed and add the SHA-256 values from
   `release/SHA256SUMS.txt` when publishing locally built artifacts.

The workflow never uploads a user's project. It uploads application build
artifacts to the GitHub release.

## Signing

Code signing is intentionally not configured in the public repository. To sign:

- **Windows:** provide a code-signing certificate through the standard
  electron-builder environment variables.
- **macOS:** provide a Developer ID certificate and notarization credentials.

Never commit certificates or signing secrets. Configure them as repository or
organization secrets and restrict access to the release environment.
