# CastDeck — plugin catalog

[English](README.md) · [Português](README.pt-BR.md)

Free plugins for [CastDeck Local](https://cast.flue.live) — the live streaming studio that runs entirely on
your computer.

The catalog is a **signed JSON index** (`index.json`) served by the app itself. Each plugin is a folder with a
`plugin.json` manifest, code/assets and a `README.md`.

## Official plugins

| Plugin | Type | What it does |
|---|---|---|
| **On-air timer** (`castdeck.timer`) | code (sandboxed) | On-screen countdown for breaks, BRB or exam time; start it from its own panel or with `!timer 5` in chat, and viewers see the time ticking down. |
| **Chat commands** (`castdeck.chat-commands`) | declarative | Answers `!discord`, `!redes` (socials), `!aviso <text>` (notice) and `!ajuda` (help), welcomes newcomers and posts an on-screen notice. |

> The old `castdeck.luz` (smart plug) left the catalog; the example plugin with `network:` and a stage event
> became a test fixture in the app. The timer is the official example of a plugin with a **panel** and a
> **persistent overlay**.

## Install in the app

- **From a file:** Settings → Plugins → *Install from file* (`.cdplug`).
- **From the catalog:** the Plugins tab reads `https://cast.flue.live/plugins/index.json` and installs with
  one click.

## For AI and agents

The catalog is built for AI authoring: read [AGENTS.md](AGENTS.md) and the contract in
[docs/PLUGINS-AGENTES.md](docs/PLUGINS-AGENTES.md), or connect the MCP tools with:

```bash
CASTDECK_URL=http://127.0.0.1:3000 node tools/mcp-plugins.mjs
```

The workflow is **scaffold → write → validate → simulate → install**.

## Publish a plugin (free)

1. Copy a folder from `plugins/` as a base (declarative is just `plugin.json`; code has `src/index.js`).
2. Set `id`, `name`, `version`, `license` and `permissions` (only what is needed).
3. Open a **PR**. CI validates the manifest, runs the security scanner, packages the `.cdplug` and updates
   the signed index.
4. After the merge, the plugin appears in the app.

Rules: no executables in the package (`.exe`, `.dll`, `.node`), no `child_process`/`fs` in the code, network
access only to addresses declared with `network:<address>`, an SPDX license and a compatible
`engines.castdeck`.

## Structure

```
index.json                    catalog index (generated)
schema/plugin-v1.json         manifest schema
tools/build-index.mjs         builds index.json (CI)
tools/cli.mjs                 init/test/pack/index/verify (offline)
tools/mcp-plugins.mjs         MCP server (agent with the app open)
plugins/<id>/plugin.json      manifest
plugins/<id>/src|ui|assets    code and assets
.github/workflows/index.yml   validate → package → sign → publish
```

## Security

Code plugins run **outside** the CastDeck main process, in a separate process, with explicit permissions
approved by whoever installs them. The app shows the permissions in plain language and keeps an audit log.

## License

Each plugin declares its own license. The official ones are AGPL-3.0-only, like CastDeck.
