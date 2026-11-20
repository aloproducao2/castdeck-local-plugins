// Empacota uma pasta de plugin em .cdplug (ZIP) e imprime o sha256 do pacote.
// Uso: node tools/pack-plugin.mjs plugins/castdeck.luz [saida.cdplug]
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const RAIZ = path.resolve(import.meta.dirname, '..');
const entrada = process.argv[2];
if (!entrada) {
  console.error('uso: node tools/pack-plugin.mjs <pasta-do-plugin> [saida.cdplug]');
  process.exit(1);
}
const pasta = path.isAbsolute(entrada) ? entrada : path.join(RAIZ, entrada);
const manifesto = JSON.parse(fs.readFileSync(path.join(pasta, 'plugin.json'), 'utf8'));
const saida = process.argv[3] || path.join(RAIZ, 'packages', `${manifesto.id}-${manifesto.version}.cdplug`);
fs.mkdirSync(path.dirname(saida), { recursive: true });

const arquivos = [];
const andar = (d, base = '') => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'data', '.git'].includes(e.name)) continue;
    const full = path.join(d, e.name);
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) andar(full, rel);
    else arquivos.push({ nome: rel, dados: fs.readFileSync(full) });
  }
};
andar(pasta);
arquivos.sort((a, b) => a.nome.localeCompare(b.nome));

const crc32 = (buf) => {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
};

const locais = [];
const central = [];
let offset = 0;
for (const a of arquivos) {
  const comp = zlib.deflateRawSync(a.dados);
  const nomeBuf = Buffer.from(a.nome, 'utf8');
  const crc = crc32(a.dados);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x0800, 6); // UTF-8
  local.writeUInt16LE(8, 8); // deflate
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(comp.length, 18);
  local.writeUInt32LE(a.dados.length, 22);
  local.writeUInt16LE(nomeBuf.length, 26);
  locais.push(local, nomeBuf, comp);

  const cen = Buffer.alloc(46);
  cen.writeUInt32LE(0x02014b50, 0);
  cen.writeUInt16LE(20, 4);
  cen.writeUInt16LE(20, 6);
  cen.writeUInt16LE(0x0800, 8);
  cen.writeUInt16LE(8, 10);
  cen.writeUInt32LE(crc, 16);
  cen.writeUInt32LE(comp.length, 20);
  cen.writeUInt32LE(a.dados.length, 24);
  cen.writeUInt16LE(nomeBuf.length, 28);
  cen.writeUInt32LE(offset, 42);
  central.push(cen, nomeBuf);

  offset += local.length + nomeBuf.length + comp.length;
}
const dir = Buffer.concat(central);
const fim = Buffer.alloc(22);
fim.writeUInt32LE(0x06054b50, 0);
fim.writeUInt16LE(arquivos.length, 8);
fim.writeUInt16LE(arquivos.length, 10);
fim.writeUInt32LE(dir.length, 12);
fim.writeUInt32LE(offset, 16);
const zip = Buffer.concat([...locais, dir, fim]);
fs.writeFileSync(saida, zip);
const sha = crypto.createHash('sha256').update(zip).digest('hex');
console.log(JSON.stringify({ arquivo: saida, bytes: zip.length, sha256: sha, plugin: manifesto.id, versao: manifesto.version }));
