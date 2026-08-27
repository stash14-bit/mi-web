// Content negotiation: sirve la variante Markdown de una pagina cuando el
// cliente (agente/IA) manda `Accept: text/markdown` con prioridad >= text/html.
// Requisito Ora/acceptmarkdown.com: la respuesta debe declarar
// `Vary: Accept, Accept-Encoding` para que un CDN no mezcle variantes cacheadas.
import { rewrite, next } from '@vercel/functions';
import {
  VARY,
  MARKDOWN_ROUTES,
  prefersMarkdown,
  markdownPathFor,
} from './lib/content-negotiation.mjs';

export const config = {
  matcher: [...MARKDOWN_ROUTES, '/blog/:slug*'],
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
