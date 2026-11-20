#!/usr/bin/env node
// Servidor MCP (Model Context Protocol) para IAs/agentes criarem plugins do CastDeck.
//
//   node tools/mcp-plugins.mjs            (usa CASTDECK_URL, padrão http://127.0.0.1:3000)
//
// Fala JSON-RPC por stdio (uma mensagem JSON por linha). Ferramentas:
//   castdeck_plugin_docs        contrato: eventos, ações, capacidades, regras
//   castdeck_plugin_templates   modelos prontos (declarativo e código)
//   castdeck_plugin_list        plugins no workspace de autoria
//   castdeck_plugin_scaffold    cria o esqueleto de um plugin
//   castdeck_plugin_write       grava/atualiza arquivos do plugin
//   castdeck_plugin_validate    valida manifesto + código (erros com código e dica)
//   castdeck_plugin_simulate    dispara eventos sintéticos e vê as ações pedidas
//   castdeck_plugin_install     instala o plugin no app (do workspace)
//   castdeck_plugin_status      estado dos plugins instalados
//   castdeck_plugin_logs        últimas linhas do log de um plugin
//   castdeck_plugin_catalog     catálogo oficial (index assinado)
import fs from 'node:fs';

const BASE = (process.env.CASTDECK_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const log = (...a) => process.stderr.write(a.join(' ') + '\n');

async function chamarApp(rota, opt = {}) {
  const r = await fetch(BASE + '/api' + rota, {
    method: opt.method || 'GET',
    headers: { 'content-type': 'application/json' },
    body: opt.body ? JSON.stringify(opt.body) : undefined,
  });
  const texto = await r.text();
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {}
  if (!r.ok) {
    const msg = json?.error || `HTTP ${r.status}`;
    const err = new Error(msg);
    err.json = json;
    throw err;
  }
  return json ?? texto;
}

const FERRAMENTAS = [
  {
    name: 'castdeck_plugin_docs',
    description: 'Contrato dos plugins do CastDeck: eventos, ações, capacidades, formato das regras, variáveis e regras de segurança. Comece por aqui.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'castdeck_plugin_templates',
    description: 'Modelos prontos de plugin (declarativo e com código) para copiar.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'castdeck_plugin_list',
    description: 'Lista os plugins no workspace de autoria (id, nome, versão, tipo).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'castdeck_plugin_scaffold',
    description: 'Cria o esqueleto de um plugin no workspace (plugin.json + README, e src/index.js se for código).',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', description: 'id reverso-DNS em minúsculas, ex.: com.voce.meu-plugin' },
        tier: { type: 'string', enum: ['declarative', 'code'], default: 'declarative' },
        name: { type: 'string', description: 'nome visível do plugin' },
      },
    },
  },
  {
    name: 'castdeck_plugin_write',
    description: 'Grava arquivos do plugin (cria pastas). Use para escrever plugin.json e src/index.js.',
    inputSchema: {
      type: 'object',
      required: ['id', 'arquivos'],
      properties: {
        id: { type: 'string' },
        arquivos: {
          type: 'array',
          items: {
            type: 'object',
            required: ['arquivo', 'conteudo'],
            properties: { arquivo: { type: 'string' }, conteudo: { type: 'string' } },
          },
        },
      },
    },
  },
  {
    name: 'castdeck_plugin_validate',
    description: 'Valida o plugin (manifesto, permissões, código proibido, entry). Devolve erros com código e dica para corrigir.',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
  },
  {
    name: 'castdeck_plugin_simulate',
    description: 'Test-drive: dispara eventos sintéticos (chat, palco, cena...) e devolve as ações que o plugin pediria, sem tocar no estúdio.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        eventos: {
          type: 'array',
          description: 'ex.: [{ "tipo": "chat", "usuario": "ana", "texto": "!oi" }]',
          items: { type: 'object' },
        },
        segundos: { type: 'number', description: 'espera extra após os eventos (só plugin de código)' },
      },
    },
  },
  {
    name: 'castdeck_plugin_install',
    description: 'Instala o plugin do workspace no CastDeck (depois ative e aprove as permissões na aba Plugins).',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
  },
  {
    name: 'castdeck_plugin_status',
    description: 'Estado dos plugins instalados no app (ativo, rodando, permissões, erro).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'castdeck_plugin_logs',
    description: 'Últimas linhas do log de um plugin instalado (ajuda a depurar).',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
  },
  {
    name: 'castdeck_plugin_catalog',
    description: 'Catálogo oficial de plugins (índice assinado): ids, versões e permissões.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
];

async function executar(nome, args = {}) {
  switch (nome) {
    case 'castdeck_plugin_docs':
      return chamarApp('/plugins/author/docs');
    case 'castdeck_plugin_templates':
      return chamarApp('/plugins/author/templates');
    case 'castdeck_plugin_list':
      return chamarApp('/plugins/author');
    case 'castdeck_plugin_scaffold':
      return chamarApp('/plugins/author/scaffold', { method: 'POST', body: { id: args.id, tier: args.tier || 'declarative', name: args.name || '' } });
    case 'castdeck_plugin_write':
      return chamarApp(`/plugins/author/files/${encodeURIComponent(args.id)}`, { method: 'PUT', body: { arquivos: args.arquivos || [] } });
    case 'castdeck_plugin_validate':
      return chamarApp('/plugins/author/validate', { method: 'POST', body: { id: args.id } });
    case 'castdeck_plugin_simulate':
      return chamarApp('/plugins/author/simulate', { method: 'POST', body: { id: args.id, eventos: args.eventos, segundos: args.segundos } });
    case 'castdeck_plugin_install':
      return chamarApp('/plugins/author/install', { method: 'POST', body: { id: args.id } });
    case 'castdeck_plugin_status': {
      const r = await chamarApp('/plugins');
      return { total: r.total, ativos: r.ativos, plugins: (r.lista || []).map((p) => ({ id: p.id, nome: p.nome, versao: p.versao, ativo: p.ativo, rodando: p.rodando, erro: p.erro, permissoes: p.permissoes })) };
    }
    case 'castdeck_plugin_logs': {
      const r = await fetch(`${BASE}/api/plugins/${encodeURIComponent(args.id)}/log`);
      return { id: args.id, log: await r.text() };
    }
    case 'castdeck_plugin_catalog':
      return chamarApp('/plugins/catalog');
    default:
      throw new Error('ferramenta desconhecida: ' + nome);
  }
}

// ---------- JSON-RPC por stdio ----------
const responder = (id, result) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
const responderErro = (id, code, message) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  let i;
  while ((i = buffer.indexOf('\n')) >= 0) {
    const linha = buffer.slice(0, i).trim();
    buffer = buffer.slice(i + 1);
    if (!linha) continue;
    let msg;
    try {
      msg = JSON.parse(linha);
    } catch {
      continue;
    }
    const { id, method, params } = msg;
    try {
      if (method === 'initialize') {
        responder(id, {
          protocolVersion: params?.protocolVersion || '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'castdeck-plugins', version: '1.0.0' },
          instructions:
            'Ferramentas para criar plugins do CastDeck. Fluxo: castdeck_plugin_docs → castdeck_plugin_scaffold → castdeck_plugin_write → castdeck_plugin_validate → castdeck_plugin_simulate → castdeck_plugin_install. Plugins declarativos são JSON; plugins de código usam "export default function activate(castdeck)".',
        });
      } else if (method === 'tools/list') {
        responder(id, { tools: FERRAMENTAS });
      } else if (method === 'tools/call') {
        const nome = params?.name;
        try {
          const resultado = await executar(nome, params?.arguments || {});
          responder(id, { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }], isError: false });
        } catch (e) {
          responder(id, { content: [{ type: 'text', text: JSON.stringify({ erro: e.message, detalhe: e.json || null }) }], isError: true });
        }
      } else if (method === 'ping') {
        responder(id, {});
      } else if (method === 'notifications/initialized') {
        // notificação: sem resposta
      } else {
        responderErro(id, -32601, 'método não suportado: ' + method);
      }
    } catch (e) {
      responderErro(id, -32603, e.message);
    }
  }
});
process.stdin.on('end', () => process.exit(0));

log(`castdeck-plugins MCP pronto · app: ${BASE}`);
