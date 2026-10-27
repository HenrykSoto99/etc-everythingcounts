# ETC email/password auth

Este directorio contiene el backend aislado de cuentas ETC. No enlaza cuentas OAuth por email: cada alta crea un registro `users` con `openId` `etc_email_<UUID>`, `role='user'`, `loginMethod='email'` y una fila propia en `etc_account_credentials`.

## Integración del parent

Registrar el router antes de `registerEtcRoutes`:

```ts
import { registerEmailAuthRoutes } from "../etc/auth";

registerEmailAuthRoutes(app, {
  allowedOrigins: ["https://preview.example"],
});
```

`allowedOrigins` debe contener los orígenes reales del frontend. También puede existir `ETC_PUBLIC_ORIGIN`; solo se acepta HTTPS público o HTTP local (`localhost`, `127.0.0.1`, `[::1]`). El origen no se deriva de `Host` ni de una petición. El módulo no instala CORS; las escrituras requieren `X-ETC-Intent: workspace` como defensa CSRF.

El parent debe resolver la autenticación ETC antes de su fallback OAuth usando:

```ts
const user = await resolveEmailUser(req);
```

Devuelve `null` solo cuando no hay cookie Bearer ETC propia. Una cookie `etc_account_session` o un Bearer `etc_acct_...` presente pero inválido lanza un error y nunca debe caer silenciosamente a OAuth.

## Migración

El parent debe invocar `runEmailAuthMigration()` desde su migración completa. La función también puede ejecutarse finitamente:

```bash
pnpm exec tsx server/etc/auth/migrate.ts
```

Solo crea tablas aditivas con `CREATE TABLE IF NOT EXISTS`: credenciales, sesiones opacas, tokens de recuperación, rate limits persistentes y preferencias de workspace para instalaciones cuyo `etc_workspaces` aún no tenga `business_type`.

## Email

No se elige proveedor por silencio. Solo se habilita cuando `ETC_EMAIL_PROVIDER` es explícito y las credenciales están completas:

- `resend`: `ETC_EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `ETC_EMAIL_FROM`.
- `smtp`: `ETC_EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`; `ETC_EMAIL_FROM` es opcional y por defecto usa `SMTP_USER`. `SMTP_SECURE=true|false` es opcional; por defecto se usa `true` para el puerto 465.

`GET /api/etc/auth/status` nunca expone secretos y devuelve `{emailEnabled,provider,passwordMinLength}`. Sin configuración válida devuelve `emailEnabled:false, provider:"none"`. Recovery responde de forma genérica y nunca incluye token, contraseña ni una afirmación de correo enviado. Los correos reales se envían únicamente a la dirección ETC registrada.

## Sesiones y contraseñas

Las contraseñas usan `crypto.scrypt` asíncrono con salt aleatorio, comparación `timingSafeEqual`, máximo de dos operaciones concurrentes, mínimo 12 y máximo 128 caracteres. Las sesiones usan tokens aleatorios de 32 bytes con prefijo `etc_acct_`; solo su SHA-256 se almacena y expiran en siete días. El cookie es `HttpOnly`; en HTTPS público usa `SameSite=None; Secure`, y en un origen HTTP local allowlisted usa `SameSite=Lax; Secure=false` explícitamente.

Los tokens de recovery son aleatorios, se almacenan únicamente como hash, expiran en 30 minutos, son de un solo uso y al restablecer una contraseña invalidan todas las sesiones de esa cuenta en la misma transacción.
