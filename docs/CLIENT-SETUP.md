# Adecuación de ETC por cliente

## Qué funciona en la demo

La demo tiene un espacio ficticio propio por visitante. Los cambios en contactos, etapas, conocimiento, seguimientos y perfil se guardan en la base administrada. El copiloto usa IA real del proyecto con límites de uso y fallback identificado. Los mensajes del modo demo son simulaciones: no se envían a WhatsApp.

El pipeline permite mover tarjetas entre etapas con drag and drop y cambiar la etapa desde un selector accesible. Ambos caminos usan el mismo endpoint y deben persistir el cambio.

## Preparar un negocio

Acceder a `/app` con la autenticación real. Este espacio no utiliza el token ni los registros de la demo. Definir nombre del negocio, segmento, nombre del asistente, tono y descripción. La plantilla de segmento sirve como punto de partida y no debe borrar registros ni reemplazar automáticamente respuestas editadas.

Revisar cada entrada de conocimiento antes de aprobarla. Incluir horarios, alcance, servicios, preguntas frecuentes y los casos que deben transferirse a una persona. No publicar precios, disponibilidad, diagnósticos ni garantías si el negocio no los ha validado.

Configurar las etapas y el proceso de seguimiento utilizando el pipeline mínimo: nuevo, en atención, calificado, ganado y perdido. El MVP mantiene estas cinco etapas; campos y etapas totalmente personalizados son evolución posterior, no una función ya entregada.

## Conexión real de WhatsApp

La conexión está desactivada por defecto. Desde Ajustes se obtiene el identificador del espacio y la ruta del webhook. Los valores protegidos se suministran mediante la configuración segura de secretos del proyecto, nunca por chat, GitHub, formularios públicos ni código cliente.

| Variable | Uso |
| --- | --- |
| `WA_WORKSPACE_ID` | Espacio privado vinculado al número. |
| `WA_PHONE_NUMBER_ID` | Identificador del número de Cloud API. |
| `WA_GRAPH_API_VERSION` | Versión vigente habilitada en la aplicación de Meta; por validar al activar el cliente, sin asumir una versión antigua. |
| `WA_ACCESS_TOKEN` | Credencial server-side autorizada del negocio. |
| `WA_VERIFY_TOKEN` | Valor privado usado en la verificación del webhook. |
| `META_APP_SECRET` | Secreto para validar la firma HMAC de entradas. |
| `ETC_LIVE_WHATSAPP_ENABLED` | Activación explícita después de configurar y verificar. |

El webhook debe ser una URL HTTPS pública del despliegue definitivo más `/api/etc/whatsapp/webhook`. Suscribir la aplicación al número correcto y verificar la firma de mensajes. Vincular cada despliegue piloto a un solo número/espacio; conectar muchos números por tenant con secretos cifrados es una evolución posterior.

Antes de habilitar el envío, comprobar titularidad del número, consentimiento y ventana de servicio. La conversación libre requiere un mensaje entrante válido dentro de las últimas 24 horas. Las plantillas aprobadas y campañas masivas no están incluidas en el envío del MVP.

## IA y toma humana

El copiloto propone una respuesta; no equivale a un envío automático real. En demo puede simularse la respuesta del agente si la asistencia está habilitada y nadie ha tomado el chat. Al tomar la conversación se pausa esa respuesta automática, incluso si una generación estaba en curso. La reactivación debe ser explícita.

La primera operación real usa atención humana/copiloto. El webhook guarda el mensaje sin lanzar IA en segundo plano que pueda perderse al escalar el servidor. Un agente autónomo real necesitará cola durable, trabajador, reintentos y control de entrega antes de habilitarse.

## Antes del primer cliente real

Completar el aviso de privacidad y datos del responsable, verificar autorizaciones del contenido, acordar retención y eliminación de datos, probar con un número de prueba de Meta y revisar backups/alertas del hosting elegido. El consumo de IA, mensajería y alojamiento es separado del precio comercial. No hay SLA ni tarifa comercial validados en este MVP.

Conservar la licencia MIT de las piezas open source. No subir credenciales ni documentos de investigación al repositorio. La exportación CSV es la integración mínima disponible; Airtable/Google Sheets o una API externa pueden añadirse cuando el cliente los necesite.
