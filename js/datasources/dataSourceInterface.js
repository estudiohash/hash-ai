/**
 * dataSourceInterface.js
 * ---------------------------------------------------------------------------
 * CONTRATO que toda fuente de almacenamiento externo debe cumplir.
 *
 * Este archivo no contiene lógica real: es documentación ejecutable. Sirve
 * como referencia de la forma que debe tener cualquier adaptador nuevo
 * (google-sheets, una base de datos propia, un backend propio, etc.).
 *
 * Cualquier adaptador en js/datasources/ debe exponer un objeto con esta
 * forma:
 *
 *   {
 *     async fetchConversations() {
 *       // LECTURA. Devuelve un array de mensajes ya normalizados al
 *       // esquema interno de HASH, sin importar cómo luce la fuente
 *       // original.
 *       //
 *       // Esquema de salida esperado (uno por mensaje):
 *       //   {
 *       //     frontId:   string  -> a qué frente pertenece (ej: "personal")
 *       //     texto:     string  -> contenido del mensaje
 *       //     timestamp: number  -> milisegundos epoch
 *       //     autor:     string  -> opcional, quién lo escribió
 *       //   }
 *       return [];
 *     },
 *
 *     async saveMessage(mensaje) {
 *       // ESCRITURA (opcional). Recibe un mensaje en el esquema interno
 *       // de HASH (mismo shape que arriba, más `id`) y lo persiste en la
 *       // fuente externa. No transforma ni interpreta el contenido: solo
 *       // lo transporta.
 *       //
 *       // Si la fuente es de solo lectura (o no tiene escritura
 *       // configurada todavía), el adaptador puede no implementar este
 *       // método, o lanzar un error explícito al llamarlo. storage.js
 *       // siempre verifica con `typeof source.saveMessage === 'function'`
 *       // antes de invocarlo, así que es seguro omitirlo.
 *     }
 *   }
 *
 * Reglas para cualquier adaptador nuevo:
 *   1. SOLO se comunica con su fuente externa (fetch, parseo, lo que sea).
 *   2. SIEMPRE devuelve/recibe datos en este esquema normalizado. La
 *      traducción de formato (mapeo de columnas raras, fechas en
 *      distintos formatos, etc.) vive DENTRO del adaptador, nunca en
 *      storage.js.
 *   3. NO conoce a storage.js, ui.js ni app.js. No le importa qué se hace
 *      con los datos después de devolverlos, ni de dónde vino el mensaje
 *      que le piden guardar.
 *   4. Si falla, lanza un error (throw) en vez de fallar en silencio,
 *      para que storage.js pueda decidir cómo manejarlo.
 *   5. NUNCA es la fuente de verdad de la memoria de HASH. La fuente de
 *      verdad es siempre el storage local (ver el README, sección
 *      "Almacenamiento externo"). Un adaptador externo es
 *      almacenamiento adicional, reemplazable y desconectable en
 *      cualquier momento sin pérdida de funcionalidad del núcleo de HASH.
 *
 * Cumpliendo este contrato, agregar una fuente nueva es:
 *   a) crear js/datasources/miNuevaFuente.js
 *   b) registrarla en dataSourceFactory.js
 *   c) apuntar config.js a su `type`
 * Sin tocar storage.js, ui.js ni app.js.
 * ---------------------------------------------------------------------------
 */
