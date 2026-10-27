# Resultados del MVP ETC

- [x] Landing original ETC - EveryThingCounts en español, con paleta #1B4079/#4D7C8A/#7F9C96/#8FAD88/#CBDF90 y JetBrains Mono inspirada en la referencia; CTA reales a demo y espacio privado, FAQ y aviso de datos ficticios, sin precios, métricas ni clientes inventados.
- [x] Demo administrada de frontdesk y backend operativos: cada visitante obtiene un espacio ficticio aislado con persistencia; nunca accede a datos privados ni envía mensajes reales. Comprobado por smoke test contra MySQL.
- [x] Espacio privado con OAuth real, autorización y registros separados por propietario; estados de sesión/carga/error y controles server-side implementados. JWT y rechazo anónimo comprobados; login manual desde navegador pendiente de prueba del usuario.
- [x] Bandeja con historial, contacto, mensajes, estados, búsqueda y transferencia humana; IA pausada cuando una persona toma el chat y reactivación explícita. Mensajes humanos toman el chat de forma atómica.
- [x] Contactos y pipeline mínimo editables y persistentes, con campos comerciales, consentimiento, prioridad, notas y exportación CSV autorizada. El pipeline incluye drag and drop para mover prospectos entre etapas, guardar el cambio en el backend y revertir/mostrar error si falla; además ofrece una alternativa accesible sin arrastrar. Persistencia verificada por API, gesto de navegador no ensayado.
- [x] Conocimiento aprobado editable y copiloto con IA real, alcance limitado, error/fallback visible, topes de solicitudes y sin promesas de respuestas infalibles. Respuesta real del proveedor comprobada.
- [x] Seguimientos y configuración por cliente/segmento, con plantillas de negocio adaptables sin sobrescribir automáticamente datos reales; no depender de HubSpot o Salesforce. Nuevas FAQ de plantilla quedan como borrador en privado.
- [x] Adaptador Cloud API preparado y desactivado por defecto: secretos server-side, scoping a cliente, HMAC y deduplicación de entradas, controles de ventana; conexión real pendiente sin credenciales y versión validada de Meta.
- [x] Navegación y formularios responsive, acciones persistentes con avisos de éxito/error y distinción entre simulación y operación real; sin botones de notificaciones ficticios.
- [x] Atribución y licencia de las piezas open source adaptadas; documentación de despliegue, diferencias de arquitectura, preparación por cliente y limitaciones; escaneo de identidad excluida y secretos antes de guardar.
- [x] Tipos, build y pruebas de scoping/handoff/ventana correctos; revisión de integración completada y checkpoint confirmado `83f5fdb5cd8687392de56e5de9b492b489d241c7`.
- [x] GitHub privado con confirmación del propietario y transferencia verificada/completada en `HenrykSoto99/etc-everythingcounts`.
- [ ] Publicación con URL permanente: con GitHub como repositorio activo, la publicación está disponible desde el panel del proyecto, no por la herramienta de publicación del asistente. Pendiente pulsar Publicar en el panel. No se afirma una URL pública ni un despliegue exitoso.

Evidencia y límites de las comprobaciones en `docs/VALIDATION.md`. No se activó ni se probó WhatsApp real.
