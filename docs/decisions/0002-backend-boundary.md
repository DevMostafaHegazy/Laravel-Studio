# ADR 0002: Keep privileged work in the backend

- **Status:** Accepted
- **Date:** 2026-10-29

## Context

Project inspection, process execution, database connections and file writes
require privileged access. Putting them in the renderer would expose the
workbench to a broad attack surface and make credentials visible to UI code.

## Decision

Expose a narrow JSON-RPC contract from `src/common/laravel-protocol.ts`.
Implement it in the Node backend and access it from the renderer through the
`LaravelProjectService` interface. Keep process arguments as arrays, validate
workspace paths, and never return `.env` secrets.

## Consequences

- UI code is testable against a plain protocol and cannot spawn processes
  directly.
- Every new privileged capability needs a contract addition and a backend
  implementation.
- The backend remains the single composition root for filesystem, process,
  database and Docker adapters.
