(() => {
 const root=document.getElementById('peliculas-series'); if(!root)return;
 const buttons=Array.from(root.querySelectorAll('[data-cinema-filter]'));
 const status=root.querySelector('#cinema-filter-status'),grid=root.querySelector('#cinema-posters');
 let active='all';
 const labels={all:'Mostrando 10 títulos de ejemplo: 5 películas y 5 series.',movie:'Mostrando 5 películas de ejemplo.',series:'Mostrando 5 series de ejemplo.'};
 function filter(){
  for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.cinemaFilter===active));
  for(const card of grid.querySelectorAll('[data-cinema-kind]'))card.hidden=active!=='all'&&card.dataset.cinemaKind!==active;
  status.textContent=labels[active];
 }
 for(const button of buttons)button.addEventListener('click',()=>{if(Object.hasOwn(labels,button.dataset.cinemaFilter)){active=button.dataset.cinemaFilter;filter();}});
 async function update(){
  try{
   const response=await fetch('/api/cinema-feed',{signal:AbortSignal.timeout(10000)});if(!response.ok)return;
   const feed=await response.json(),items=feed.items;
   if(feed.schema!==1||!Number.isFinite(Date.parse(feed.updatedAt))||!Array.isArray(items)||items.length!==10||!['movie','series'].every(k=>items.filter(x=>x.kind===k).length===5)||!items.every(x=>typeof x.title==='string'&&x.title.length>0&&x.title.length<=200&&/^https:\/\/image\.tmdb\.org\/t\/p\/w500\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(x.poster)))return;
   const images=await Promise.all(items.map(item=>new Promise((resolve,reject)=>{
    const img=new Image();const timer=setTimeout(()=>reject(Error('image')),15000);
    img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);reject(Error('image'));};img.src=item.poster;
   })));
   const fragment=document.createDocumentFragment();
   items.forEach((item,i)=>{
    const card=document.createElement('figure'),caption=document.createElement('figcaption'),title=document.createElement('strong'),kind=document.createElement('span');
    card.dataset.cinemaKind=item.kind;const img=images[i];img.alt=`Portada de ${item.title}`;img.width=600;img.height=900;img.decoding='async';
    title.textContent=item.title;kind.textContent=item.kind==='movie'?'Película':'Serie';caption.append(title,kind);card.append(img,caption);fragment.append(card);
   });
   grid.replaceChildren(fragment);filter();
   const note=root.querySelector('.cinema-note');if(note)note.textContent=`Novedades del catálogo · 5 películas y 5 series. Selección actualizada el ${new Date(feed.updatedAt).toLocaleDateString('es')}. Portadas: TMDB.`;
  }catch{/* Keep the published selection when the feed or images are unavailable. */}
 }
 update();
})();
