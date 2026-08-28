// Content negotiation: sirve la variante Markdown de una pagina cuando el
// cliente (agente/IA) manda `Accept: text/markdown` con prioridad >= text/html.
// Requisito Ora/acceptmarkdown.com: la respuesta debe declarar
// `Vary: Accept, Accept-Encoding` para que un CDN no mezcle variantes cacheadas.
import { rewrite, next } from '@vercel/functions';
import { VARY, prefersMarkdown, markdownPathFor } from './lib/content-negotiation.mjs';

// El bundler de Routing Middleware exige que `matcher` sea un array literal
// estatico (no acepta spread ni referencias a variables) para poder
// extraerlo sin ejecutar el modulo. La lista maestra de rutas vive en
// lib/content-negotiation.mjs (MARKDOWN_ROUTES) y la usa tests/verify.mjs;
// si se agrega una pagina nueva, hay que actualizar los dos lugares.
export const config = {
  runtime: 'nodejs',
  matcher: [
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
    '/blog/:slug*',
  ],
};

export default function middleware(request) {
  const url = new URL(request.url);
  const accept = request.headers.get('accept');

  if (prefersMarkdown(accept)) {
    const mdUrl = new URL(markdownPathFor(url.pathname), request.url);
    return rewrite(mdUrl, {
      headers: { 'Content-Type': 'text/markdown; charset=utf-8', Vary: VARY },
    });
  }

  return next({ headers: { Vary: VARY } });
}
