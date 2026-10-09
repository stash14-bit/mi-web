// Content negotiation: sirve la variante Markdown de una pagina (o del 404)
// cuando el cliente (agente/IA) manda `Accept: text/markdown` con prioridad
// >= text/html. Requisito Ora/acceptmarkdown.com: la respuesta debe declarar
// `Vary: Accept, Accept-Encoding` para que un CDN no mezcle variantes cacheadas.
import { rewrite, next } from '@vercel/functions';
import { isApiPath, apiNotFoundResponse } from './lib/api-not-found.mjs';
import {
  VARY,
  KNOWN_PAGES,
  MARKDOWN_CAPABLE_PAGES,
  NOT_FOUND_MARKDOWN,
  prefersMarkdown,
  markdownPathFor,
} from './lib/content-negotiation.mjs';

// El bundler de Routing Middleware exige que `matcher` sea un array literal
// estatico (no acepta spread ni referencias a variables) para poder
// extraerlo sin ejecutar el modulo. Corre en TODAS las rutas menos assets
// estaticos (imagenes, css, js, xml, txt, json, md, etc.) para poder detectar
// paths inexistentes y ofrecerles un 404 en markdown. La lista de paginas
// reales vive en lib/content-negotiation.mjs (KNOWN_PAGES / MARKDOWN_ROUTES);
// si se agrega una pagina nueva hay que sumarla ahi (tests/verify.mjs lo
// valida contra el filesystem).
export const config = {
  runtime: 'nodejs',
  matcher: [
    '/((?!img/|.*\\.(?:css|js|mjs|json|xml|txt|webmanifest|md|png|jpg|jpeg|webp|svg|ico)$).*)',
  ],
};

export default function middleware(request) {
  const url = new URL(request.url);
  if (isApiPath(url.pathname)) return apiNotFoundResponse();
  const accept = request.headers.get('accept');
  const wantsMarkdown = prefersMarkdown(accept);
  const isKnown = KNOWN_PAGES.has(url.pathname);

  if (!isKnown) {
    // Ruta que no existe en el sitio. Si el cliente pidio markdown, le damos
    // un 404 real con cuerpo markdown y links de recuperacion. Si no, dejamos
    // que Vercel siga su flujo normal (sirve 404.html tal cual hoy).
    if (wantsMarkdown) {
      return new Response(NOT_FOUND_MARKDOWN, {
        status: 404,
        headers: { 'Content-Type': 'text/markdown; charset=utf-8', Vary: VARY },
      });
    }
    return next({ headers: { Vary: VARY } });
  }

  // Pagina conocida sin variante .md (about, ubicacion, privacidad, flotas,
  // contact, privacy) -> nunca reescribir, solo agregar Vary.
  if (wantsMarkdown && MARKDOWN_CAPABLE_PAGES.has(url.pathname)) {
    const mdUrl = new URL(markdownPathFor(url.pathname), request.url);
    return rewrite(mdUrl, {
      headers: { 'Content-Type': 'text/markdown; charset=utf-8', Vary: VARY },
    });
  }

  return next({ headers: { Vary: VARY } });
}
