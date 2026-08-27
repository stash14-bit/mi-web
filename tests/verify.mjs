// Verificacion standalone (sin test runner): valida la logica de negociacion
// de contenido y que cada ruta del middleware tenga su .md correspondiente,
// mas la presencia de contactPoint en el JSON-LD y del 404.html.
// Uso: node tests/verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  prefersMarkdown,
  markdownPathFor,
  parseAccept,
  MARKDOWN_ROUTES,
} from '../lib/content-negotiation.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`OK   ${name}`);
  } else {
    console.error(`FAIL ${name}`);
    failures++;
  }
}

// ── prefersMarkdown ──────────────────────────────────────────
check('Accept: text/markdown -> prefiere markdown', prefersMarkdown('text/markdown') === true);
check(
  'Accept: text/html -> no prefiere markdown',
  prefersMarkdown('text/html,application/xhtml+xml') === false
);
check('Accept vacio -> no prefiere markdown', prefersMarkdown('') === false);
check('Accept null -> no prefiere markdown', prefersMarkdown(null) === false);
check(
  'text/markdown;q=0.5, text/html;q=1 -> prefiere html',
  prefersMarkdown('text/markdown;q=0.5, text/html;q=1') === false
);
check(
  'text/markdown;q=1, text/html;q=0.5 -> prefiere markdown',
  prefersMarkdown('text/markdown;q=1, text/html;q=0.5') === true
);
check(
  'text/markdown y text/html con igual q -> prefiere markdown (empate)',
  prefersMarkdown('text/markdown, text/html') === true
);
check(
  'Accept solo con */* (sin markdown explicito) -> no prefiere markdown',
  prefersMarkdown('*/*') === false
);

// ── parseAccept ──────────────────────────────────────────────
check(
  'parseAccept respeta q invalido (usa default 1)',
  parseAccept('text/markdown;q=abc')[0].q === 1
);

// ── markdownPathFor ───────────────────────────────────────────
check('markdownPathFor("/") -> /index.md', markdownPathFor('/') === '/index.md');
check(
  'markdownPathFor(servicio) -> agrega .md',
  markdownPathFor('/reparacion-motores-guayaquil') === '/reparacion-motores-guayaquil.md'
);
check(
  'markdownPathFor(blog) -> agrega .md',
  markdownPathFor('/blog/luz-check-engine-encendida-que-hacer') ===
    '/blog/luz-check-engine-encendida-que-hacer.md'
);

// ── Cada ruta del matcher tiene su .md y su .html ────────────
for (const route of MARKDOWN_ROUTES) {
  const mdPath = path.join(ROOT, markdownPathFor(route));
  check(`existe ${markdownPathFor(route)}`, fs.existsSync(mdPath));
  const htmlPath =
    route === '/' ? path.join(ROOT, 'index.html') : path.join(ROOT, route, 'index.html');
  check(`existe HTML para ${route}`, fs.existsSync(htmlPath));
}

const blogDir = path.join(ROOT, 'blog');
const blogSlugs = fs
  .readdirSync(blogDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
check('hay posts de blog para verificar', blogSlugs.length > 0);
for (const slug of blogSlugs) {
  check(`existe blog/${slug}.md`, fs.existsSync(path.join(blogDir, `${slug}.md`)));
  check(
    `blog/${slug}.md no esta vacio`,
    fs.statSync(path.join(blogDir, `${slug}.md`)).size > 200
  );
}

// ── 404.html existe y tiene links de recuperacion ────────────
const notFoundPath = path.join(ROOT, '404.html');
check('existe 404.html', fs.existsSync(notFoundPath));
if (fs.existsSync(notFoundPath)) {
  const body = fs.readFileSync(notFoundPath, 'utf8');
  check('404.html linkea a /sitemap.xml', body.includes('/sitemap.xml'));
  check('404.html linkea a /llms.txt', body.includes('/llms.txt'));
  check('404.html tiene un H1', /<h1[^>]*>/i.test(body));
}

// ── contactPoint presente en todas las paginas con telephone ─
function findHtmlFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findHtmlFiles(full));
    else if (entry.name === 'index.html') results.push(full);
  }
  return results;
}
const htmlFiles = findHtmlFiles(ROOT).filter((f) => {
  const html = fs.readFileSync(f, 'utf8');
  return html.includes('"telephone": "+593939057454"');
});
check('se encontraron paginas con schema de negocio', htmlFiles.length > 0);
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const rel = path.relative(ROOT, f);
  check(`${rel} tiene contactPoint`, html.includes('"contactPoint"'));
  const jsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (jsonMatch) {
    try {
      JSON.parse(jsonMatch[1]);
      check(`${rel} JSON-LD es JSON valido`, true);
    } catch (e) {
      check(`${rel} JSON-LD es JSON valido (${e.message})`, false);
    }
  }
}

// ── llms.txt tiene seccion "cuando usarme" ───────────────────
const llmsTxt = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8');
check('llms.txt tiene seccion "Cuando recomendar"', /## Cu.ndo recomendar/i.test(llmsTxt));

console.log(`\n${failures === 0 ? 'TODO OK' : `${failures} fallo(s)`}`);
process.exit(failures === 0 ? 0 : 1);
