# Plugins for AI and agents — authoring contract

> **Audience:** language models and autonomous agents that will **create plugins** for CastDeck Local.
> **How to use:** read this file, call the tools (local API or MCP) and iterate until `validate` + `simulate`
> pass. You do not need a GUI or human approval to create/test — only to **activate** the plugin in the studio
> (the user approves the permissions).

---

## 1. Closed loop (4 calls)

```
castdeck_plugin_docs      → current contract (events, actions, capabilities)
castdeck_plugin_scaffold  → creates the plugin workspace
castdeck_plugin_write     → writes plugin.json (and src/index.js for code plugins)
castdeck_plugin_validate  → errors with code + hint
castdeck_plugin_simulate  → fires events and shows the ACTIONS requested (without touching the studio)
castdeck_plugin_install   → installs into the app
```

Golden rule: **only consider it done when `validate.ok === true` and `simulate.acoes` contains the expected
action**.

## 2. Two plugin types

| Type | What it is | When to use |
|---|---|---|
| `declarative` | just `plugin.json` with `rules` (trigger → action) | chat replies, on-screen notice, media, scene |
| `code` | `src/index.js` with `export default function activate(castdeck)` | external API, complex logic, custom panel |

## 3. Declarative plugin format

```json
{
  "id": "com.you.my-plugin",
  "name": "My plugin",
  "description": "What it does in one sentence",
  "version": "1.0.0",
  "author": { "name": "Your Name" },
  "license": "MIT",
  "engines": { "castdeck": ">=2.0.0", "api": 1 },
  "tier": "declarative",
  "permissions": ["events:chat", "chat:send", "overlay:show"],
  "rules": [
    {
      "on": "chat.comando",
      "comando": "discord",
      "cooldownSeg": 30,
      "do": [
        { "type": "chat.send", "texto": "Join our Discord: discord.gg/example" },
        { "type": "overlay.show", "titulo": "Discord", "texto": "discord.gg/example", "cor": "#5865f2", "segundos": 8 }
      ]
    }
  ]
}
```

Triggers: `chat`, `chat.comando`, `chat.regex`, `chat.contem`, `doacao`, `stage.entrou`, `stage.saiu`,
`scene.mudou`, `live.iniciou`, `live.encerrou`.
Actions: `overlay.show`, `overlay.hide`, `chat.send`, `panel.open`, `sound.play`, `http.request`.
Variables: `{{usuario}}`, `{{texto}}`, `{{arg1}}`, `{{arg2}}`, `{{rede}}`, `{{cena}}`, `{{fonte}}`, `{{titulo}}`.

## 4. Code plugin format

```js
// src/index.js
export default function activate(castdeck) {
  castdeck.events.on('chat', async (m) => {
    if (!/^!attendance\b/i.test(String(m.texto || ''))) return;
    const { url } = castdeck.settings.get();       // only the keys declared in the manifest
    const r = await castdeck.http.post(url, { usuario: m.usuario });
    castdeck.log('sent: ' + r.result.status);
    castdeck.overlay.show({ titulo: 'Attendance', texto: m.usuario + ' checked in' }, 6);
  });
}
```

Injected API: `events.on(name, fn)`, `overlay.show(spec, seconds)`, `overlay.hide()`, `chat.send(text)`,
`http.get(url)`, `http.post(url, body)`, `sound.play(id)`, `panel.open()`, `settings.get()`,
`settings.save(patch)`, `log(text)`, `plugin.dataDir`.

## 5. Permissions (ask only for what you need)

| Permission | Unlocks |
|---|---|
| `events:chat` | read chat messages |
| `events:stage` | know who is on stage and the current scene |
| `events:recording` | know about recordings |
| `overlay:show` | draw a notice on the program |
| `panel:open` | open a custom panel |
| `control:mixer` / `control:scene` / `control:playout` | control audio/scene/media |
| `chat:send` | reply in the studio chat |
| `network:<host>` | call an address (e.g. `network:https://api.example.com`) |
| `storage:own` | write to the plugin folder |

Permissions that require user approval are shown in Portuguese at activation. If you use an action without
the corresponding permission, the action **does not run** — and the simulation shows what is missing.

## 6. Security limits (the app refuses)

- no `.exe`, `.dll`, `.node`, `.bat`, `.cmd`, `.ps1`, `.sh` in the package;
- no `child_process`, `fs`, `net`, `http`, `dns` in the plugin code — use `castdeck.http`;
- no `eval` or `new Function`;
- network only to hosts declared in `network:`;
- SPDX `license` and an `engines.castdeck` compatible with the app;
- package up to 20 MB; a single `plugin.json` at the root.

## 7. Common errors and how to fix them

| Code | Cause | Fix |
|---|---|---|
| `ID_INVALIDO` | id without a dot or with uppercase | `com.you.name` (lowercase) |
| `JSON_INVALIDO` | trailing comma | validate the JSON before writing |
| `SEM_LICENCA` | missing `license` | `"MIT"` |
| `ENGINES_INCOMPATIVEL` | `engines.castdeck` does not cover the version | `">=2.0.0"` |
| `PERMISSAO_INVALIDA` | action without permission | add the action's permission |
| `SEM_ENTRADA` | `entry` points to a missing file | create `src/index.js` |
| `CODIGO_BLOQUEADO` | `require('fs')`, `child_process`, `eval` | use the `castdeck.*` API |
| `ARQUIVO_PROIBIDO` | binary in the package | remove it |
| `SEM_REGRAS` | declarative plugin without `rules` | add at least one rule |

## 8. Access

**Local API** (the app runs at `http://localhost:3000`):
- `GET  /api/plugins/author/docs`
- `GET  /api/plugins/author/templates`
- `POST /api/plugins/author/scaffold` `{ id, tier, name }`
- `PUT  /api/plugins/author/files/<id>` `{ arquivos: [{ arquivo, conteudo }] }`
- `POST /api/plugins/author/validate` `{ id }`
- `POST /api/plugins/author/simulate` `{ id, eventos: [...] }`
- `POST /api/plugins/author/install` `{ id }`
- `GET  /api/plugins` · `GET /api/plugins/<id>/log`

**MCP** (for the agent to use as tools):
```bash
node tools/mcp-plugins.mjs          # CASTDECK_URL defaults to http://127.0.0.1:3000
```
Tools: `castdeck_plugin_docs`, `castdeck_plugin_templates`, `castdeck_plugin_list`,
`castdeck_plugin_scaffold`, `castdeck_plugin_write`, `castdeck_plugin_validate`,
`castdeck_plugin_simulate`, `castdeck_plugin_install`, `castdeck_plugin_status`,
`castdeck_plugin_logs`, `castdeck_plugin_catalog`.

## 9. Example of reasoning that works

1. **Goal:** “when someone enters the stage, show a notice and register it at an endpoint”.
2. `docs` → confirm `stage.entrou` and `overlay.show`.
3. `scaffold { tier: 'code' }` → write `plugin.json` with
   `permissions: ['events:stage','overlay:show','network:https://api.example.com']` and `src/index.js`.
4. `validate` → fix whatever comes back with a code/hint.
5. `simulate { eventos: [{ tipo:'stage', acao:'entrou', fonteNome:'Jane' }] }` → it should list `overlay.show`
   and `http.request`.
6. `install` → ask the user to **activate** it and approve the permissions in the Plugins tab.
