# Project Codex Notes

This directory contains lightweight project-specific helpers for Codex work.

## Installed Skills For This Project

See `./.codex/skills.md`.

That file records the Codex skills currently recommended for this repository and how to invoke them for UI and gameplay iteration work.

## Project-Local Skill Notes

The repository also contains a project-specific UI skill summary:

- `./.codex/skills/game-ui-overhaul/SKILL.md`
- `./.codex/skills/frontend-skill/SKILL.md`
- `./.codex/skills/develop-web-game/SKILL.md`

These are local project references. `game-ui-overhaul` is project-specific; `frontend-skill` and `develop-web-game` are vendored copies of the global skills currently used on this project.

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
