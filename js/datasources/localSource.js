/**
 * localSource.js
 * ---------------------------------------------------------------------------
 * Adaptador de almacenamiento externo "vacío", usado cuando
 * HASH_CONFIG.dataSource.type = 'local'.
 *
 * Implementa el contrato de dataSourceInterface.js de forma mínima:
 *   - fetchConversations() no trae nada nuevo (devuelve []), porque en
 *     modo local los mensajes ya viven directamente en localStorage
 *     (gestionados por storage.js) y no hace falta "sincronizar" nada.
 *   - No implementa saveMessage(): es opcional según el contrato, y en
 *     modo local no hay ningún destino externo donde escribir. storage.js
 *     verifica si el método existe antes de llamarlo.
 *
 * Existe para que cambiar entre 'google-sheets' y 'local' sea solo una
 * línea en config.js, sin ifs especiales en storage.js ni en app.js.
 * ---------------------------------------------------------------------------
 */

const LocalSource = (() => {

  function buildSource() {
    return {
      async fetchConversations() {
        return [];
      },
    };
  }

  return { buildSource };

})();
