# HASH

Herramienta personal de captura de conocimiento.

## Qué es

HASH almacena ideas, decisiones, procesos y aprendizajes organizados por frentes de trabajo. No es un chatbot. No es una plataforma. Es una base de conocimiento personal.

## Estructura

```
hash/
├── index.html
├── css/
│   └── style.css
└── js/
    ├── storage.js
    ├── ui.js
    └── app.js
```

Nada más.

## Cómo funciona

**Fuente de verdad:** Google Sheets vía Apps Script.  
**Caché local:** localStorage como respaldo ante fallos momentáneos (caída de red, refresco accidental). No es fuente de verdad.

Flujo de escritura:
```
HASH → Apps Script → Google Sheets → actualiza caché local
```

Flujo de lectura:
```
HASH → Apps Script → Google Sheets
           ↓ si falla
        caché local (localStorage)
```

## Google Sheets

Columnas esperadas: `id`, `front`, `message`, `created_at`.

El Apps Script debe responder a:

- `GET` → devolver `{ fronts: [...], messages: [...] }`
- `POST` con `{ action: "saveMessage", data: { id, front, message, created_at } }` → guardar fila y devolver confirmación

## Apps Script

URL configurada en `js/storage.js` → constante `APPS_SCRIPT_URL`.

## Frentes

Los frentes se crean y administran directamente en Google Sheets. HASH los lee y los muestra. No hay UI para crearlos desde la app todavía.

## Prioridades actuales

1. Capturar información.
2. Guardar información.
3. Organizar información.
4. Recuperar información.

La arquitectura futura se decidirá cuando existan meses de información acumulada y necesidades reales detectadas.
# hash-ai
