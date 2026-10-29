# Windows CA certificates (prebuilt)

This directory vendors the N-API binary from `@vscode/windows-ca-certs@0.3.4`.
The module allows VS Code's proxy agent to read certificates from the Windows
system certificate store.

The binary is N-API based, so it is ABI-stable across supported Electron and Node
versions. It is only installed on Windows x64; Linux and macOS builds mark the
module external and do not need it.

- Upstream: https://github.com/microsoft/vscode-windows-ca-certs
- License: BSD (see `LICENSE` in this directory)
- Version: 0.3.4
