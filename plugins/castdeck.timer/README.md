# On-air timer (`castdeck.timer`)

[English](README.md) · [Português](README.pt-BR.md)

A countdown **on screen** (and in the recording) for breaks, BRB, exam time or any pause with a “back in”
time. It does not depend on another program: the number is drawn by CastDeck itself, so it appears exactly in
what the audience sees.

## How to use

- **Panel** (Plugins tab → Timer → *Configure*): pick 1, 3, 5 or 10 minutes, or type another time (`7`,
  `2:30`, `90s`). It has **Pause**, **Resume**, **Stop and clear** and **Show on screen**.
- **Chat**: `!timer 5` (minutes), `!timer 1:30`, `!timer 90s`, `!timer pausar` (pause), `!timer continuar`
  (resume), `!timer parar` (stop), `!tempo` (replies with the time left).
- The timer keeps running even if you close the panel; if the plugin restarts, it resumes from where it stopped.

## Settings

| Field | What it does |
|---|---|
| Title | Small text above the clock (e.g. “Back in”) |
| Color | Notice color (`#7c5cff` by default) |
| Chat warning | Sends “time is up” to the studio chat when it reaches zero |
| End screen text | Final message (e.g. “We're back!”) shown for 8 seconds |

## How it works inside (for anyone building their own)

- Permissions: `events:chat` (read commands), `overlay:show` (draw the clock), `chat:send` (reply) and
  `storage:own` (save state in its own `settings.json`).
- The notice uses `castdeck.overlay.show({ titulo, texto, cor, persistente: true })`: **persistent** stays on
  screen until the plugin hides it — the same feature that lets a clock update every second without blinking.
- Panel buttons reach the plugin as a `panel` event:
  `castdeck.events.on('panel', ({ nome, dados }) => ...)`. So the panel knows the time, the plugin saves
  `estado` with `castdeck.settings.save({ estado: { restante, total, rodando } })` (every 5 s and on every
  change).

## Limits

- Maximum time is 180 minutes; minimum is 15 seconds.
- One timer at a time (a new one replaces the previous one).
