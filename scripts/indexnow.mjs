// Avisa a Bing (y otros buscadores IndexNow) de todas las URLs del sitemap.
// Uso:  node scripts/indexnow.mjs            -> envia
//       node scripts/indexnow.mjs --dry-run  -> solo lista lo que enviaria
// Correr DESPUES de cada deploy a produccion. La clave es publica por diseno:
// el archivo /<clave>.txt tiene que estar en vivo antes de enviar.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'www.autonation.com.ec';
const dryRun = process.argv.includes('--dry-run');

const keyFile = readdirSync(root).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error('No encuentro el archivo de clave <32hex>.txt');
const key = keyFile.replace(/\.txt$/, '');
if (readFileSync(join(root, keyFile), 'utf8').trim() !== key) {
  throw new Error('El contenido del archivo de clave no coincide con su nombre');
}

const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
if (!urlList.length) throw new Error('El sitemap no tiene URLs');
if (urlList.some((u) => new URL(u).host !== HOST)) throw new Error('Hay URLs de otro host en el sitemap');

const body = { host: HOST, key, keyLocation: `https://${HOST}/${keyFile}`, urlList };
console.log(`${urlList.length} URLs, keyLocation ${body.keyLocation}`);
if (dryRun) {
  console.log(urlList.join('\n'));
  process.exit(0);
}

// Verificar que la clave esta en vivo antes de enviar
const live = await fetch(body.keyLocation, { cache: 'no-store' });
if (!live.ok || (await live.text()).trim() !== key) {
  throw new Error(`La clave no esta en vivo en ${body.keyLocation} (HTTP ${live.status}). Deployar primero.`);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});
console.log(`IndexNow respondio ${res.status} ${res.statusText}`);
console.log((await res.text()) || '(sin cuerpo)');
// 200 = recibido, 202 = recibido y la clave se valida despues; cualquier otro es error
process.exit(res.status === 200 || res.status === 202 ? 0 : 1);
