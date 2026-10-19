# TEVEO — landing page para kingmediaglobal.com

Página inicial adaptable a móvil, tablet y TV, con Inicio, Funciones, Experiencia, Planes (1, 6 y 12 meses sin precios), Preguntas y formulario de consultas.

## Vista local

Abre `index.html` en tu navegador para visualizar el diseño. El formulario NO enviará consultas en modo archivo ni hasta configurar el servidor en Vercel.

## Publicar en Vercel

1. Crea un proyecto nuevo en Vercel e importa esta carpeta (Git o CLI). Framework: `Other`. Directorio raíz: la carpeta del proyecto.
2. Configura las variables **RESEND_API_KEY**, **INQUIRY_TO_EMAIL** (correo receptor) y **RESEND_FROM_EMAIL** (remitente verificado en Resend, por ejemplo `TEVEO <consultas@kingmediaglobal.com>` si el dominio ha sido verificado).
3. Prueba el formulario en la URL temporal de Vercel. No afirma envíos hasta probarlo con el proveedor configurado. Activa protección anti-spam/rate limiting, consentimiento y política de privacidad completa antes de recibir solicitudes reales.
4. Cuando estés listo para cambiar el dominio principal, agrega `kingmediaglobal.com` y `www.kingmediaglobal.com` al proyecto en Vercel. Sigue exclusivamente los registros DNS que indique Vercel para el proyecto. Haz una copia de la configuración DNS actual y mantén los registros del subdominio `activar.kingmediaglobal.com`; no borres registros MX, SPF o DKIM de correo.
5. Revisa la migración desde Wix y el flujo del dominio antes de cambiar los registros. La DNS y la publicación definitiva requieren autorización del dueño del dominio.

## Importante

- No se muestran precios ni se cobra: los botones solo abren una consulta.
- La página no asegura que haya contenido de terceros incluido. Para vender acceso a catálogos o canales se necesitan derechos/licencias correspondientes.
- Imágenes del producto: mockup de interfaz generado con CSS, no imágenes reales del catálogo.
- El enlace de activación existente (`https://activar.kingmediaglobal.com`) se conserva.
- Los textos de condiciones comerciales y privacidad son preliminares; antes de publicar un servicio comercial, añade Términos, Privacidad, datos de contacto verificados y condiciones de compra/reembolso aplicables.
- La API de consultas no implementa aún rate limiting ni protección CAPTCHA: configurar antes de publicarla.
- La fuente Outfit / DM Sans se carga desde Google Fonts; la web sigue funcionando con fuentes del sistema si no hay conexión.
