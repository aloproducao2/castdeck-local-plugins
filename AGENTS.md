# AGENTS.md — CastDeck plugins for agents

[English](AGENTS.md) · [Português](AGENTS.pt-BR.md)

This repository is the plugin catalog for **CastDeck Local** and the starting point for an agent to create a
new plugin.

## If you are an AI/agent

1. Read the full contract in [`docs/PLUGINS-AGENTES.md`](docs/PLUGINS-AGENTES.md) (events, actions,
   permissions, security limits and error table).
2. Use the MCP tools (recommended) or the app's local API:

```bash
# MCP tools (stdio JSON-RPC) — run with CastDeck open
CASTDECK_URL=http://127.0.0.1:3000 node tools/mcp-plugins.mjs
```

Tools: `castdeck_plugin_docs`, `castdeck_plugin_templates`, `castdeck_plugin_list`,
`castdeck_plugin_scaffold`, `castdeck_plugin_write`, `castdeck_plugin_validate`,
`castdeck_plugin_simulate`, `castdeck_plugin_install`, `castdeck_plugin_status`,
`castdeck_plugin_logs`, `castdeck_plugin_catalog`.

3. Workflow: **docs → scaffold → write → validate → simulate → install**. Only consider it done when
   `validate.ok` is `true` and `simulate.acoes` shows the expected action.
4. Activation in the studio is always the **user's decision** (they approve the permissions). You do not
   activate it yourself.

## Without the app open (offline)

```bash
node tools/cli.mjs init com.you.my-plugin [--code]
node tools/cli.mjs test plugins/com.you.my-plugin
node tools/cli.mjs pack plugins/com.you.my-plugin
node tools/cli.mjs index
```

## Hard rules

- no binaries in the package (`.exe`, `.dll`, `.node`, `.bat`, `.ps1`, `.sh`);
- no `child_process`, `fs`, `net`, `http` in plugin code — use the `castdeck.http` API;
- no `eval` / `new Function`;
- network only to hosts declared in `permissions` (`network:https://api.example.com`);
- mandatory SPDX `license`, compatible `engines.castdeck`, package up to 20 MB;
- lowercase dotted id (`com.you.my-plugin`); `castdeck.*` ids are reserved for official plugins.

## Structure

```
index.json                catalog index (signed in CI)
schema/plugin-v1.json     manifest schema
docs/PLUGINS-AGENTES.md   contract for AI/agents
tools/cli.mjs             init/test/pack/index/verify (offline)
tools/mcp-plugins.mjs     MCP server (agent with the app open)
tools/pack-plugin.mjs     packages the .cdplug
plugins/<id>/plugin.json  plugins
```

## Publishing (human)

PR to the repository → CI validates, packages, signs the index and publishes a Release. Code plugins go
through manual review before appearing in the featured section.
