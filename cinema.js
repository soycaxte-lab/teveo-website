(() => {
 const root=document.getElementById('peliculas-series'); if(!root)return;
 const buttons=Array.from(root.querySelectorAll('[data-cinema-filter]'));
 const cards=Array.from(root.querySelectorAll('[data-cinema-kind]'));
 const status=root.querySelector('#cinema-filter-status');
 const labels={all:'Mostrando 5 títulos de ejemplo: 3 películas y 2 series.',movie:'Mostrando 3 películas de ejemplo.',series:'Mostrando 2 series de ejemplo.'};
 for(const button of buttons)button.addEventListener('click',()=>{
  const filter=button.dataset.cinemaFilter;if(!Object.hasOwn(labels,filter))return;
  for(const item of buttons)item.setAttribute('aria-pressed',String(item===button));
  for(const card of cards)card.hidden=filter!=='all'&&card.dataset.cinemaKind!==filter;
  status.textContent=labels[filter];
 });
})();
