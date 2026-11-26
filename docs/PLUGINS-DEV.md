# Your first plugin — quick guide

[English](PLUGINS-DEV.md) · [Português](PLUGINS-DEV.pt-BR.md)

> Applies to CastDeck **2.0+**. The official catalog is the **`castdeck-local-plugins`** repository;
> plugins are **free**.

## 1. What a plugin is

A folder with `plugin.json` (manifest) and, if it needs logic, a `src/index.js`. Two types:

| Type | When to use | Need code? |
|---|---|---|
| **declarative** (`"tier": "declarative"`) | react to chat/stage/scene with ready-made actions (on-screen notice, chat reply, media) | **no** |
| **code** (`"tier": "code"`) | API integration, complex logic, custom settings | yes (runs in a separate process) |

## 2. Declarative plugin in 3 minutes

`my-plugin/plugin.json`:

```json
{
  "id": "com.you.welcome",
  "name": "Welcome",
  "description": "Replies to people who arrive in chat",
  "version": "1.0.0",
  "author": { "name": "Your Name" },
  "license": "MIT",
  "engines": { "castdeck": ">=2.0.0", "api": 1 },
  "tier": "declarative",
  "permissions": ["events:chat", "chat:send", "overlay:show"],
  "rules": [
    {
      "on": "chat.regex",
      "padrao": "^(hi|hello)\\b",
      "cooldownSeg": 30,
      "do": [
        { "type": "chat.send", "texto": "Hi, {{usuario}}!" },
        { "type": "overlay.show", "titulo": "Welcome", "texto": "{{usuario}} joined", "cor": "#7c5cff", "segundos": 6 }
      ]
    }
  ]
}
```

Triggers: `chat.comando`, `chat.regex`, `chat.contem`, `doacao`, `stage.entrou`, `stage.saiu`, `scene.mudou`,
`live.iniciou`, `live.encerrou`, `gravacao.salva`.
Actions: `chat.send`, `overlay.show`, `overlay.hide`, `media.play`, `sound.play`, `http.request`, `panel.open`.
Variables: `{{usuario}}`, `{{texto}}`, `{{arg1}}`, `{{arg2}}`, `{{rede}}`, `{{cena}}`, `{{titulo}}`.

## 3. Code plugin

`my-plugin/plugin.json` (excerpt):

```json
{ "tier": "code", "entry": "src/index.js",
  "permissions": ["events:stage", "overlay:show", "network:https://api.myschool.com"] }
```

`my-plugin/src/index.js`:

```js
export default function activate(castdeck) {
  castdeck.events.on('stage', async (e) => {
    if (e.acao !== 'entrou') return;
    const r = await castdeck.http.post('https://api.myschool.com/attendance', { who: e.fonteNome });
    castdeck.log('attendance sent: ' + r.result.status);
    castdeck.overlay.show({ titulo: 'Attendance', texto: `${e.fonteNome} joined` }, 6);
  });
}
```

Available API: `castdeck.events.on` (`chat`, `panel`), `castdeck.overlay.show/hide`, `castdeck.chat.send`,
`castdeck.http.get/post` (only to declared `network:` hosts), `castdeck.settings.get/save`, `castdeck.sound.play`,
`castdeck.panel.open`, `castdeck.log`.

**Persistent notice (clock, counter, a theme that stays on screen):**
`castdeck.overlay.show({ titulo, texto, cor, persistente: true })` keeps the box on screen indefinitely; call it
again with new text to update (the official timer does this every second) and `castdeck.overlay.hide()` when done.

**Panel buttons:** the panel calls `pedir('painel', { nome: 'start', dados: { minutos: 5 } })` and the plugin
receives:

```js
castdeck.events.on('panel', async ({ nome, dados }) => {
  if (nome === 'start') await start(dados.minutos);
});
```

Panel methods: `settings.get`, `settings.save`, `painel` (action for the plugin), `doctor` (checklist),
`test` (test-drive) and `log`.

**Diagnostics:** besides the button in the app, `GET /api/plugins/<id>/doctor` returns `{ ok, checks: [{ nome, ok,
detalhe, dica }] }` — the same checklist appears in the “Diagnostics” window and helps agents understand what is
missing without opening the studio.

**Useful manifest metadata:** `events: ["chat", "stage"]` (what the plugin listens to, shown in “About”),
`tags: ["time", "overlay"]` (shown in the catalog) and `category`.

## 4. Test

1. Settings → **Plugins** → *Install from file* (pack the folder into `.cdplug`/`.zip`) or
   `POST /api/plugins/install` with `{ "pasta": "plugins/my-plugin" }` during development.
2. Activate it and **approve the permissions** (shown in Portuguese, with risk).
3. Fire an event (send the message in the connected chat, or join the stage) and check the plugin **Log**.
4. Open **About** (permissions/events) and **Diagnostics** (checklist with hints) before asking for help.

## 5. Security rules (the app refuses if violated)

- no `.exe`, `.dll`, `.node`, `.bat`, `.ps1` in the package;
- no `child_process`, `fs`, `net`, `http` and similar in plugin code (use `castdeck.http`);
- no `eval` / `new Function`;
- network only to declared addresses (`network:http://192.168.0.50`, `network:https://api.example.com`);
- SPDX `license` and a compatible `engines.castdeck`;
- package up to 20 MB.

## 6. Publish to the catalog

The catalog is served at **https://cast.flue.live/plugins/index.json** (an **Ed25519-signed** index). The app
checks the signature before installing; a tampered index is rejected and the app falls back to the offline cache.

PR to `castdeck-local-plugins` → CI validates, packages and signs the index → it appears in the Plugins tab for
everyone.
