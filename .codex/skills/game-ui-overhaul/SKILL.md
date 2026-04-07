---
name: game-ui-overhaul
description: Use when continuing UI work in this repository and the goal is to preserve the existing premium studio-night visual direction across management screens, result flows, and combat presentation instead of inventing a new style from scratch.
---

# Game UI Overhaul

Use this when editing UI in this repository.

## Visual Thesis

- Mood: studio-night, cinematic, deliberate, slightly dramatic.
- Material: warm paper panels over dark stage-like backgrounds.
- Accent logic: gold for emphasis, blue for operational information, green for positive state, red for danger.
- Typography: serif for titles, sans for interface, mono for numbers and combat values.

## What Already Exists

- Management and flow screens use a dark backdrop with warm glass-like panels.
- Title, setup, daily, shop, recruit, and result screens already follow this system.
- Combat uses Phaser canvas UI with a darker battle stage, premium HUD chrome, stronger enemy presentation, and richer card visuals.

## Rules For Future UI Work

- Do not revert to plain centered cards on flat backgrounds.
- Keep a strong left-side narrative or summary block on flow and result screens when the page has enough space.
- Prefer a small number of large regions over many small widgets.
- Keep numbers highly readable and visually distinct from descriptive text.
- Use motion to reinforce hierarchy: hover lift, reveal, emphasis, and victory/defeat staging.
- Avoid generic SaaS dashboard styling and default component-library aesthetics.

## Layout Patterns

### Management screens

- Use a strong top summary with resources and context.
- Split the page into main workspace and secondary sidebar.
- Main area should contain the primary decision surface.
- Sidebar should hold team state, passive effects, logs, or supporting context.

### Flow and setup screens

- Use `flow-screen`, `flow-shell`, `flow-side`, `flow-main`, `flow-panel`, and `flow-hero`.
- Left side explains stakes and heuristics.
- Right side contains the actual decisions and CTA.

### Result screens

- Use `result-screen`, `result-shell`, `result-side`, `result-main`, and `result-panel`.
- Left side summarizes what just happened.
- Right side breaks down finance, status, rewards, and next action.

### Combat UI

- Keep the battlefield dark and theatrical.
- HUD should feel embedded in the stage, not pasted on top.
- Enemy intent must be instantly scannable.
- Cards should clearly communicate playability, type, and cost at a glance.
- Victory and defeat should land as short, dramatic stage moments.

## File Targets

- DOM UI styles: `src/ui/styles/main.css`
- DOM screens: `src/ui/screens/*.ts`
- Phaser combat UI: `src/scenes/CombatScene.ts`

## Working Method

1. Preserve the current visual family unless the user explicitly asks for a new direction.
2. Extend existing classes and patterns before adding one-off inline styling.
3. For daily/management interactions, prefer partial updates over full-screen rerenders when possible.
4. For combat, improve visuals without changing combat rules unless asked.
5. After meaningful UI changes, run:

```bash
npm run typecheck
npm run build
```

## Good Requests For This Skill

- “Continue the current UI style on the remaining screens.”
- “Bring the card selection and equipment selection pages in line with the new visual system.”
- “Make the combat HUD more premium without changing gameplay.”
- “Polish the remaining modal and popup UI to match the current art direction.”
