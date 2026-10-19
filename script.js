const $=(selector)=>document.querySelector(selector);
const dialog=$('#contactDialog');
const form=$('#contactForm');
const feedback=$('#formFeedback');
const menu=$('#mobileMenu');
$('#year').textContent=String(new Date().getFullYear());
$('#menuToggle').addEventListener('click',()=>{const open=menu.hidden;menu.hidden=!open;$('#menuToggle').setAttribute('aria-expanded',String(open));});
menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{menu.hidden=true;$('#menuToggle').setAttribute('aria-expanded','false');}));
document.querySelectorAll('[data-plan]').forEach(button=>button.addEventListener('click',()=>{form.reset();feedback.textContent='';feedback.className='form-feedback';$('#planInput').value=button.dataset.plan;dialog.showModal();}));
$('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
form.addEventListener('submit',async e=>{
 e.preventDefault();feedback.textContent='';feedback.className='form-feedback';
 if(!form.reportValidity())return;
 const data=Object.fromEntries(new FormData(form).entries());
 const btn=$('#submitBtn');btn.disabled=true;btn.textContent='Enviando…';
 try{const res=await fetch('/api/inquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const payload=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(payload.error||'No se pudo enviar la consulta.');
 feedback.className='form-feedback success';feedback.textContent='Consulta enviada. Te responderemos al correo indicado.';form.reset();
 }catch(err){feedback.className='form-feedback error';feedback.textContent=err.message||'No se pudo enviar la consulta.';}
 finally{btn.disabled=false;btn.textContent='Enviar consulta ↗';}
});
