export function isApiPath(pathname) {
  return pathname === '/api' || pathname.startsWith('/api/');
}

export const API_NOT_FOUND_BODY = {
  error: 'No encontrado',
  code: 'NOT_FOUND',
  hint: 'Este sitio no expone API en esta ruta. La API publica vive en https://app.autonation.com.ec/api/v1/public/contact-form. Documentacion: https://www.autonation.com.ec/openapi.json',
};

export function apiNotFoundResponse() {
  return new Response(JSON.stringify(API_NOT_FOUND_BODY), {
    status: 404,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
