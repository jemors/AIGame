---
name: 'develop-web-game'
description: 'Use when Codex is building or iterating on a web game (HTML/JS) and needs a reliable development + testing loop: implement small changes, run a Playwright-based test script with short input bursts and intentional pauses, inspect screenshots/text, and review console errors with render_game_to_text.'
---

# Develop Web Game

Local project mirror of the globally installed `develop-web-game` skill.

Build games in small steps and validate every change. Treat each iteration as: implement -> act -> pause -> observe -> adjust.

## Skill paths (set once)

```bash
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export WEB_GAME_CLIENT="$CODEX_HOME/skills/develop-web-game/scripts/web_game_playwright_client.js"
export WEB_GAME_ACTIONS="$CODEX_HOME/skills/develop-web-game/references/action_payloads.json"
```

User-scoped skills install under `$CODEX_HOME/skills` (default: `~/.codex/skills`).

## Workflow

1. Pick a goal. Define a single feature or behavior to implement.
2. Implement small. Make the smallest change that moves the game forward.
3. Ensure integration points. Provide a single canvas and `window.render_game_to_text` so the test loop can read state.
4. Add `window.advanceTime(ms)`. Strongly prefer a deterministic step hook so the Playwright script can advance frames reliably; without it, automated tests can be flaky.
5. Initialize `progress.md`. If `progress.md` exists, read it first and confirm the original user prompt is recorded at the top (prefix with `Original prompt:`). Also note any TODOs and suggestions left by the previous agent. If missing, create it and write `Original prompt: <prompt>` at the top before appending updates.
6. Verify Playwright availability. Ensure `playwright` is available (local dependency or global install). If unsure, check `npx` first.
7. Run the Playwright test script. You must run `$WEB_GAME_CLIENT` after each meaningful change; do not invent a new client unless required.
8. Use the payload reference. Base actions on `$WEB_GAME_ACTIONS` to avoid guessing keys.
9. Inspect state. Capture screenshots and text state after each burst.
10. Inspect screenshots. Open the latest screenshot, verify expected visuals, fix any issues, and rerun the script. Repeat until correct.
11. Verify controls and state. Exhaustively exercise important interactions and confirm `render_game_to_text` matches the visible state.
12. Check errors. Review console errors and fix the first new issue before continuing.
13. Reset between scenarios. Avoid cross-test state when validating distinct features.
14. Iterate with small deltas. Change one variable at a time, then repeat until stable.

Example command:

```bash
node "$WEB_GAME_CLIENT" --url http://localhost:5173 --actions-file "$WEB_GAME_ACTIONS" --click-selector "#start-btn" --iterations 3 --pause-ms 250
```

## Test Checklist

- Primary movement or interaction inputs
- Win/lose transitions
- Score, health, or resource changes
- Boundary conditions
- Menu, pause, or start flow if present
- Any special actions tied to the request

## Test Artifacts To Review

- Latest screenshots from the Playwright run
- Latest `render_game_to_text` JSON output
- Console error logs

You must actually inspect screenshots after running the script. If the screenshots are wrong, the build is wrong.

## Core Game Guidelines

### Canvas + Layout

- Prefer a single canvas centered in the window.

### Visuals

- Keep on-screen text minimal; show controls on a start or menu screen rather than overlaying them during play.
- Avoid overly dark scenes unless the design calls for it.
- Draw the background on the canvas itself instead of relying on CSS backgrounds.

### Text State Output (`render_game_to_text`)

Expose a `window.render_game_to_text` function that returns a concise JSON string representing the current game state.

Minimal pattern:

```js
function renderGameToText() {
  const payload = {
    mode: state.mode,
    player: { x: state.player.x, y: state.player.y, r: state.player.r },
    entities: state.entities.map((e) => ({ x: e.x, y: e.y, r: e.r })),
    score: state.score,
  };
  return JSON.stringify(payload);
}
window.render_game_to_text = renderGameToText;
```

### Time Stepping Hook

Provide `window.advanceTime(ms)` so the Playwright client can step frames deterministically.

Minimal pattern:

```js
window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i++) update(1 / 60);
  render();
};
```

### Fullscreen Toggle

- Use a single key, preferably `f`, to toggle fullscreen.
- Allow `Esc` to exit fullscreen.
- When fullscreen toggles, resize rendering so visuals and input mapping stay correct.

## Progress Tracking

Create or maintain `progress.md` so another agent can continue the work. Preserve the original prompt at the top.

## Playwright Prerequisites

- Prefer a local `playwright` dependency if the project already has it.
- If unsure whether Playwright is available, check for `npx`.
- Do not switch to `@playwright/test` unless explicitly asked.

## Scripts

- `$WEB_GAME_CLIENT`: Playwright-based action loop with virtual-time stepping, screenshot capture, and console error buffering.

## References

- `$WEB_GAME_ACTIONS`: example action payloads for keyboard and mouse bursts.
