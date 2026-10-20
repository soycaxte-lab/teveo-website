// Vercel serverless function. Requires RESEND_API_KEY, INQUIRY_TO_EMAIL and RESEND_FROM_EMAIL.
// Configure a verified sender domain with Resend before accepting production inquiries.
export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Método no permitido.'});}
 const {RESEND_API_KEY,INQUIRY_TO_EMAIL,RESEND_FROM_EMAIL}=process.env;
 if(!RESEND_API_KEY||!INQUIRY_TO_EMAIL||!RESEND_FROM_EMAIL)return res.status(503).json({error:'El formulario aún no está habilitado. Comunícate con King Media Global para solicitar información.'});
 const b=typeof req.body==='object'&&req.body?req.body:{};
 const name=String(b.name||'').trim().slice(0,100),email=String(b.email||'').trim().slice(0,160),plan=String(b.plan||'').trim(),device=String(b.device||'').trim().slice(0,80),message=String(b.message||'').trim().slice(0,1500);
 if(b.website)return res.status(200).json({ok:true});
 if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['1 mes','6 meses','12 meses','Información general'].includes(plan)||b.consent!=='on')return res.status(400).json({error:'Verifica el formulario y acepta el aviso de datos.'});
 const body=`Nueva consulta TEVEO\n\nPlan: ${plan}\nNombre: ${name}\nCorreo: ${email}\nDispositivo: ${device||'No indicado'}\nMensaje: ${message||'Sin mensaje'}`;
 try{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:RESEND_FROM_EMAIL,to:[INQUIRY_TO_EMAIL],reply_to:email,subject:`Consulta TEVEO — ${plan}`,text:body})});
 if(!response.ok){console.error('Resend error status',response.status);return res.status(502).json({error:'No se pudo enviar la consulta en este momento.'});}
 return res.status(200).json({ok:true});
 }catch(_){return res.status(502).json({error:'No se pudo conectar con el servicio de consultas.'});}
}
