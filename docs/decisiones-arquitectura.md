# Decisiones de arquitectura — HASH

Este documento registra decisiones de diseño que no son obvias solo
leyendo el código, y que cualquier persona (o IA) que trabaje en HASH
debería conocer antes de proponer cambios.

---

## ADR-001 — La memoria de HASH no depende de servicios externos

**Estado:** vigente.

### Contexto

HASH usa Google Sheets para tener una copia visible y editable a mano de
las conversaciones registradas. Esto generó una ambigüedad real: ¿Sheets
es parte de la memoria de HASH, o es solo un lugar donde esa memoria se
guarda también?

### Decisión

**HASH no depende de ningún servicio externo para construir, modificar o
enriquecer su memoria.** La memoria pertenece a HASH, no a la plataforma
donde se almacena.

En términos concretos:

1. **La fuente de verdad es siempre el storage local** (`localStorage`
   hoy, lo que sea en el futuro). Todo lo que HASH muestra, recuerda o
   eventualmente razone, sale de ahí — nunca de una consulta en vivo a
   un servicio externo.

2. **Google Sheets es almacenamiento, no inteligencia.** Hoy cumple el
   rol de respaldo/replicación visible y editable a mano. No es,
   ni va a ser, una fuente de la que HASH "aprenda" o desde la que
   construya razonamiento. Es un destino donde se copian datos que ya
   existen en HASH, y un origen del que se pueden traer datos que un
   humano cargó ahí a mano — nada más.

3. **Cualquier servicio externo es reemplazable por definición.** Si
   Google Sheets deja de estar disponible, mal configurado, o se decide
   reemplazarlo por otra cosa, HASH debe seguir funcionando exactamente
   igual con su storage local. Ningún servicio externo puede ser un punto
   único de falla para el funcionamiento de HASH.

4. **La inteligencia futura de HASH se construye sobre su propia memoria
   acumulada**, no sobre consultas permanentes a APIs o servicios de
   terceros. Cuando llegue la etapa de IA (fuera del alcance de esta
   entrega), el conocimiento de base es lo que HASH ya capturó y
   almacenó — no una dependencia en tiempo real de un proveedor externo.

### Cómo se refleja esto en el código

- `js/config.js` configura **almacenamiento externo**, explícitamente
  documentado como reemplazable y no crítico.
- `js/datasources/dataSourceInterface.js` documenta el contrato como
  algo que cualquier fuente de almacenamiento debe cumplir — el nombre
  evita deliberadamente términos como "memoria" o "conocimiento" para no
  sugerir que ahí vive la inteligencia de HASH.
- `js/storage.js` mantiene el storage local como único punto de lectura
  para la UI. La sincronización (`syncFromExternalSource`) y la
  replicación (`replicateToExternalSource`) son operaciones explícitas,
  separadas, y que nunca bloquean ni condicionan el funcionamiento normal
  de HASH si fallan.
- El botón "Guardar" en la UI primero persiste localmente (operación que
  nunca depende de la red) y solo después intenta replicar hacia el
  almacenamiento externo, de forma asíncrona y best-effort.

### Qué NO se debe hacer, en línea con esta decisión

- No hacer que HASH dependa de Google Sheets (o cualquier otro servicio)
  para mostrar, guardar o recuperar un mensaje en el momento en que el
  usuario interactúa con la app.
- No diseñar funcionalidades futuras (búsqueda, IA, razonamiento) que
  requieran consultar un servicio externo en tiempo real como parte de su
  funcionamiento normal.
- No tratar ningún adaptador de `js/datasources/` como insustituible.
  Si reemplazar uno rompe algo fuera de esa carpeta, eso es un indicio de
  que se violó esta decisión.

---

## ADR-002 — Por qué hace falta un puente de Apps Script para escribir

**Estado:** vigente.

### Contexto

El link de "Publicar en la web > CSV" de Google Sheets es de **solo
lectura**: es una limitación de la plataforma, no una decisión de diseño
de HASH. No existe forma de hacer un `POST` a ese link para insertar
filas.

### Decisión

Para que HASH pueda replicar mensajes hacia Sheets, se usa un pequeño
script de Google Apps Script, publicado como Web App, que actúa
exclusivamente como **puente de transporte**: recibe un mensaje y agrega
una fila. No interpreta, no decide, no transforma contenido, y no es
parte del código de HASH (vive en `/apps-script/`, fuera de `js/`).

Este puente es, en sí mismo, un ejemplo de "servicio externo reemplazable"
según ADR-001: si mañana se cambia de almacenamiento, este script se
borra sin afectar en nada la arquitectura de HASH.
