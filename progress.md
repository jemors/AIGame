Original prompt: 我希望把战斗场景的ui也优化一下，需要足够炫酷。

- 2026-04-07: Started combat UI redesign pass using frontend-skill + develop-web-game guidance.
- Goal: make the combat scene look more cinematic and premium without changing combat rules.
- Focus areas: HUD hierarchy, enemy presentation, card presentation, intent readability, and battle-result feel.
- Known constraint: current combat scene is Phaser canvas-based, so the fastest path is improving Canvas HUD rather than introducing a separate DOM combat UI layer.
- Implemented a first combat UI pass in `src/scenes/CombatScene.ts`: darker theatrical battlefield, premium HUD chrome, stronger enemy presentation, redesigned cards, and more dramatic victory/defeat overlays.
- Validation completed with `npm run typecheck` and `npm run build`.
- Playwright-specific verification was not run in this pass because the repo does not currently include `playwright` and the combat scene does not expose the `render_game_to_text` / `advanceTime` hooks expected by the installed web-game skill.
