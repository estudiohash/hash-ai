# /data

Esta carpeta contiene datos estáticos/semilla del proyecto, NO la base de datos en vivo.

## ¿Por qué?

En V1, HASH no tiene backend ni servidor: toda la persistencia real ocurre en el
`localStorage` del navegador (ver `js/storage.js`). Esta carpeta sirve para:

1. **Definir la configuración inicial** del sistema (por ejemplo, qué frentes existen).
2. Servir como punto de partida fácil de leer/editar a mano antes de que exista
   cualquier UI de administración.
3. Dejar un lugar claro y ya preparado para el día en que HASH pase a tener
   persistencia en archivos o en una base de datos real (export/import, backups, etc).

## Archivos

- `fronts.json` — Lista de los frentes (contextos) disponibles: Personal, HASH AI,
  Method, CALAMBRE, BANGER. Es la semilla que `storage.js` usa la primera vez que
  se inicializa el proyecto en un navegador nuevo (si `localStorage` está vacío).

## Esquema de un mensaje (tal como se guarda en localStorage)

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

## Esquema de un frente

```json
{
  "id": "personal",
  "nombre": "Personal",
  "descripcion": "Registro personal: experiencia, decisiones y aprendizajes individuales."
}
```

## Crecimiento futuro

Cuando HASH necesite persistencia real (archivo, base de datos, sync), esta carpeta
es el lugar natural para:
- Esquemas de migración
- Exports/backups en JSON
- Seeds de entornos de desarrollo/test

No se debe romper la compatibilidad del esquema de mensaje/frente sin antes
documentar la migración aquí.
