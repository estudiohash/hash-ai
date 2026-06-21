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
  README.md         Explica el rol de /data y el esquema de los datos
/apps-script/
  Code.gs            Puente de escritura (Google Apps Script). NO corre dentro de HASH.
  README.md          Cómo instalarlo en tu hoja, paso a paso.
/docs/
  decisiones-arquitectura.md   Registro de decisiones de diseño (ADRs)
```

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
| `docs/decisiones-arquitectura.md` | Por qué HASH no depende de servicios externos para su memoria, y por qué hace falta el puente de Apps Script. |

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

## Almacenamiento externo (Google Sheets)

> **Principio de arquitectura:** la memoria de HASH es siempre local.
> Google Sheets es almacenamiento de respaldo, reemplazable, nunca una
> dependencia crítica. Ver el detalle completo en
> [`docs/decisiones-arquitectura.md`](./docs/decisiones-arquitectura.md)
> (ADR-001).

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
Script, publicado como Web App (ver `/apps-script/README.md` para
instalarlo, toma ~2 minutos y es un paso manual único).

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
   POST al puente de Apps Script (writeUrl)
        │
        ▼
   El script agrega una fila: id, front, message, created_at
```

Si la replicación falla (sin `writeUrl` configurada, sin red, el puente
caído, etc.), **el mensaje sigue guardado en HASH igual** — solo no llegó
a copiarse en la hoja. La interfaz muestra el estado de esa operación
debajo del botón de actualizar.

### Configuración necesaria

En `js/config.js`, dentro de `dataSource.settings['google-sheets']`:

```js
{
  csvUrl: '...',     // lectura — ya configurado
  writeUrl: '...',   // escritura — pegar acá la URL del puente de Apps Script
}
```

Sin `writeUrl`, HASH funciona normalmente (guarda todo local) pero no
replica hacia la hoja. Instrucciones completas: `/apps-script/README.md`.

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
- **Dependencia de servicios externos para la memoria de HASH.** Ver
  [`docs/decisiones-arquitectura.md`](./docs/decisiones-arquitectura.md)
  (ADR-001): Google Sheets es almacenamiento de respaldo reemplazable,
  no una fuente de la que HASH dependa para funcionar, mostrar mensajes
  o construir su memoria. Si el almacenamiento externo falla o se
  desconecta, HASH sigue funcionando igual con su storage local.

Estas piezas se incorporarán en etapas posteriores, sin necesidad de
reorganizar el proyecto, gracias a la separación de responsabilidades
descrita arriba.

## Próximos pasos sugeridos (fuera del alcance de esta entrega)

- Definir diseño visual / branding (paleta `HASH.systems`: lime `#C7F532`,
  black `#0E0E0E`, graphite `#1A1A1A`).
- Permitir editar/eliminar mensajes.
- Exportar/importar el historial como backup.
- Evaluar persistencia más robusta (IndexedDB) si el volumen de datos crece.
