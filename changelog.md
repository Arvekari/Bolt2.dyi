# Changelog

All notable changes to bolt2.dyi are documented in this file.

This changelog is specific to the bolt2.dyi fork and does not track upstream bolt.diy release notes.

The format is inspired by Keep a Changelog and follows semantic versioning where practical.

## [Unreleased]

### Added

- n8n integration endpoint for workflow deployment via `/api/n8n/workflows`.
- Admin-settings fallback support for n8n credentials when environment variables are not set.
- First-run setup guard that requires database selection before first user creation.
- Auth setup UI branding updates for bolt2.dyi logo usage.

### Changed

- Authentication and session API routes now return structured JSON fallbacks on backend/network failures.
- PostgREST persistence request handling now degrades gracefully on fetch errors.
- Main README now documents n8n integration behavior and configuration expectations.

### Fixed

- TypeScript typecheck failure in n8n workflows route (`Env` cast compatibility issue).
- First-use auth flow behavior that could surface generic network errors during signup/login scenarios.

## [0.1.0] - 2026-03-04

### Added

- Initial bolt2.dyi fork-specific changelog baseline.
- Documented first integrated release scope for fork architecture, setup flow hardening, and n8n deployment support.

---

For historical upstream changes before this fork baseline, refer to the original bolt.diy repository release history.
