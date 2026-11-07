const menu=document.querySelector('#mobileMenu');
const toggle=document.querySelector('#menuToggle');
document.querySelector('#year').textContent=String(new Date().getFullYear());
toggle.addEventListener('click',()=>{const open=menu.hidden;menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));});
menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');}));

const shotDialog=document.querySelector('#screenshotDialog');
if(shotDialog){
  const expanded=document.querySelector('#expandedShot');
  document.querySelectorAll('.shot-open').forEach(button=>button.addEventListener('click',()=>{expanded.src=button.dataset.shot;expanded.alt=button.querySelector('img').alt;shotDialog.showModal();}));
  shotDialog.querySelector('.shot-close').addEventListener('click',()=>shotDialog.close());
  shotDialog.addEventListener('click',event=>{if(event.target===shotDialog)shotDialog.close();});
}
