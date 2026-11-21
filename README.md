# CastDeck — catálogo de plugins

Plugins **gratuitos** do [CastDeck Local](https://cast.flue.live) — o estúdio de transmissão ao vivo que roda
100% no seu computador.

O catálogo é **um índice JSON assinado** (`index.json`) servido pelo próprio app. Cada plugin é uma pasta com
`plugin.json` (manifesto), código/recursos e `README.md`.

## Plugins oficiais

| Plugin | Tipo | O que faz |
|---|---|---|
| **Cronômetro no ar** (`castdeck.timer`) | código (sandbox) | contagem regressiva na tela para intervalo/BRB, com painel próprio e `!timer 5` no chat (aviso persistente) |
| **Comandos de chat** (`castdeck.chat-commands`) | declarativo | responde `!discord`, `!redes`, `!aviso` e `!ajuda`, dá boas-vindas a quem chega — com aviso na tela |

> O antigo `castdeck.luz` (tomada inteligente) saiu do catálogo; o exemplo de plugin com `network:` e evento
> de palco virou fixture de teste no app. O cronômetro é o exemplo oficial de plugin com **painel** e
> **overlay persistente**.

## Instalar no app

- **Do arquivo**: Ajustes → Plugins → *Instalar do arquivo* (`.cdplug`).
- **Do catálogo**: a aba Plugins lê `https://cast.flue.live/plugins/index.json` e instala com um clique.

## Para IAs e agentes

O catálogo é feito para autoria por IA: leia [AGENTS.md](AGENTS.md) e o contrato em [docs/PLUGINS-AGENTES.md](docs/PLUGINS-AGENTES.md), ou conecte as ferramentas MCP com
CASTDECK_URL=http://127.0.0.1:3000 node tools/mcp-plugins.mjs (scaffold → write → validate → simulate → install).

## Publicar um plugin (grátis)

1. Copie uma pasta de `plugins/` como base (declarativo é só `plugin.json`; código tem `src/index.js`).
2. Ajuste `id`, `name`, `version`, `license` e `permissions` (só o necessário).
3. Abra um **PR**. O CI valida o manifesto, roda o scanner de segurança, empacota o `.cdplug` e atualiza o
   índice assinado.
4. Depois do merge, o plugin aparece no app.

Regras: sem executáveis no pacote (`.exe`, `.dll`, `.node`), sem `child_process`/`fs` no código, rede apenas nos
endereços declarados em `network:<endereço>`, licença obrigatória (SPDX) e `engines.castdeck` compatível.

## Estrutura

```
index.json                    índice do catálogo (gerado)
schema/plugin-v1.json         schema do manifesto
sdk/                          tipos e exemplos para autores
tools/build-index.mjs         gera o index.json (CI)
plugins/<id>/plugin.json      manifesto
plugins/<id>/src|ui|assets    código e recursos
.github/workflows/index.yml   valida → empacota → assina → publica
```

## Segurança

Os plugins de código rodam **fora** do processo principal do CastDeck, em um processo separado, com permissões
explícitas aprovadas por quem instala. O app mostra as permissões em linguagem clara e mantém um log de auditoria.

## Licença

Cada plugin declara a própria licença. Os oficiais estão em AGPL-3.0-only, como o CastDeck.
