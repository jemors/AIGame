# Project Codex Notes

This directory contains lightweight project-specific helpers for Codex work.

## Recommended Check Command

```bash
./.codex/check.sh
```

It runs the checks that are currently meaningful for this repository:

- `npm run typecheck`
- `npm run build`

## Why This Exists

- The repository does not yet have an automated test suite.
- Build and type checks are the safest baseline before and after edits.
- `AGENTS.md` holds the main project instructions; this folder only keeps helper files.
