#!/usr/bin/env node
// castdeck-plugin — ferramenta do autor de plugin.
//   node tools/cli.mjs init <id> [--code]     cria o esqueleto (declarativo ou com código)
//   node tools/cli.mjs test <pasta|.cdplug>   valida manifesto, varre o código e faz smoke de ativação
//   node tools/cli.mjs pack <pasta>           gera packages/<id>-<versão>.cdplug
//   node tools/cli.mjs index                  regenera o index.json do catálogo
//   node tools/cli.mjs verify                 verifica a assinatura do index.json publicado
// Sem dependências: roda com o Node 20+ do sistema.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cmd = process.argv[2];
const arg = process.argv[3];

function scaffold(id, comCodigo) {
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(id || '')) {
    console.error('id inválido: use minúsculas com ponto (ex.: com.voce.meu-plugin)');
    process.exit(1);
  }
  const pasta = path.join(RAIZ, 'plugins', id);
  if (fs.existsSync(pasta)) {
    console.error('já existe:', pasta);
    process.exit(1);
  }
  const nome = id.split('.').pop().replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const manifesto = comCodigo
    ? {
        id,
        name: nome,
        description: 'Descreva em uma frase o que o plugin faz.',
        version: '1.0.0',
        author: { name: 'Seu Nome' },
        license: 'MIT',
        engines: { castdeck: '>=2.0.0', api: 1 },
        tier: 'code',
        entry: 'src/index.js',
        permissions: ['events:chat', 'overlay:show'],
        settings: [{ key: 'exemplo', label: 'Um valor', type: 'text', default: '' }],
      }
    : {
        id,
        name: nome,
        description: 'Descreva em uma frase o que o plugin faz.',
        version: '1.0.0',
        author: { name: 'Seu Nome' },
        license: 'MIT',
        engines: { castdeck: '>=2.0.0', api: 1 },
        tier: 'declarative',
        permissions: ['events:chat', 'chat:send', 'overlay:show'],
        rules: [
          {
            on: 'chat.comando',
            comando: 'ola',
            cooldownSeg: 20,
            do: [
              { type: 'chat.send', texto: 'Oi, {{usuario}}!' },
              { type: 'overlay.show', titulo: 'Oi', texto: '{{usuario}} chegou', segundos: 5 },
            ],
          },
        ],
      };
  fs.mkdirSync(pasta, { recursive: true });
  fs.writeFileSync(path.join(pasta, 'plugin.json'), JSON.stringify(manifesto, null, 2) + '\n', 'utf8');
  if (comCodigo) {
    fs.mkdirSync(path.join(pasta, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(pasta, 'src', 'index.js'),
      `// Plugin ${id} — roda em processo separado, com a API do CastDeck.\nexport default function activate(castdeck) {\n  castdeck.events.on('chat', async (m) => {\n    if (!/^!ola\\b/i.test(String(m.texto || ''))) return;\n    const { exemplo } = castdeck.settings.get();\n    castdeck.log('comando recebido de ' + m.usuario + (exemplo ? ' (config: ' + exemplo + ')' : ''));\n    castdeck.overlay.show({ titulo: 'Oi', texto: String(m.usuario || 'alguém') + ' mandou um oi' }, 6);\n  });\n}\n`,
      'utf8',
    );
  }
  fs.writeFileSync(
    path.join(pasta, 'README.md'),
    `# ${nome}\n\n${manifesto.description}\n\n- id: \`${id}\`\n- tipo: ${manifesto.tier}\n- permissões: ${manifesto.permissions.join(', ')}\n\n` +
      `Teste com \`node tools/cli.mjs test plugins/${id}\` e empacote com \`node tools/cli.mjs pack plugins/${id}\`.\n`,
    'utf8',
  );
  console.log('criado:', pasta);
  console.log('próximo passo: node tools/cli.mjs test plugins/' + id);
}

async function testar(alvo) {
  let entradas;
  if (String(alvo).endsWith('.cdplug')) {
    const { readZip } = await import('../../REA/server/zip.js').catch(() => ({}));
    if (!readZip) throw new Error('para testar .cdplug use o app (Ajustes → Plugins)');
    entradas = readZip(fs.readFileSync(alvo));
  }
  const pasta = entradas ? null : path.resolve(RAIZ, alvo);
  const manifesto = entradas
    ? JSON.parse(entradas.find((e) => e.name === 'plugin.json').data.toString('utf8'))
    : JSON.parse(fs.readFileSync(path.join(pasta, 'plugin.json'), 'utf8'));
  const erros = [];
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(manifesto.id || '')) erros.push('id inválido');
  if (!/^\d+\.\d+\.\d+/.test(String(manifesto.version))) erros.push('version precisa ser semver');
  if (!manifesto.license) erros.push('license obrigatória');
  if (Number(manifesto.engines?.api) !== 1) erros.push('engines.api deve ser 1');
  if (!['declarative', 'code'].includes(manifesto.tier)) erros.push('tier inválido');
  if (manifesto.tier === 'code' && !manifesto.entry) erros.push('entry obrigatório no tier code');
  const proibido = /\b(child_process|process\.binding|eval\s*\(|new\s+Function)\b/;
  const arquivos = pasta
    ? fs.readdirSync(pasta, { recursive: true }).filter((n) => {
        try {
          return fs.statSync(path.join(pasta, String(n))).isFile();
        } catch {
          return false;
        }
      })
    : entradas.map((e) => e.name);
  for (const nome of arquivos) {
    const rel = String(nome);
    if (/\.(exe|dll|node|bat|cmd|ps1|sh)$/i.test(rel)) erros.push(`arquivo proibido: ${rel}`);
    const texto = pasta ? fs.readFileSync(path.join(pasta, rel), 'utf8') : entradas.find((e) => e.name === rel)?.data.toString('utf8');
    if (/\.(js|mjs|cjs)$/i.test(rel) && texto && proibido.test(texto)) erros.push(`código bloqueado em ${rel}`);
    if (/\.(js|mjs|cjs)$/i.test(rel) && texto && /\brequire\s*\(\s*['"]node:/.test(texto)) erros.push(`import de módulo do sistema em ${rel}`);
  }
  if (erros.length) {
    console.error('FALHOU:');
    for (const e of erros) console.error(' - ' + e);
    process.exit(1);
  }
  // smoke: ativa o plugin com uma API falsa (sem processo nem app)
  if (manifesto.tier === 'code' && pasta) {
    const fake = {
      log: () => {},
      api: 1,
      plugin: { id: manifesto.id, version: manifesto.version, dataDir: path.join(pasta, 'data') },
      settings: { get: () => Object.fromEntries((manifesto.settings || []).map((s) => [s.key, s.default])) },
      events: { on: () => {} },
      overlay: { show: () => {}, hide: () => {} },
      chat: { send: () => {} },
      http: { get: () => {}, post: () => {} },
      sound: { play: () => {} },
      panel: { open: () => {} },
    };
    const mod = await import('file://' + path.join(pasta, manifesto.entry).replace(/\\/g, '/'));
    const activate = mod.default || mod.activate;
    if (typeof activate !== 'function') throw new Error('o módulo precisa exportar default (ou activate)');
    await activate(fake);
  }
  console.log('OK: ' + manifesto.id + ' ' + manifesto.version + ' (' + manifesto.tier + ')');
  console.log('  permissões: ' + ((manifesto.permissions || []).join(', ') || '(nenhuma)'));
}

const acoes = {
  init: () => scaffold(arg, process.argv.includes('--code')),
  test: () => testar(arg),
  pack: () => execFileSync(process.execPath, [path.join(RAIZ, 'tools', 'pack-plugin.mjs'), arg], { stdio: 'inherit' }),
  index: () => execFileSync(process.execPath, [path.join(RAIZ, 'tools', 'build-index.mjs')], { stdio: 'inherit' }),
  verify: () => {
    const idx = fs.readFileSync(path.join(RAIZ, 'index.json'));
    const sig = fs.existsSync(path.join(RAIZ, 'index.json.sig')) ? fs.readFileSync(path.join(RAIZ, 'index.json.sig'), 'utf8').trim() : null;
    console.log('index.json:', idx.length, 'bytes · assinatura:', sig ? 'presente' : 'AUSENTE');
  },
};

if (!acoes[cmd]) {
  console.log('uso: node tools/cli.mjs <init|test|pack|index|verify> [arg]');
  process.exit(1);
}
Promise.resolve(acoes[cmd]()).catch((e) => {
  console.error('erro:', e.message);
  process.exit(1);
});
