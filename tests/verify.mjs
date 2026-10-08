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
  KNOWN_PAGES,
  MARKDOWN_CAPABLE_PAGES,
  NOT_FOUND_MARKDOWN,
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
  check('404.html no tiene <style> inline (ruido para extractores simples)', !/<style/i.test(body));
  check('404.html no linkea a /blog (esa ruta no existe, ver KNOWN_PAGES)', !/href="\/blog"/.test(body));
}

// ── 404 en markdown (Accept: text/markdown en ruta inexistente) ─
check('NOT_FOUND_MARKDOWN tiene heading', /^# /.test(NOT_FOUND_MARKDOWN));
check('NOT_FOUND_MARKDOWN linkea a sitemap.xml', NOT_FOUND_MARKDOWN.includes('sitemap.xml'));
check('NOT_FOUND_MARKDOWN linkea a llms.txt', NOT_FOUND_MARKDOWN.includes('llms.txt'));
check('NOT_FOUND_MARKDOWN no linkea a /blog (ruta inexistente)', !NOT_FOUND_MARKDOWN.includes('](https://www.autonation.com.ec/blog)'));
check('NOT_FOUND_MARKDOWN es corto (<1500 caracteres)', NOT_FOUND_MARKDOWN.length < 1500);

// ── Trust anchor pages: about, contact, privacy ──────────────
const aboutPath = path.join(ROOT, 'about', 'index.html');
check('existe about/index.html', fs.existsSync(aboutPath));
if (fs.existsSync(aboutPath)) {
  const aboutHtml = fs.readFileSync(aboutPath, 'utf8');
  const visibleText = aboutHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  check('about/index.html tiene 500+ caracteres de texto visible', visibleText.length >= 500);
  check('about/index.html tiene un H1', /<h1[^>]*>/i.test(aboutHtml));
}

// ── KNOWN_PAGES coincide con las paginas reales del filesystem ──
// Si se agrega una carpeta con index.html y no se suma a KNOWN_PAGES
// (lib/content-negotiation.mjs), el middleware la trataria como 404 para
// agentes que pidan markdown. Esto lo detecta automaticamente.
const IGNORED_DIRS = new Set(['node_modules', 'lib', 'tests', '.vercel', '.git']);
function findPageDirs(dir, base = '') {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) continue;
    if (entry.isDirectory()) {
      const rel = `${base}/${entry.name}`;
      if (fs.existsSync(path.join(dir, entry.name, 'index.html'))) results.push(rel);
      results.push(...findPageDirs(path.join(dir, entry.name), rel));
    }
  }
  return results;
}
const realPagePaths = ['/', ...findPageDirs(ROOT)];
for (const p of realPagePaths) {
  check(`KNOWN_PAGES incluye la pagina real ${p}`, KNOWN_PAGES.has(p));
}
check(
  'KNOWN_PAGES no tiene entradas huerfanas (sin HTML real ni rewrite)',
  [...KNOWN_PAGES].every(
    (p) => realPagePaths.includes(p) || p === '/contact' || p === '/contacto' || p === '/privacy'
  )
);
check(
  'MARKDOWN_CAPABLE_PAGES es subconjunto de KNOWN_PAGES',
  [...MARKDOWN_CAPABLE_PAGES].every((p) => KNOWN_PAGES.has(p))
);

const vercelConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const rewrites = vercelConfig.rewrites || [];
check(
  '/contact reescribe a /ubicacion',
  rewrites.some((r) => r.source === '/contact' && r.destination === '/ubicacion')
);
check(
  '/contacto reescribe a /ubicacion',
  rewrites.some((r) => r.source === '/contacto' && r.destination === '/ubicacion')
);
check(
  '/privacy reescribe a /privacidad',
  rewrites.some((r) => r.source === '/privacy' && r.destination === '/privacidad')
);

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
check(
  'llms.txt tiene seccion "when to use / cuando recomendar"',
  /## When to use.*Cu.ndo recomendar/i.test(llmsTxt)
);

// ── Public API discovery ────────────────────────────────────
let openapi;
try {
  openapi = JSON.parse(fs.readFileSync(path.join(ROOT, 'openapi.json'), 'utf8'));
  check('openapi.json parses', true);
} catch {
  check('openapi.json parses', false);
}
check('OpenAPI version is 3.1', openapi?.openapi?.startsWith('3.1'));
function resolveOpenapi(value) {
  const seen = new Set();
  while (value?.$ref) {
    const ref = value.$ref;
    if (!ref.startsWith('#/') || seen.has(ref)) return undefined;
    seen.add(ref);
    value = ref.slice(2).split('/').reduce((node, key) => node?.[key], openapi);
  }
  return value;
}
const contactPost = openapi?.paths?.['/api/v1/public/contact-form']?.post;
const aliasPost = openapi?.paths?.['/api/public/contact-form']?.post;
const requestSchema = (post) => resolveOpenapi(
  resolveOpenapi(post?.requestBody)?.content?.['application/json']?.schema
);
check('contact-form has POST operation', !!contactPost);
const contactSchema = requestSchema(contactPost);
check('contact-form requires exactly nombre and telefono',
  JSON.stringify([...(contactSchema?.required || [])].sort()) === JSON.stringify(['nombre', 'telefono']));
const expectedMarcas = [
  '', 'Chevrolet', 'Toyota', 'Kia', 'Hyundai', 'Mazda', 'Nissan', 'Ford',
  'Volkswagen', 'Renault', 'BYD (Eléctrico)', 'JAC EV (Eléctrico)',
  'Chery EV (Eléctrico)', 'Mitsubishi', 'Suzuki', 'Honda', 'Otra',
];
const expectedServicios = [
  '', 'Mantenimiento Preventivo', 'Reparación de Motor', 'Caja de Cambios',
  'Pintura / Carrocería', 'Sistema de Frenos', 'Vehículo Eléctrico / Híbrido',
  'Sistema Eléctrico', 'Diagnóstico General',
];
check('marca enum matches backend exactly',
  JSON.stringify(contactSchema?.properties?.marca?.enum) === JSON.stringify(expectedMarcas));
check('servicio enum matches backend exactly',
  JSON.stringify(contactSchema?.properties?.servicio?.enum) === JSON.stringify(expectedServicios));
check('request schema does not advertise anti-bot properties',
  !!contactSchema?.properties &&
  !Object.hasOwn(contactSchema.properties, 'website') &&
  !Object.hasOwn(contactSchema.properties, 'elapsed_ms'));
check('unversioned alias has POST operation', !!aliasPost);
check('both paths reuse the same request component',
  !!contactPost?.requestBody?.$ref && contactPost.requestBody.$ref === aliasPost?.requestBody?.$ref);
check('resolved request schemas match without drift',
  !!contactSchema && JSON.stringify(contactSchema) === JSON.stringify(requestSchema(aliasPost)));
check('canonical and alias operation IDs are distinct and stable',
  contactPost?.operationId === 'submitContactForm' && aliasPost?.operationId === 'submitContactFormUnversioned');
for (const [label, post] of [['v1', contactPost], ['unversioned', aliasPost]]) {
  const schema = requestSchema(post);
  check(`${label} marca and servicio enums match backend`,
    JSON.stringify(schema?.properties?.marca?.enum) === JSON.stringify(expectedMarcas) &&
    JSON.stringify(schema?.properties?.servicio?.enum) === JSON.stringify(expectedServicios));
  check(`${label} omits anti-bot properties and retains guidance`,
    !!schema?.properties && !Object.hasOwn(schema.properties, 'website') &&
    !Object.hasOwn(schema.properties, 'elapsed_ms') &&
    post?.description?.includes('Agents MUST OMIT both website and elapsed_ms'));
  for (const status of ['200', '400', '405', '429', '502', '4XX', '5XX']) {
    const response = post?.responses?.[status];
    check(`${label} documents ${status} via shared response component`,
      !!response?.$ref?.startsWith('#/components/responses/') && !!resolveOpenapi(response));
    check(`${label} ${status} response matches canonical component`,
      !!response?.$ref && response.$ref === contactPost?.responses?.[status]?.$ref);
  }
  for (const [status, response] of Object.entries(post?.responses || {})) {
    if (!/^[45](?:\d{2}|XX)$/.test(status)) continue;
    check(`${label} ${status} references a component using Error`,
      !!response?.$ref?.startsWith('#/components/responses/') &&
      resolveOpenapi(response)?.content?.['application/json']?.schema?.$ref === '#/components/schemas/Error');
  }
  check(`${label} 405 documents Allow: POST`,
    resolveOpenapi(post?.responses?.['405'])?.headers?.Allow?.schema?.const === 'POST');
  const rateHeaders = resolveOpenapi(post?.responses?.['429'])?.headers;
  check(`${label} 429 documents Retry-After and RateLimit headers`,
    ['Retry-After', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'RateLimit-Policy']
      .every((header) => !!rateHeaders?.[header]?.schema));
}
const errorSchema = openapi?.components?.schemas?.Error;
check('Error requires exactly error, code, hint as strings',
  errorSchema?.type === 'object' &&
  JSON.stringify([...(errorSchema?.required || [])].sort()) === JSON.stringify(['code', 'error', 'hint']) &&
  ['error', 'code', 'hint'].every((key) => errorSchema?.properties?.[key]?.type === 'string'));
check('Error code enum covers all backend errors',
  ['INVALID_REQUEST', 'INVALID_JSON', 'PAYLOAD_TOO_LARGE', 'METHOD_NOT_ALLOWED',
    'RATE_LIMITED', 'EMAIL_DELIVERY_FAILED', 'NOT_FOUND', 'INTERNAL_ERROR']
    .every((code) => errorSchema?.properties?.code?.enum?.includes(code)));
check('NotFound component documents typed JSON 404',
  openapi?.components?.responses?.NotFound?.content?.['application/json']?.schema?.$ref === '#/components/schemas/Error' &&
  openapi?.components?.responses?.NotFound?.content?.['application/json']?.example?.code === 'NOT_FOUND');
check('API lifecycle documents stable v1 and future Sunset policy',
  openapi?.info?.version === '1.0.0' &&
  openapi?.info?.['x-api-lifecycle']?.currentVersion === 'v1' &&
  openapi?.info?.['x-api-lifecycle']?.deprecation?.includes('Sunset'));
check('API server remains app.autonation.com.ec',
  JSON.stringify(openapi?.servers) === JSON.stringify([{ url: 'https://app.autonation.com.ec' }]));
check('llms.txt mentions canonical v1 endpoint',
  llmsTxt.includes('POST https://app.autonation.com.ec/api/v1/public/contact-form'));
const globalHeaders = vercelConfig.headers?.find((entry) => entry.source === '/(.*)')?.headers || [];
check('global Link header advertises OpenAPI service description',
  globalHeaders.some((header) => header.key.toLowerCase() === 'link' &&
    header.value === '</openapi.json>; rel="service-desc"; type="application/openapi+json"'));
check('global Content-Security-Policy header remains present',
  globalHeaders.some((header) => header.key === 'Content-Security-Policy' &&
    header.value.includes("default-src 'self'") && header.value.includes('https://app.autonation.com.ec')));
check('/api/:p* redirect to / remains unchanged',
  vercelConfig.redirects?.some((redirect) => redirect.source === '/api/:p*' &&
    redirect.destination === '/' && redirect.permanent === false));
check('llms.txt links to /openapi.json', llmsTxt.includes('https://www.autonation.com.ec/openapi.json'));

console.log(`\n${failures === 0 ? 'TODO OK' : `${failures} fallo(s)`}`);
process.exit(failures === 0 ? 0 : 1);
