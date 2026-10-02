(function(){
  const loadedAt = Date.now();
  const button = document.getElementById('cf-submit');
  if(!button) return;

  const status = document.getElementById('cf-status');
  const nombre = document.getElementById('f-nombre');
  const telefono = document.getElementById('f-telefono');
  const marca = document.getElementById('f-marca');
  const servicio = document.getElementById('f-servicio');
  const mensaje = document.getElementById('f-mensaje');
  const website = document.getElementById('cf-website');
  const errorMessage = 'No pudimos enviar tu solicitud. Escríbenos por WhatsApp.';

  function showStatus(message, success){
    status.textContent = message;
    status.style.color = success ? '#4ade80' : '#f87171';
  }

  button.addEventListener('click', async function(){
    if(button.disabled) return;
    const payload = {
      nombre: nombre.value.trim(),
      telefono: telefono.value.trim(),
      marca: marca.selectedIndex > 0 ? marca.value : '',
      servicio: servicio.selectedIndex > 0 ? servicio.value : '',
      mensaje: mensaje.value.trim(),
      website: website.value,
      elapsed_ms: Date.now() - loadedAt
    };
    if(payload.nombre.length < 2 || payload.telefono.replace(/\D/g, '').length < 7){
      showStatus('Revisa tu nombre y teléfono.', false);
      return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Enviando…';
    status.textContent = '';
    let timeout;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch('https://app.autonation.com.ec/api/public/contact-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        signal: controller.signal,
        body: JSON.stringify(payload)
      });
      if(res.ok){
        showStatus('¡Solicitud enviada! Te contactaremos pronto.', true);
        nombre.value = telefono.value = mensaje.value = website.value = '';
        marca.selectedIndex = servicio.selectedIndex = 0;
        if(typeof gtag === 'function'){
          try {
            gtag('event', 'form_submit_contacto', { page_path: location.pathname });
          } catch (analyticsError) {
            // Analytics must not change the result of a successful submission.
          }
        }
      } else {
        showStatus(res.status === 429 ? 'Demasiados intentos. Escríbenos por WhatsApp.' : errorMessage, false);
      }
    } catch (error) {
      showStatus(errorMessage, false);
    } finally {
      clearTimeout(timeout);
      button.disabled = false;
      button.textContent = originalText;
    }
  });
})();
