# HASH

Base técnica inicial del proyecto HASH.

HASH no nace como un proyecto de inteligencia artificial. HASH nace como un
sistema para **capturar, almacenar y preservar**:

- experiencia
- decisiones
- aprendizajes
- procesos
- contexto
- conocimiento acumulado

La prioridad de esta V1 es registrar información de forma **simple y
persistente**. La inteligencia artificial será una etapa posterior.

## ¿Qué es esta V1?

Una conversación continua donde cada mensaje queda almacenado como parte de
una memoria histórica, separada en **frentes** (contextos) independientes:

- Personal
- HASH AI
- Method
- CALAMBRE
- BANGER

Cada frente puede evolucionar de forma independiente: tiene su propia lista
de mensajes, y agregar/quitar frentes en el futuro no afecta a los demás.

## Estructura del proyecto

```
/index.html        Estructura HTML de la app (sidebar de frentes + panel de mensajes)
/css/
  style.css         Estilos base, mínimos y funcionales (sin branding todavía)
/js/
  config.js         PUNTO ÚNICO DE CONFIGURACIÓN del almacenamiento externo
  storage.js        Única responsabilidad: leer/escribir datos (localStorage + replicación externa)
  ui.js             Única responsabilidad: renderizar el DOM y leer inputs del usuario
  app.js            Orquestador: conecta storage.js y ui.js, maneja el flujo de la app
  datasources/
    dataSourceInterface.js   Contrato que todo almacenamiento externo debe cumplir (documentación)
    googleSheetsSource.js    Adaptador: Google Sheets (lectura por CSV, escritura por Apps Script)
    localSource.js           Adaptador: almacenamiento "vacío", para modo 100% local
    dataSourceFactory.js     Único lugar que lee config.js y decide qué almacenamiento usar
/data/
  fronts.json       Semilla con la definición de los frentes iniciales
/apps-script/
  Code.gs            Puente de escritura (Google Apps Script). NO corre dentro de HASH.
```

Toda la documentación del proyecto vive en este único README (instalación
del puente de escritura, esquema de datos, decisiones de arquitectura).
No hay otros `.md` en el proyecto a propósito: un solo lugar para leer,
nada que mantener sincronizado entre archivos.

## Responsabilidad de cada archivo

| Archivo         | Responsabilidad                                                                 |
|------------------|----------------------------------------------------------------------------------|
| `index.html`     | Define la estructura visual base: sidebar, header, lista de mensajes, formulario |
| `css/style.css`  | Estilos mínimos para que la estructura sea usable                                |
| `js/config.js`   | **Punto único de configuración**: qué almacenamiento externo está activo y sus parámetros. Es el único archivo que hay que tocar para cambiarlo. |
| `js/storage.js`  | Persistencia de datos (frentes, mensajes) en `localStorage` (fuente de verdad), más sincronización/replicación con el almacenamiento externo activo (sin saber cuál es). |
| `js/ui.js`       | Renderizado del DOM. Es el único archivo que toca elementos HTML directamente.    |
| `js/app.js`      | Orquesta: escucha acciones del usuario, pide/guarda datos vía `storage.js`, pide a `ui.js` que renderice. |
| `js/datasources/dataSourceInterface.js` | Contrato (documentación) que cualquier adaptador de almacenamiento externo debe cumplir. |
| `js/datasources/googleSheetsSource.js`  | Adaptador concreto: lee el CSV publicado y escribe a través del puente de Apps Script. |
| `js/datasources/localSource.js`         | Adaptador concreto "vacío", usado cuando no hay almacenamiento externo (`type: 'local'`). |
| `js/datasources/dataSourceFactory.js`   | Lee `config.js` y devuelve el almacenamiento activo ya listo para usar. Único punto que conoce el `REGISTRY` disponible. |
| `data/fronts.json` | Configuración inicial (semilla) de los frentes disponibles.                    |
| `apps-script/Code.gs` | Script externo (no corre en HASH) que recibe mensajes vía HTTP y los agrega como filas en la hoja. |

Esta separación es intencional: si en el futuro `storage.js` pasa de usar
`localStorage` a una base de datos real, **solo ese archivo debería
cambiar**. Lo mismo si el día de mañana se reemplaza la forma de renderizar
la UI: el cambio queda contenido en `ui.js`.

## Cómo correrlo localmente

No requiere build ni dependencias. Basta con abrir `index.html` en el
navegador, o servirlo con cualquier servidor estático, por ejemplo:

```bash
npx serve .
```

o con la extensión "Live Server" de VS Code.

## Persistencia actual

Todo se guarda en el `localStorage` del navegador. Esto significa:

- Los datos son locales a cada navegador/dispositivo (no hay sync entre dispositivos todavía).
- Borrar los datos del sitio en el navegador borra el historial guardado.
- No hay backend ni autenticación en esta etapa.

### Esquema de un mensaje

```json
{
  "id": "msg_1718900000000_a1b2c3",
  "frontId": "personal",
  "texto": "Contenido del mensaje",
  "timestamp": 1718900000000,
  "autor": null,
  "origen": "externo"
}
```

`autor` y `origen` son opcionales: solo aparecen en mensajes que llegaron
por sincronización desde el almacenamiento externo (ver
`js/storage.js#mergeExternalMessages`). Los mensajes creados directamente
en HASH (`Storage.addMessage`) no los incluyen.

### Esquema de un frente

```json
{
  "id": "personal",
  "nombre": "Personal",
  "descripcion": "Registro personal: experiencia, decisiones y aprendizajes individuales."
}
```

`data/fronts.json` es la semilla con la que `storage.js` inicializa
`localStorage` la primera vez que se abre HASH en un navegador nuevo. No
es la base de datos en vivo — eso siempre es `localStorage`.

## Almacenamiento externo (Google Sheets)

> **Principio de arquitectura:** la memoria de HASH es siempre local.
> HASH no depende de ningún servicio externo para construir, modificar
> o enriquecer su memoria — la memoria le pertenece a HASH, no a la
> plataforma donde se guarda una copia. Concretamente:
>
> - La fuente de verdad es siempre el storage local (`localStorage` hoy).
>   Todo lo que HASH muestra o recuerda sale de ahí, nunca de una
>   consulta en vivo a un servicio externo.
> - Google Sheets es almacenamiento de respaldo/replicación, visible y
>   editable a mano — no una fuente de la que HASH "aprenda" ni desde la
>   que construya razonamiento.
> - Cualquier servicio externo es reemplazable por definición: si Sheets
>   se cae, se desconfigura, o se reemplaza por otra cosa, HASH sigue
>   funcionando igual con su storage local. Ningún servicio externo es
>   punto único de falla.
> - La inteligencia futura de HASH (etapa posterior, fuera de esta
>   entrega) se construye sobre su propia memoria acumulada, no sobre
>   consultas permanentes a APIs o servicios de terceros.

Además de lo que el usuario escribe directamente en HASH, la app puede
**leer y escribir** una copia de las conversaciones en una hoja de Google
Sheets. Hoy esa hoja es el destino; mañana puede ser cualquier otro
almacenamiento (u ninguno) sin romper el resto del sistema.

### Lectura (sincronización)

```
config.js  →  DataSourceFactory  →  adaptador activo (googleSheetsSource.js)
                                            │
                                            ▼
                                  fetchConversations()
                                    (lee el CSV publicado)
                                            │
                                            ▼
                              storage.js (normaliza, deduplica,
                                crea frentes nuevos si hace falta,
                                guarda en localStorage)
                                            │
                                            ▼
                                    ui.js / app.js
```

Ocurre automáticamente al abrir HASH, y también con el botón
**"Actualizar desde fuente externa"**.

### Escritura (replicación)

El CSV publicado de Google Sheets es de **solo lectura** — Google no
permite escribir a través de ese link bajo ninguna circunstancia. Por eso
la escritura usa un camino distinto: un pequeño puente de Google Apps
Script, publicado como Web App (instrucciones de instalación más abajo).

```
Usuario completa el formulario y hace click en "Guardar"
        │
        ▼
app.js → Storage.addMessage()        ← GUARDADO LOCAL, síncrono,
        │                               nunca depende de la red.
        │                               El mensaje YA es parte de HASH.
        ▼
app.js → Storage.replicateToExternalSource(mensaje)   ← asíncrono, best-effort
        │
        ▼
googleSheetsSource.js → saveMessage()
        │
        ▼
   POST al puente de Apps Script (writeUrl), body:
   { action: 'saveMessage', data: { id, front, message, created_at } }
        │
        ▼
   El script agrega una fila: id, front, message, created_at
```

Si la replicación falla (sin `writeUrl` configurada, sin red, el puente
caído, etc.), **el mensaje sigue guardado en HASH igual** — solo no llegó
a copiarse en la hoja. La interfaz muestra el estado de esa operación
debajo del botón de actualizar.

### Instalar el puente de escritura (`apps-script/Code.gs`)

`apps-script/Code.gs` no es parte de la aplicación HASH ni corre en el
navegador. Es el código que se instala manualmente *en la hoja de Google
Sheets* para habilitar la lectura/escritura: HASH solo le hace peticiones
HTTP a la URL que ese script expone una vez publicado.

El contrato que implementa:
- `GET ?front=<frontId>` → `{ ok: true, messages: [...] }` (lectura por
  frente; HASH hoy no la usa activamente, lee por el CSV publicado).
- `POST` con body `{ action: 'saveMessage', data: { id, front, message,
  created_at } }` → `{ ok: true }`. Es lo que `googleSheetsSource.js`
  llama para guardar.

Instalación desde cero (solo si hay que reinstalarlo, ~2 minutos):

1. Abrí la hoja de Google Sheets (la que tiene las columnas
   `id, front, message, created_at`).
2. Menú **Extensiones > Apps Script**.
3. Borrá el contenido del editor que se abre y pegá el contenido completo
   de `apps-script/Code.gs`.
4. Actualizá la constante `SPREADSHEET_ID` en el script con el ID de tu
   hoja (está en la URL: `.../spreadsheets/d/ESTE_ID/edit`).
5. Arriba a la derecha: **Implementar > Nueva implementación**.
6. En "Tipo", elegí **Aplicación web**.
   - **Ejecutar como:** "Yo" (tu cuenta)
   - **Quién tiene acceso:** "Cualquier usuario"

   > Esto NO hace pública la hoja completa. Solo expone esta función
   > puntual (leer/agregar filas). La hoja sigue con los permisos de
   > acceso que ya tenía para verla/editarla manualmente.
   >
   > **Importante:** con "Solo yo", Google redirige cualquier visita
   > externa a una pantalla de error de Google Drive en vez de ejecutar
   > el script — ese es el síntoma si ves "No se pudo abrir el archivo"
   > al probar la URL.

7. Hacé clic en **Implementar**. Google va a pedir autorizar el script
   la primera vez — aceptá los permisos (el script solo edita esta hoja).
8. Copiá la **URL de la aplicación web** que se muestra (termina en `/exec`).
9. Pegá esa URL en `js/config.js` (ver siguiente sección).

Si más adelante modificás `Code.gs`, al reimplementar tenés dos opciones:
**Gestionar implementaciones > editar la existente** (mantiene la misma
URL, no hay que tocar `config.js`), o **Nueva implementación** (da una
URL nueva que hay que actualizar). Si en algún momento se ven varias
implementaciones con nombres parecidos (`hash-ai`, `hash-ai`...), es
porque se usó "Nueva implementación" más de una vez; cada una tiene su
propia URL distinta y solo una es la que está pegada en `writeUrl`.

Para probar que el puente funciona sin tocar HASH: pegá la URL `/exec`
**con el parámetro de prueba** en la barra del navegador, por ejemplo
`.../exec?front=personal`. Debería devolver
`{"ok":true,"messages":[...]}` (con la lista de mensajes de ese frente,
puede ser un array vacío). Si ves eso, el puente está bien instalado.
Probar la URL pelada (sin `?front=`) devuelve a propósito
`{"ok":false,"error":"Falta el parámetro front."}` — no es un error de
instalación, es la respuesta esperada del `doGet` sin parámetros.

Este puente solo transporta datos — guarda o devuelve filas tal cual,
sin interpretar ni transformar nada. Es infraestructura reemplazable: si
se decide dejar de usar Google Sheets, este script se borra sin afectar
en nada al resto de HASH.

### Configuración necesaria

En `js/config.js`, dentro de `dataSource.settings['google-sheets']`:

```js
{
  csvUrl: '...',     // lectura — ya configurado
  writeUrl: '...',   // escritura — pegar acá la URL del puente de Apps Script
}
```

Sin `writeUrl`, HASH funciona normalmente (guarda todo local) pero no
replica hacia la hoja. Instrucciones de instalación: sección anterior.

### Cómo cambiar de almacenamiento (sin tocar el resto del sistema)

1. Crear `js/datasources/miNuevoAlmacenamiento.js`, implementando
   `buildSource(settings)` que devuelva un objeto con
   `fetchConversations()` y, opcionalmente, `saveMessage(mensaje)`
   (ver el contrato en `dataSourceInterface.js`).
2. Registrarlo en `js/datasources/dataSourceFactory.js`, agregándolo al
   objeto `REGISTRY`.
3. En `js/config.js`, cambiar `dataSource.type` al nombre nuevo y
   completar `dataSource.settings` con lo que necesite.

Nada en `storage.js`, `ui.js` ni `app.js` necesita cambiar.

### Formato de columnas en la hoja

El adaptador de Google Sheets busca estas columnas (no distingue
mayúsculas/acentos ni orden). Tu hoja actual usa los nombres en inglés
(`id, front, message, created_at`), que ya están contemplados:

| Campo interno | Nombres de columna aceptados                     |
|----------------|---------------------------------------------------|
| `frontId`      | `frente`, `frontId`, `contexto`, `front`           |
| `texto`        | `mensaje`, `texto`, `contenido`, `message`         |
| `timestamp`    | `fecha`, `timestamp`, `date`, `created_at`         |
| `autor`        | `autor`, `author` (opcional)                       |

Si falta alguna columna en una fila al leer, se usan valores por defecto
razonables (frente `personal`, fecha actual) en vez de descartar la fila
completa. Una fila sin contenido de mensaje sí se descarta, porque no
representa nada para guardar.

## Qué NO incluye esta V1 (a propósito)

- Inteligencia artificial / embeddings / vectores / agentes
- Sincronización entre dispositivos (la app sigue corriendo 100% en el navegador)
- Autenticación
- Búsqueda avanzada
- Cualquier funcionalidad cognitiva
- **Dependencia de servicios externos para la memoria de HASH.** Google
  Sheets es almacenamiento de respaldo reemplazable, no una fuente de la
  que HASH dependa para funcionar, mostrar mensajes o construir su
  memoria (ver el principio de arquitectura más arriba). Si el
  almacenamiento externo falla o se desconecta, HASH sigue funcionando
  igual con su storage local.

Estas piezas se incorporarán en etapas posteriores, sin necesidad de
reorganizar el proyecto, gracias a la separación de responsabilidades
descrita arriba.

## Próximos pasos sugeridos (fuera del alcance de esta entrega)

- Definir diseño visual / branding (paleta `HASH.systems`: lime `#C7F532`,
  black `#0E0E0E`, graphite `#1A1A1A`).
- Permitir editar/eliminar mensajes.
- Exportar/importar el historial como backup.
- Evaluar persistencia más robusta (IndexedDB) si el volumen de datos crece.
