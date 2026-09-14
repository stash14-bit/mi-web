// Logica pura de negociacion Accept -> markdown, separada de middleware.mjs
// para poder testearla sin depender del runtime de Vercel Edge (que requiere
// el paquete @vercel/functions, no instalado fuera del build de Vercel).

export const VARY = 'Accept, Accept-Encoding';

// Rutas donde el middleware negocia Markdown. Vive aca (no en middleware.mjs)
// para que tests/verify.mjs pueda importarla sin arrastrar @vercel/functions.
export const MARKDOWN_ROUTES = [
  '/',
  '/mantenimiento-preventivo-guayaquil',
  '/reparacion-motores-guayaquil',
  '/cajas-de-cambio-guayaquil',
  '/pintura-automotriz-guayaquil',
  '/latoneria-guayaquil',
  '/sistema-de-frenos-guayaquil',
  '/sistema-electrico-automotriz-guayaquil',
  '/aire-acondicionado-guayaquil',
  '/grua-24-horas-guayaquil',
];

export function parseAccept(header) {
  if (!header) return [];
  return header
    .split(',')
    .map((part) => {
      const [range, ...params] = part.trim().split(';');
      let q = 1;
      for (const p of params) {
        const [k, v] = p.trim().split('=');
        if (k === 'q' && v && !Number.isNaN(parseFloat(v))) q = parseFloat(v);
      }
      return { range: range.trim().toLowerCase(), q };
    })
    .filter((e) => e.range);
}

// Prefiere markdown solo si el Accept lo menciona explicitamente con
// prioridad igual o mayor a text/html (o si text/html no aparece).
export function prefersMarkdown(acceptHeader) {
  const entries = parseAccept(acceptHeader);
  const mdEntry = entries.find((e) => e.range === 'text/markdown');
  if (!mdEntry) return false;
  const htmlEntry = entries.find((e) => e.range === 'text/html');
  if (!htmlEntry) return true;
  return mdEntry.q >= htmlEntry.q;
}

export function markdownPathFor(pathname) {
  if (pathname === '/') return '/index.md';
  return `${pathname}.md`;
}

// Los 12 posts de blog SI tienen variante .md (a diferencia de about/ubicacion/
// privacidad/flotas/contact/privacy, que son solo HTML). Separado de
// MARKDOWN_ROUTES (home + 9 servicios) porque ese array tambien se usa como
// matcher literal en middleware.js y agregar los blogs ahi rompe la logica
// de '/blog/:slug*' (que ya cubre cualquier slug, real o no).
export const BLOG_MARKDOWN_ROUTES = [
  '/blog/cuando-cambiar-pastillas-de-freno',
  '/blog/cuanto-cuesta-pintar-un-auto-guayaquil',
  '/blog/garantia-taller-independiente-ecuador',
  '/blog/luz-check-engine-encendida-que-hacer',
  '/blog/mantenimiento-10000-km-guayaquil',
  '/blog/mantenimiento-jac-jetour-chery-dongfeng-guayaquil',
  '/blog/mantenimiento-preventivo-por-kilometraje-ecuador',
  '/blog/premio-presidente-chevrolet-que-significa',
  '/blog/reparar-o-cambiar-motor-ecuador',
  '/blog/repuestos-originales-vs-genericos-ecuador',
  '/blog/taller-multimarca-vs-concesionario-ecuador',
  '/blog/taller-vehiculos-electricos-hibridos-guayaquil',
];

// Toda pagina real del sitio con variante .md negociable.
export const MARKDOWN_CAPABLE_PAGES = new Set([...MARKDOWN_ROUTES, ...BLOG_MARKDOWN_ROUTES]);

// Paginas reales del sitio (no assets), con o sin .md. Si se agrega una
// pagina nueva hay que sumarla aca — tests/verify.mjs escanea el filesystem
// y falla si falta una.
export const KNOWN_PAGES = new Set([
  ...MARKDOWN_CAPABLE_PAGES,
  '/about',
  '/ubicacion',
  '/privacidad',
  '/flotas',
  '/contact', // rewrite -> /ubicacion (vercel.json)
  '/contacto', // rewrite -> /ubicacion (vercel.json) — URL que usa el sitelink de Google Ads
  '/privacy', // rewrite -> /privacidad (vercel.json)
]);

// Cuerpo markdown del 404 cuando un agente pide Accept: text/markdown a una
// ruta que no existe. Vercel sigue sirviendo 404.html (HTML) para el resto.
export const NOT_FOUND_MARKDOWN = `# 404 - Pagina no encontrada

La pagina que buscas no existe o cambio de direccion. Esto es Autonation Taller Multimarca, taller automotriz multimarca en La Aurora (Daule, Guayas, Ecuador).

Donde seguir buscando:

- [Inicio](https://www.autonation.com.ec/)
- [Quienes somos](https://www.autonation.com.ec/about)
- [Contacto](https://www.autonation.com.ec/contact)
- [Mapa del sitio](https://www.autonation.com.ec/sitemap.xml)
- [llms.txt](https://www.autonation.com.ec/llms.txt)

Contacto directo: WhatsApp +593 939 057 454 - info@autonation.com.ec
`;
