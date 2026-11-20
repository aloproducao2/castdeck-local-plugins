# AGENTS.md — plugins do CastDeck para agentes

Este repositório é o catálogo de plugins do **CastDeck Local** e o ponto de partida para um agente criar um
plugin novo.

## Se você é uma IA/agente

1. Leia o contrato completo em [`docs/PLUGINS-AGENTES.md`](docs/PLUGINS-AGENTES.md) (eventos, ações,
   permissões, limites de segurança e tabela de erros).
2. Use as ferramentas MCP (recomendado) ou a API local do app:

```bash
# ferramentas MCP (stdio JSON-RPC) — rode com o CastDeck aberto
CASTDECK_URL=http://127.0.0.1:3000 node tools/mcp-plugins.mjs
```

Ferramentas: `castdeck_plugin_docs`, `castdeck_plugin_templates`, `castdeck_plugin_list`, `castdeck_plugin_scaffold`,
`castdeck_plugin_write`, `castdeck_plugin_validate`, `castdeck_plugin_simulate`, `castdeck_plugin_install`,
`castdeck_plugin_status`, `castdeck_plugin_logs`, `castdeck_plugin_catalog`.

3. Ciclo: **docs → scaffold → write → validate → simulate → install**. Só considere pronto quando `validate.ok`
   for `true` e `simulate.acoes` mostrar a ação esperada.
4. A ativação no estúdio é sempre **decisão do usuário** (ele aprova as permissões). Você não ativa sozinho.

## Sem app aberto (offline)

```bash
node tools/cli.mjs init com.voce.meu-plugin [--code]
node tools/cli.mjs test plugins/com.voce.meu-plugin
node tools/cli.mjs pack plugins/com.voce.meu-plugin
node tools/cli.mjs index
```

## Regras rígidas

- sem binários no pacote (`.exe`, `.dll`, `.node`, `.bat`, `.ps1`, `.sh`);
- sem `child_process`, `fs`, `net`, `http` no código do plugin — use a API `castdeck.http`;
- sem `eval` / `new Function`;
- rede só nos hosts declarados em `permissions` (`network:https://api.exemplo.com`);
- `license` SPDX obrigatória, `engines.castdeck` compatível, pacote até 20 MB;
- id em minúsculas com ponto (`com.voce.meu-plugin`); ids `castdeck.*` são reservados aos oficiais.

## Estrutura

```
index.json                índice do catálogo (assinado no CI)
schema/plugin-v1.json     schema do manifesto
docs/PLUGINS-AGENTES.md   contrato para IA/agente
tools/cli.mjs             init/test/pack/index/verify (offline)
tools/mcp-plugins.mjs     servidor MCP (agente com o app aberto)
tools/pack-plugin.mjs     empacota .cdplug
plugins/<id>/plugin.json  plugins
```

## Publicar (humano)

PR no repositório → CI valida, empacota, assina o índice e publica um Release. Plugins de código passam por
revisão manual antes de aparecer no destaque.
