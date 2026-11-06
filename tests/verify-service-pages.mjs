// Run: node tests/verify-service-pages.mjs (no dependencies).
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
const strip = s => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const attrs = s => Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
for (const slug of ['reparacion-motores-guayaquil', 'cambio-amortiguadores-guayaquil', 'blog/motor-recalentado-que-hacer-guayaquil', 'blog/cuando-cambiar-amortiguadores-guayaquil']) {
  const html = fs.readFileSync(path.join(root, slug, 'index.html'), 'utf8');
  const graph = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const a = attrs(m[1]);
    if (a.type === 'application/ld+json') graph.push(...JSON.parse(m[2])['@graph']);
    else assert(a.src && !m[2].trim(), 'Script ejecutable inline');
  }
  assert(!/\son\w+\s*=/i.test(html), 'Handler inline');
  assert(!html.includes('images.unsplash.com'));
  const ids = new Set(graph.map(x => x['@id']));
  assert(graph.every(x => x['@id']), 'Entidad sin @id');
  for (const m of JSON.stringify(graph).matchAll(/"@id":"([^"]+)"/g)) assert(ids.has(m[1]), m[1]);
  const faq = graph.find(x => x['@type'] === 'FAQPage').mainEntity;
  const visible = [...html.matchAll(/<details class="faq-item">\s*<summary><h3>(.*?)<\/h3><\/summary>\s*<div class="faq-answer">([\s\S]*?)<\/div>\s*<\/details>/g)];
  assert.equal(visible.length, slug.startsWith('reparacion') ? 7 : 5);
  assert.equal(visible.length, faq.length);
  visible.forEach((m, i) => {
    assert.equal(strip(m[1]), faq[i].name);
    assert.equal(strip(m[2]), strip(faq[i].acceptedAnswer.text));
  });
  for (const m of html.matchAll(/<(?:a|link|img|script)\b[^>]*>/g)) {
    const a = attrs(m[0]);
    for (const ref of [a.href, a.src, ...(a.srcset || a.imagesrcset || '').split(',').map(x => x.trim().split(' ')[0])].filter(Boolean)) {
      if (/^(?:https?:|mailto:|tel:|data:|#)/.test(ref)) continue;
      const pathname = ref.split(/[?#]/)[0];
      const target = path.resolve(pathname.startsWith('/') ? root : path.join(root, slug), '.' + (pathname.startsWith('/') ? pathname : '/' + pathname));
      assert(fs.existsSync(target), `Falta ${ref}`);
      if (fs.statSync(target).isDirectory()) assert(fs.existsSync(path.join(target, 'index.html')), ref);
    }
    if (m[0].startsWith('<img')) {
      assert(a.width && a.height && a.decoding === 'async', 'Dimensiones/decoding');
      if (a.id !== 'logoImg' && !(slug.startsWith('blog/') && a.fetchpriority === 'high')) assert.equal(a.loading, 'lazy');
      if (!a.src.endsWith('logo.png')) assert(a.srcset && a.sizes, 'Imagen sin responsive');
    }
    if (a.href?.startsWith('https://wa.me/')) assert(a.href.includes('?text='));
  }
  const headings = [...html.matchAll(/<h([1-6])\b/g)].map(m => +m[1]);
  assert.equal(headings.filter(x => x === 1).length, 1);
  headings.slice(1).forEach((x, i) => assert(x <= headings[i] + 1, 'Salto de heading'));
  assert(html.includes('<main id="main">'));
  assert(attrs(html.match(/<meta name="description"[^>]*>/)[0]).content.length <= 155);
  const title = html.match(/<title>(.*?)<\/title>/)[1];
  assert.equal(graph.find(x => x['@type'] === 'WebPage').name, title);
  assert.equal(attrs(html.match(/<meta property="og:title"[^>]*>/)[0]).content, title);
  for (const file of [slug + '/index.html', slug + '.md']) {
    assert(!/\b(?:ten[eé]s|vos|eleg[ií]s|nafta|decidís|perdés|podés|sentís)\b/iu.test(fs.readFileSync(path.join(root, file), 'utf8')), 'Voseo: ' + file);
  }
  if (slug.startsWith('blog/')) {
    const article = graph.find(x => x['@type'] === 'Article');
    assert.equal(article.datePublished, '2026-11-06');
    assert.equal(article.dateModified, '2026-11-06');
    assert(graph.some(x => x['@type'] === 'Person' && x['@id'] === article.author['@id']), 'Autor resoluble');
    assert(fs.readFileSync(path.join(root, 'about/index.html'), 'utf8').includes('id="luciano-arteaga"'));
    assert(title.length <= 60, 'Title demasiado largo');
    const sectionCount = [...html.matchAll(/<h2\b/g)].length;
    assert(sectionCount >= 6 && sectionCount <= 8, 'Entre 6 y 8 secciones');
    assert.equal(attrs(html.match(/<meta property="og:image:width"[^>]*>/)[0]).content, '1200');
    assert.equal(attrs(html.match(/<meta property="og:image:height"[^>]*>/)[0]).content, '630');
    assert(html.includes('class="tldr"'));
    assert.equal([...html.matchAll(/<img[^>]*fetchpriority="high"/g)].length, 1);
    const md = fs.readFileSync(path.join(root, slug + '.md'), 'utf8');
    faq.forEach(q => { assert(md.includes(q.name)); assert(md.includes(q.acceptedAnswer.text)); });
    console.log(`OK ${slug}: fechas, autor, 6–8 secciones, title, OG, tldr y FAQ Markdown`);
  }
  console.log(`OK ${slug}: JSON.parse, @id, FAQ (${faq.length}), enlaces, imágenes, CSP sin JS inline, headings, SEO y tuteo`);
}
execFileSync('python3', ['-c', 'import xml.etree.ElementTree as E; E.parse("sitemap.xml"); print("OK sitemap.xml bien formado")'], {cwd: root, stdio: 'inherit'});
console.log('TODO OK');
