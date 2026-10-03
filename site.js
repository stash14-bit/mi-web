(function () {
// Año dinámico en footer
const year = document.getElementById('fyear');
if (year) year.textContent = new Date().getFullYear();
// Lazy-load imágenes below-the-fold
if('IntersectionObserver' in window){
  document.querySelectorAll('img[data-src]').forEach(img=>{
    new IntersectionObserver((e,o)=>{if(e[0].isIntersecting){img.src=img.dataset.src;o.disconnect()}},{rootMargin:'200px'}).observe(img);
  });
}
document.addEventListener('click', function (event) {
  const trigger = event.target.closest('[data-scroll-to]');
  if (!trigger) return;
  const target = document.getElementById(trigger.getAttribute('data-scroll-to'));
  if (target) target.scrollIntoView({behavior:'smooth'});
});
})();
