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
