# Chat commands

[English](README.md) · [Português](README.pt-BR.md)

A **declarative** plugin (no code): answers chat commands with a message, an on-screen notice or media.

## Example commands (edit them in `plugin.json`)

| Command | What it does |
|---|---|
| `!discord` | replies in chat with the Discord link and shows the notice on screen for 8 s |
| `!redes` | replies in chat with the live's social links |
| `!aviso <text>` | shows the text as a large notice on the program |
| `oi` / `olá` | welcomes whoever arrives (45 s cooldown per person) |

## How to customize

Each item in `rules` has:

- `on`: `chat.comando` (with `comando`), `chat.regex` (with `padrao`) or `chat.contem` (with `texto`);
- `cooldownSeg`: minimum interval per person (prevents spam);
- `do`: list of actions — `chat.send`, `overlay.show`, `media.play`, `sound.play`.

Variables available in the text: `{{usuario}}`, `{{texto}}`, `{{arg1}}`, `{{arg2}}`, `{{rede}}`.

## Permissions

- `events:chat` — read messages (required to react);
- `chat:send` — reply in chat;
- `overlay:show` — draw the notice on the program.

License: AGPL-3.0-only (part of CastDeck).
