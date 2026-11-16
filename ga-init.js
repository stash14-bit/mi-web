window.dataLayer = window.dataLayer || [];
// Solo se envian datos a Google desde el sitio real (autonation.com.ec y subdominios).
// En localhost, vistas previas de Vercel y otros hosts gtag() no envia nada.
var GA_PROD = /(^|[.])autonation[.]com[.]ec$/.test(location.hostname);
function gtag(){
  if (GA_PROD) { dataLayer.push(arguments); return; }
  // fuera de produccion: no enviar, pero respetar event_callback para no romper la navegacion
  var o = arguments[2];
  if (o && typeof o.event_callback === 'function') setTimeout(o.event_callback, 0);
}
gtag('js', new Date());
gtag('config', 'AW-18291866000');
gtag('config', 'G-WJ7V8Z5JNK');
