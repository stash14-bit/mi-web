let current = 1;
const total = document.querySelectorAll('.slide').length;
document.getElementById('total').textContent = total;

function showSlide(n){
  if(n < 1) n = 1;
  if(n > total) n = total;
  current = n;
  document.querySelectorAll('.slide').forEach((s,i)=>{ s.classList.toggle('active', i === n-1); });
  document.getElementById('current').textContent = n;
  document.getElementById('progressBar').style.width = (n/total*100)+'%';
}
function nextSlide(){ showSlide(current+1); }
function prevSlide(){ showSlide(current-1); }

document.addEventListener('keydown', (e)=>{
  if(e.key === 'ArrowRight' || e.key === ' '){ e.preventDefault(); nextSlide(); }
  if(e.key === 'ArrowLeft'){ e.preventDefault(); prevSlide(); }
});
document.addEventListener('click', (e)=>{
  if(!e.target.closest('.nav-controls') && !e.target.closest('a')) nextSlide();
});

new Chart(document.getElementById('downtimeChart'), {
  type: 'bar',
  data: {
    labels: ['Sin agenda\ncorporativa', 'Con Autonation\nFlotas'],
    datasets: [{
      label: 'Horas de inmovilización promedio por visita',
      data: [6, 1.5],
      backgroundColor: ['rgba(212,43,43,0.65)', 'rgba(200,169,81,0.75)'],
      borderRadius: 4,
      barThickness: 70
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display:false }, ticks: { color: '#B8B8D0', font:{family:"'Barlow Condensed', sans-serif", size:12} } },
      y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#B8B8D0' }, title:{display:true,text:'Horas',color:'#9a9a9a'} }
    }
  }
});

showSlide(1);

document.getElementById('prev-slide').addEventListener('click', prevSlide);
document.getElementById('next-slide').addEventListener('click', nextSlide);
