# Security policy

## Supported versions

Security fixes are applied to the latest release on the `main` branch. Older
releases may not receive backports.

## Reporting a vulnerability

Please do **not** open a public issue for a suspected vulnerability. Use the
repository's **Security → Advisories → Report a vulnerability** flow:

<https://github.com/DevMostafaHegazy/Laravel-Studio/security/advisories/new>

Include:

- affected version and operating system;
- a clear description of the impact;
- reproduction steps or a minimal proof of concept;
- any suggested mitigation.

We will acknowledge the report, investigate it privately, and coordinate a fix
and disclosure where appropriate. Do not include real credentials, private source
code or personal data in a report.

## Security model

- Privileged filesystem, process and database work runs in the Node backend.
- Commands are spawned without a shell and validated before execution.
- Project operations are constrained to the opened workspace.
- `.env` credentials are not returned to the renderer.
- Telemetry is off by default.

## Third-party components

The application bundles Eclipse Theia, VS Code-derived components and extensions
with their own license and security policies. See `THIRD_PARTY_NOTICES.md`.
Users install additional extensions at their own risk and should review their
permissions and network behavior.
