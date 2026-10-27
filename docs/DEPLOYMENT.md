# Publicación de ETC

## Fuente y entorno

El repositorio activo es `HenrykSoto99/etc-everythingcounts`, privado, con la rama `main`. El despliegue utiliza el `Dockerfile` de la raíz y comprueba `/api/health`. Frontend y backend se sirven en el mismo contenedor; los datos persistentes se almacenan en la base MySQL administrada, no en archivos del contenedor.

La publicación automática está habilitada en la configuración del proyecto consultada el 27 de octubre de 2026. Un nuevo commit aceptado en `main` puede solicitar la publicación por este flujo. El panel del proyecto permite solicitarla también. Un push aceptado o una solicitud enviada no constituyen una publicación exitosa: comprobar el resultado y la versión desplegada antes de entregar una URL permanente.

## Recuperación del fallo de clone

El intento de publicar la versión `5436417436e861e1b6ee60be304469f446baef9c` falló antes de compilar, con `git clone failed` y `Repository not found`. Se verificó que el repositorio existe, sigue privado y contiene esa versión. El acceso de desarrollo informó permiso ADMIN y `git fetch` funcionó; no había cambios de código pendientes.

El propietario informó una nueva autorización de GitHub el 27 de octubre de 2026 a las 09:07, hora de México. La verificación posterior confirmó acceso al repositorio. Esto no demuestra, por sí solo, que el servicio de publicación use la misma credencial ni que un despliegue nuevo vaya a terminar correctamente. La actualización documental de esta entrega permite registrar un nuevo intento mediante el flujo automático habilitado.

Si el clone vuelve a fallar, conservar el error y el identificador de versión del intento. No recrear el repositorio, modificar el Dockerfile para incluir credenciales ni hacer público el código como solución. La autorización del acceso de desarrollo y la del publicador deben verificarse por sus mecanismos correspondientes. No compartir contraseñas ni tokens en el chat o en commits.

El repositorio no se ha trasladado al almacenamiento administrado: sigue conectado a GitHub. Cualquier cambio de repositorio activo requiere completar su confirmación y transferencia; una autorización de GitHub no equivale a ese cambio.

## Configuración después de publicar

Antes de ofrecer cuentas reales en el dominio publicado, configurar `ETC_PUBLIC_ORIGIN` con su origen HTTPS autorizado. El correo de recuperación requiere Resend o SMTP; las API keys propias requieren la clave maestra `ETC_LLM_ENCRYPTION_KEY` protegida. WhatsApp real permanece desactivado hasta completar la configuración del negocio y de Meta.

Estas configuraciones no deben introducirse en el repositorio. Consultar [cuentas e IA](ACCOUNT-AND-AI-SETUP.md), [preparación por cliente](CLIENT-SETUP.md) y [validación](VALIDATION.md).
