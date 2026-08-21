# Guía de Cambio de Cuenta — HASH AI

Cada vez que cambiás de cuenta de Railway, seguí este checklist en orden.
No hay migración de DB porque cada cuenta arranca limpia.

---

## Resumen rápido

| Qué cambia | Dónde |
|---|---|
| URL del backend | `js/app.js` + `vercel.json` |
| Variables de entorno | Railway (nuevo proyecto) |
| OAuth Client | Google Cloud Console |
| Credenciales de Git | Windows — Administrador de credenciales |

---

## PASO 1 — Crear el nuevo proyecto en Railway

1. Creá una cuenta nueva en Railway (o usá la que sigue)
2. Crear nuevo proyecto → deployar el backend (mismo repo o imagen)
3. Railway te va a dar una URL nueva, por ejemplo:
   ```
   hash-cloud-production-XXXX.up.railway.app
   ```
4. Guardá esa URL, la vas a necesitar en todos los pasos siguientes.

---

## PASO 2 — Actualizar la URL en el frontend

Hay **dos archivos** que tienen la URL del backend hardcodeada:

### `js/app.js` — línea 6
```javascript
const HASH_CLOUD_URL = 'https://hash-cloud-production-XXXX.up.railway.app';
```

### `vercel.json` — en el Content-Security-Policy
```json
"connect-src 'self' https://hash-cloud-production-XXXX.up.railway.app"
```

Reemplazá la URL vieja por la nueva en ambos archivos.

---

## PASO 3 — Configurar variables de entorno en Railway

En el nuevo proyecto de Railway → tu servicio → Variables, configurá todas estas:

| Variable | Descripción |
|---|---|
| `GOOGLE_CLIENT_ID` | Del nuevo OAuth Client (ver Paso 4) |
| `GOOGLE_CLIENT_SECRET` | Del nuevo OAuth Client (ver Paso 4) |
| `GOOGLE_REDIRECT_URI` | `https://hash-cloud-production-XXXX.up.railway.app/auth/callback` |
| `MEMORY_CALLBACK_URI` | `https://hash-cloud-production-XXXX.up.railway.app/memory/callback` |
| `SESSION_SECRET` | Podés reusar el mismo valor anterior |
| `JWT_SECRET` | Podés reusar el mismo valor anterior |
| `JWT_ALGORITHM` | `HS256` |
| `JWT_EXPIRE_MINUTES` | `60` |
| `CREDENTIALS_SECRET` | Podés reusar el mismo valor anterior |
| `GEMINI_API_KEY` | Mismo valor anterior |
| `GROQ_API_KEY` | Mismo valor anterior |
| `FISH_AUDIO_API_KEY` | Mismo valor anterior |
| `DATABASE_URL` | Conexión a Postgres (si usás DB) |

> ⚠️ La única variable que **siempre cambia** es `GOOGLE_REDIRECT_URI` y `GOOGLE_CLIENT_ID/SECRET` si creás un OAuth nuevo.

---

## PASO 4 — Crear nuevo OAuth Client en Google Cloud Console

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. APIs & Services → Credentials → **+ Crear credenciales** → ID de cliente OAuth 2.0
3. Tipo: **Aplicación web**
4. Agregar en **Authorized redirect URIs**:
   ```
   https://hash-cloud-production-XXXX.up.railway.app/auth/callback
   ```
5. Agregar en **Authorized JavaScript origins**:
   ```
   https://hash-ai.vercel.app
   https://tudominio.com
   ```
6. Guardar → copiá el `Client ID` y `Client Secret` → pegarlos en Railway (Paso 3)

> ⚠️ Si la tabla `memory_users` no tiene la columna `email`, ejecutá en Railway → Postgres → Query:
> ```sql
> ALTER TABLE memory_users ADD COLUMN email TEXT;
> ```

---

## PASO 5 — Pushear los cambios a GitHub

En PowerShell, **uno por uno**:

```powershell
cd C:\Users\ADMIN\Documents\Hash\hash-ai-main
```
```powershell
git add js/app.js vercel.json
```
```powershell
git commit -m "fix: update backend URL to new Railway account"
```
```powershell
git push origin main --force
```

Vercel detecta el push y redeploya automáticamente.

---

## PASO 6 — Verificar credenciales de Git en Windows

Si los deploys en Vercel aparecen con la cuenta vieja:

1. Buscá **Administrador de credenciales** en el menú inicio
2. Credenciales de Windows → buscá `github.com` → **Eliminar**
3. Volvé a hacer `git push` → te va a pedir login → iniciá sesión con la cuenta correcta

También verificar que el email de git sea el correcto:
```powershell
git config --global user.email "contacto.estudiohash@gmail.com"
git config --global user.name "estudiohash"
```

---

## PASO 7 — Verificar que todo funciona

1. Entrá a la app → intentá loguear con Google
2. Si ves `Internal Server Error` → revisá los logs en Railway
3. Si ves error de CSP → verificá que `vercel.json` tenga la URL nueva
4. Si ves `invalid_request` de Google → verificá que `GOOGLE_REDIRECT_URI` en Railway coincida exactamente con la URI registrada en Google Cloud

---

## Errores comunes y soluciones

| Error | Causa | Solución |
|---|---|---|
| `404 Not Found` en Railway | URL del backend incorrecta en `app.js` | Actualizar `HASH_CLOUD_URL` en `js/app.js` |
| `CSP error` en consola del browser | URL vieja en `vercel.json` | Actualizar `connect-src` en `vercel.json` |
| `invalid_request` de Google | `GOOGLE_REDIRECT_URI` no coincide | Verificar variable en Railway vs Google Cloud |
| `Internal Server Error` al loguear | Columna `email` faltante en DB | Ejecutar `ALTER TABLE memory_users ADD COLUMN email TEXT;` |
| Deploy con cuenta vieja en Vercel | Credenciales de Git en Windows | Eliminar `github.com` del Administrador de credenciales |
| `fatal: 'origin' does not appear to be a git repository` | Remote no configurado | `git remote add origin https://github.com/estudiohash/hash-ai.git` |
| `error: src refspec main does not match any` | Sin commits todavía | Hacer `git commit` antes del push |

---

## Archivos clave

```
hash-ai-main/
├── js/
│   └── app.js          ← HASH_CLOUD_URL en línea 6
├── vercel.json         ← connect-src en Content-Security-Policy
└── CAMBIO_DE_CUENTA.md ← esta guía
```

---

*Última actualización: Agosto 2026*
