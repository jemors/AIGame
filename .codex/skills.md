# Codex Skills For This Project

This project currently relies on globally installed Codex skills, but this file records which ones are relevant to this repository.

## Recommended Skills

### Project-local: `game-ui-overhaul`

See `./.codex/skills/game-ui-overhaul/SKILL.md`.

This is a repo-local skill summary distilled from the UI work already applied in this project. Use it when continuing the same visual direction instead of re-deciding the art direction from scratch.

### Project mirror: `frontend-skill`

See `./.codex/skills/frontend-skill/SKILL.md`.

This is a vendored copy of the global `frontend-skill` currently used with this project.

### `frontend-skill`

Use for visual polish, layout refinement, typography, spacing, hierarchy, and motion on DOM-based screens.

Best targets in this repo:

- `src/ui/styles/main.css`
- `src/ui/screens/TitleScreen.ts`
- `src/ui/screens/DailyScreen.ts`
- other files under `src/ui/screens/`

Example prompts:

```text
Use frontend-skill to redesign the title screen and global UI style for a stronger game identity.
```

```text
Use frontend-skill to improve the daily management screen UI without changing game rules.
```

### `develop-web-game`

See also `./.codex/skills/develop-web-game/SKILL.md` for the project-local mirror.

Use for small-step iteration on web game behavior with a tighter implement-and-verify loop.

Best targets in this repo:

- Phaser combat flow under `src/scenes/` and `src/combat/`
- screen flow changes that should be checked in the browser
- UI changes that benefit from screenshot-based verification

Example prompts:

```text
Use develop-web-game to iterate on the battle UI and verify the result in a browser loop.
```

```text
Use develop-web-game to improve the title-to-setup flow and validate the screen states.
```

## Notes

- These skills are installed globally under `~/.codex/skills/`.
- Restart Codex after installing new skills so they are discovered in a fresh session.
- For this repository, `frontend-skill` is the primary UI polish skill and `develop-web-game` is the primary game iteration skill.
- The local `game-ui-overhaul` skill is documentation inside this repo, not an auto-discovered global skill.
- The local `frontend-skill` and `develop-web-game` files are project copies of the current global skill definitions.
