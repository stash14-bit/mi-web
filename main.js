const obs = new IntersectionObserver(e => e.forEach(i => {
  if(i.isIntersecting){ i.target.classList.add('visible'); obs.unobserve(i.target); }
}), {threshold:.1});
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

window.addEventListener('scroll', () => {
  const nav = document.getElementById('mainNav');
  const ni = document.getElementById('navInner');
  const logo = document.getElementById('logoImg');
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  if(isMobile){
    return;
  }
  if(window.scrollY > 80){
    nav.style.top = '0';
    ni.style.height = '72px';
    logo.style.height = '56px';
  } else {
    nav.style.top = '35px';
    ni.style.height = '110px';
    logo.style.height = '90px';
  }
});

(function(){
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  if(!toggle || !menu) return;
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.classList.toggle('active', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('open');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded','false');
  }));
})();

document.querySelectorAll(".nav-has-dropdown>a").forEach(a=>a.addEventListener("click",function(e){const li=this.parentElement;const isOpen=li.classList.contains("open");document.querySelectorAll(".nav-has-dropdown.open").forEach(el=>el.classList.remove("open"));if(!isOpen&&window.innerWidth<1025){e.preventDefault();li.classList.add("open")}}));
document.addEventListener("click",e=>{if(!e.target.closest(".nav-has-dropdown"))document.querySelectorAll(".nav-has-dropdown.open").forEach(el=>el.classList.remove("open"))});
