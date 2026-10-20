const menu=document.querySelector('#mobileMenu');
const toggle=document.querySelector('#menuToggle');
document.querySelector('#year').textContent=String(new Date().getFullYear());
toggle.addEventListener('click',()=>{const open=menu.hidden;menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));});
menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');}));
