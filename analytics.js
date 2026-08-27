function gtag_report_conversion(url) {
  var callback = function () {
    if (typeof(url) != 'undefined') {
      window.location = url;
    }
  };
  gtag('event', 'conversion', {
    'send_to': 'AW-18291866000/VzZbCIvZ2MkcEJDznpJE',
    'event_callback': callback
  });
  return false;
}

function gtag_report_call_click() {
  gtag('event', 'conversion', {
    'send_to': 'AW-18291866000/CALL_CONVERSION_LABEL_PENDIENTE'
  });
}

// Tracking aproximado (sin texto visible al cliente) de clics de WhatsApp que
// vienen de la campaña de Google Ads "Busqueda" (marcada con ?ref=gads en el
// sufijo de URL de la campaña). Se guarda en sessionStorage para que sobreviva
// si el visitante navega a otra página del sitio antes de tocar WhatsApp.
if (location.search.indexOf('ref=gads') !== -1) {
  try { sessionStorage.setItem('ads_ref', 'gads'); } catch (e) {}
}

function report_google_ad_click() {
  var flagged;
  try { flagged = sessionStorage.getItem('ads_ref') === 'gads'; } catch (e) { flagged = false; }
  if (!flagged) return;
  var url = 'https://app.autonation.com.ec/api/tracking/google-click';
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url);
  } else {
    fetch(url, { method: 'POST', keepalive: true }).catch(function () {});
  }
}

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('a[href^="https://wa.me/"]').forEach(function (el) {
    el.addEventListener('click', function () {
      gtag_report_conversion();
      gtag('event', 'click_whatsapp', { page_path: location.pathname });
      report_google_ad_click();
    });
  });
  document.querySelectorAll('.wa-btn').forEach(function (el) {
    el.addEventListener('click', function () {
      gtag_report_conversion();
      gtag('event', 'click_whatsapp', { page_path: location.pathname });
      report_google_ad_click();
      window.open('https://wa.me/593939057454', '_blank');
    });
  });
  document.querySelectorAll('a[href^="tel:"]').forEach(function (el) {
    el.addEventListener('click', function () {
      gtag('event', 'click_llamada', { page_path: location.pathname });
      // gtag_report_call_click(); // activar cuando exista la acción de conversión "Llamada" en Google Ads
    });
  });
});
