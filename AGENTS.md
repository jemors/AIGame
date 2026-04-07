# Codex Working Notes

## Project Summary

- This repository is a browser game built with TypeScript, Vite, and Phaser.
- The gameplay mixes DOM-based management screens with Phaser-based combat rendering.
- Game content is mostly JSON-driven under `src/data/`.
- The codebase currently has no committed test files. The reliable automated checks are `npm run typecheck` and `npm run build`.

## First Commands

Run these before or after non-trivial changes:

```bash
npm install
npm run typecheck
npm run build
```

Use `npm run dev` for manual verification in the browser.

## Architecture Map

- `src/main.ts`: app bootstrap, screen registration, startup wiring.
- `src/kernel/`: global game state, event bus, deterministic RNG, persistence entry points.
- `src/systems/`: gameplay systems such as daily flow, events, enemy scaling, and sound.
- `src/combat/`: combat state, enemy AI, and card effect resolution.
- `src/ui/`: DOM UI manager and screen implementations.
- `src/scenes/`: Phaser scenes for combat.
- `src/data/`: cards, employees, enemies, buffs, events, items, equipment, and project data.

## Project-Specific Guardrails

- Preserve the current DOM + Phaser split unless the task explicitly asks for architectural change.
- Prefer small, local fixes over broad refactors. Many files are connected through the event bus and shared game state.
- Keep TypeScript strictness intact. Do not weaken compiler settings to get a change through.
- When changing data in `src/data/`, keep ids stable unless the task explicitly requires migrations.
- Be careful with persistence-facing state in `src/kernel/GameState.ts` and `src/kernel/GameKernel.ts`. Save compatibility matters.
- For UI work, prefer following the existing screen pattern instead of introducing a new framework or state layer.
- For combat changes, verify both type safety and whether the change affects turn flow, buff timing, or enemy intent sequencing.

## Verification Expectations

- Logic changes: run `npm run typecheck` and `npm run build`.
- Data-only changes: still run `npm run build` because JSON shape issues surface there.
- UI changes: run `npm run dev` when feasible and sanity-check the affected screen manually.
- If a task would benefit from tests, note that the repo currently has Vitest configured in `package.json` but no committed test suite.

## Practical Workflow

- Use `rg` for code search.
- Read the impacted modules first; this codebase relies on direct wiring more than abstraction layers.
- Prefer edits that match the repository's current style and naming.
- Do not add unrelated tooling unless the user asks for it.
