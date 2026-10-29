# Contributing to Laravel Studio

Thanks for helping build a focused, open-source Laravel IDE. This project is
MIT-licensed and welcomes issues, documentation fixes and focused pull requests.

## Before you start

- Read the [architecture guide](docs/ARCHITECTURE.md) and
  [development guide](docs/DEVELOPMENT.md).
- Search existing issues and pull requests.
- For security vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of
  opening a public issue.
- For large changes, open a discussion or issue first so the design can be
  agreed before implementation.

## Development workflow

```bash
nvm use
npm ci
npm run plugins
npm start
```

Before submitting a change:

```bash
npm test
npm run build:app
```

If you change packaging, also run the package command for your operating system.

## Coding standards

- Keep the dependency direction described in `docs/ARCHITECTURE.md`.
- Prefer small, named collaborators over adding responsibilities to a facade.
- Keep browser code free of Node.js and direct process access.
- Use the shared RPC contract for backend capabilities.
- Use semantic UI tokens rather than hard-coded colors.
- Keep accessible focus states and labels when changing the interface.
- Add tests where behavior can be verified without a display server.
- Do not commit `.env` files, signing keys, tokens or generated build output.

## Commit convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add project health filter
fix: select the opened folder in the explorer
docs: explain the RPC boundary
chore: update Theia dependencies
```

## Pull requests

A good pull request:

- explains the problem and the chosen approach;
- includes tests or a clear manual verification note;
- contains no unrelated formatting churn;
- updates documentation when behavior or setup changes;
- keeps the change focused enough to review in one sitting.

Use the pull request template and complete the verification checklist.

## Third-party extensions

Extension compatibility is part of the product. Do not bundle an extension whose
license forbids redistribution or whose core workflow requires a paid key unless
the limitation is documented and accepted. Unit changes to bundled extensions
must update `THIRD_PARTY_NOTICES.md`.

## Community

Be respectful and constructive. The project follows the
[Contributor Covenant](CODE_OF_CONDUCT.md).
