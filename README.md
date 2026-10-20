# TEVEO Website v2.0 — Preview (concepto sobrio)

Landing **de prueba** inspirada en una estructura clara de presentación de producto, sin copiar Stremio. Usa tres capturas reales facilitadas por el propietario de TEVEO.

## Contenido
- `index.html`, `styles.css`, `script.js`, `assets/`.
- WhatsApp +2977308610 con mensajes para planes de **1, 6 y 12 meses** sin precios.
- Correo secundario soycaxte@gmail.com.
- Enlace de activación existente `activar.kingmediaglobal.com`.
- Capturas originales proporcionadas por el usuario, sin montajes ni funcionalidades ficticias.

## Probar localmente
Abrir `index.html` en navegador (o usar un servidor local). Los enlaces relativos `assets/...`, `styles.css` y `script.js` funcionan abriendo el HTML directamente.

## Publicar como preview en Vercel SIN cambiar producción
1. En GitHub, abrir `soycaxte-lab/teveo-website` y crear una rama `preview-v2` desde `main`.
2. Sustituir el contenido de esa rama por los archivos de este ZIP (mantener `index.html` en raíz).
3. Vercel generará un despliegue **Preview** desde la rama `preview-v2`, si GitHub y Vercel están conectados. Revisar el despliegue en Vercel > Deployments.
4. NO hacer merge a `main` ni asignar los dominios personalizados mientras no esté aprobado el diseño.
5. El proyecto original tiene un archivo de función `/api/inquiry.js`, que **no se usa** en esta v2 (contacto vía WhatsApp). No depende de él.

## Notas
- Las capturas muestran algunos contenidos de catálogo ajenos: no se utilizan como afirmación de licencias o distribución.
- La oferta comercial debe verificarse antes de vender acceso a contenido de terceros.
- No publicar credenciales del proveedor, tokens ni claves en un repositorio.
