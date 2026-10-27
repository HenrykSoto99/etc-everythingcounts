# Auth tests

Los tests de este directorio son unitarios y no abren una conexión MySQL ni envían correos. Cubren KDF scrypt, salts aleatorios, límites, comparación, tokens opacos, cookies públicas/locales, configuración explícita de proveedores, origins, URL fija, migración aditiva y la secuencia de reset con una conexión SQL mock que verifica `FOR UPDATE` e invalida todas las sesiones.

Ejecutar solo este conjunto:

```bash
pnpm exec vitest run server/etc/auth
```

El test de todo el proyecto puede seguir mostrando diagnósticos preexistentes fuera de `server/etc/auth`; este conjunto no requiere `DATABASE_URL`.
