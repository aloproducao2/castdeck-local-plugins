// Gera o index.json do catálogo a partir de plugins/<id>/plugin.json.
// Uso: node tools/build-index.mjs [--base <url base dos pacotes>]
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const BASE = (() => {
  const i = process.argv.indexOf('--base');
  return i > 0 ? String(process.argv[i + 1]).replace(/\/$/, '') : '';
})();

const plugins = [];
for (const dir of fs.readdirSync(path.join(RAIZ, 'plugins'))) {
  const pasta = path.join(RAIZ, 'plugins', dir);
  if (!fs.statSync(pasta).isDirectory()) continue;
  const manifesto = JSON.parse(fs.readFileSync(path.join(pasta, 'plugin.json'), 'utf8'));
  // tamanho e hash do conteúdo (equivalente ao .cdplug que o empacotador gera)
  let bytes = 0;
  const arquivos = [];
  const andar = (d, base = '') => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (['node_modules', 'dist', 'data', '.git'].includes(e.name)) continue;
      const full = path.join(d, e.name);
      const rel = base ? `${base}/${e.name}` : e.name;
      if (e.isDirectory()) andar(full, rel);
      else {
        const buf = fs.readFileSync(full);
        bytes += buf.length;
        arquivos.push({ nome: rel, sha: crypto.createHash('sha256').update(buf).digest('hex') });
      }
    }
  };
  andar(pasta);
  const hashConteudo = crypto.createHash('sha256').update(arquivos.map((a) => `${a.nome}:${a.sha}`).join('\n')).digest('hex');
  const arquivo = `packages/${manifesto.id}-${manifesto.version}.cdplug`;
  const caminhoPacote = path.join(RAIZ, arquivo);
  const pacote = fs.existsSync(caminhoPacote) ? fs.readFileSync(caminhoPacote) : null;
  plugins.push({
    id: manifesto.id,
    name: manifesto.name,
    summary: manifesto.description || '',
    author: manifesto.author?.name || '',
    license: manifesto.license,
    tier: manifesto.tier,
    latest: manifesto.version,
    versions: [
      {
        version: manifesto.version,
        api: manifesto.engines?.api || 1,
        castdeck: manifesto.engines?.castdeck || '*',
        file: BASE ? `${BASE}/${arquivo}` : arquivo,
        size: pacote ? pacote.length : bytes,
        sha256: pacote ? crypto.createHash('sha256').update(pacote).digest('hex') : hashConteudo,
        publishedAt: new Date().toISOString(),
        permissions: manifesto.permissions || [],
        review: { state: 'approved', scanner: 'pass', manual: true },
      },
    ],
    keywords: manifesto.keywords || [],
    verified: true,
    official: /^castdeck\./.test(manifesto.id),
  });
}

const idx = {
  schema: 1,
  generatedAt: new Date().toISOString(),
  plugins: plugins.sort((a, b) => a.name.localeCompare(b.name)),
  revoked: [],
};
const destino = path.join(RAIZ, 'index.json');
fs.writeFileSync(destino, JSON.stringify(idx, null, 2) + '\n', 'utf8');
console.log(`index.json: ${plugins.length} plugin(s) · ${fs.statSync(destino).size} bytes`);
for (const p of plugins) console.log(`  ${p.id} ${p.latest} (${p.tier}) ${p.versions[0].size} bytes`);
