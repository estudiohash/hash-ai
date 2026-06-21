# Puente de escritura: HASH → Google Sheets

Esta carpeta **no es parte de la aplicación HASH**. Es el código que vos
instalás manualmente *en tu hoja de Google Sheets* para habilitar la
escritura. HASH (el navegador) nunca ejecuta este código: le hace
peticiones HTTP a la URL que este script expone una vez publicado.

## Por qué hace falta

El link `output=csv` que ya tenés es de **solo lectura**. Google no permite
escribir a través de ese link bajo ninguna circunstancia — es una
limitación de la plataforma, no de HASH. La única forma de escribir en una
hoja desde una página web sin backend propio es publicando un Google Apps
Script como "Web App": ese script corre con los permisos de la cuenta
dueña de la hoja, y por lo tanto sí puede agregar filas.

## Instalación (una sola vez, ~2 minutos)

1. Abrí tu hoja de Google Sheets (la que tiene las columnas
   `id, front, message, created_at`).
2. Menú **Extensiones > Apps Script**.
3. Borrá el contenido del editor que se abre y pegá el contenido completo
   de [`Code.gs`](./Code.gs) de esta carpeta.
4. Arriba a la derecha: **Implementar > Nueva implementación**.
5. En "Tipo", elegí **Aplicación web**.
   - **Ejecutar como:** "Yo" (tu cuenta)
   - **Quién tiene acceso:** "Cualquier usuario"

   > Esto NO hace pública tu hoja completa. Solo expone esta función
   > puntual (agregar una fila con esos 4 campos). Tu hoja sigue con los
   > permisos de acceso que ya tenía para verla/editarla manualmente.

6. Hacé clic en **Implementar**. Google va a pedirte autorizar el script
   la primera vez — aceptá los permisos (el script solo edita esta hoja).
7. Copiá la **URL de la aplicación web** que te muestra (termina en
   `/exec`).
8. Pegá esa URL en HASH, en `js/config.js`:

   ```js
   'google-sheets': {
     csvUrl: 'https://docs.google.com/.../output=csv',   // ya lo tenías (lectura)
     writeUrl: 'https://script.google.com/macros/s/AKfycb.../exec', // pegar acá (escritura)
   }
   ```

Listo. Con eso el botón "Guardar" de HASH va a insertar filas reales en
la hoja.

## Si necesitás volver a publicar el script

Si modificás `Code.gs` más adelante, tenés dos opciones al reimplementar:

- **Gestionar implementaciones > editar la implementación existente**:
  mantiene la misma URL (recomendado, así no hay que tocar `config.js`).
- **Nueva implementación**: te da una URL nueva, que hay que actualizar
  en `config.js`.

## Probar que el puente funciona, sin tocar HASH

Pegá la URL `/exec` en la barra de tu navegador y abrila (eso hace un GET).
Deberías ver:

```json
{"ok":true,"info":"Puente de escritura HASH -> Sheets activo."}
```

Si ves eso, el puente está bien instalado y el problema (si persiste) está
del lado de HASH, no de Sheets.

## Alcance y reemplazabilidad

Este puente solo transporta datos: recibe `{ id, front, message, created_at }`
y agrega una fila. No interpreta ni transforma nada. Es una pieza de
infraestructura, reemplazable en cualquier momento sin afectar el resto
de HASH — ver `/docs/decisiones-arquitectura.md` en la raíz del proyecto.
