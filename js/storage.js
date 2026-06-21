/**
 * storage.js
 * ---------------------------------------------------------------------------
 * Responsabilidad única: leer y escribir datos.
 *
 * Este módulo NO sabe nada de HTML, ni de eventos de UI, ni de cómo se
 * renderiza nada. Solo expone funciones para guardar y recuperar:
 *   - Frentes (contextos: Personal, HASH AI, Method, CALAMBRE, BANGER)
 *   - Mensajes (entradas registradas dentro de un frente)
 *
 * Fuente de verdad: localStorage del navegador. TODO lo que HASH muestra,
 * razona o recuerda sale de acá. Nunca de la fuente externa directamente.
 *
 * Almacenamiento externo (opcional, reemplazable): además, este módulo
 * sabe pedirle datos a la fuente externa activa (configurada en
 * config.js) a través de DataSourceFactory.getActiveSource(), y replicar
 * hacia ella los mensajes que ya se guardaron localmente. NO sabe qué
 * fuente es (Google Sheets, un backend propio, nada...), eso vive
 * encapsulado en js/datasources/. Si mañana cambia o desaparece la fuente
 * externa, este archivo no necesita tocarse: solo cambia config.js, y
 * HASH sigue funcionando con su storage local sin degradarse.
 * Ver /docs/decisiones-arquitectura.md (ADR-001) para el razonamiento
 * completo detrás de esta separación.
 * ---------------------------------------------------------------------------
 */

const Storage = (() => {

  const KEYS = {
    FRONTS: 'hash_fronts',
    MESSAGES: 'hash_messages',
    ACTIVE_FRONT: 'hash_active_front',
  };

  // Frentes por defecto, usados solo la primera vez que se abre HASH
  // en un navegador donde todavía no hay nada guardado.
  const DEFAULT_FRONTS = [
    { id: 'personal', nombre: 'Personal', descripcion: 'Registro personal: experiencia, decisiones y aprendizajes individuales.' },
    { id: 'hash-ai', nombre: 'HASH AI', descripcion: 'Contexto dedicado a la futura capa de inteligencia artificial de HASH.' },
    { id: 'method', nombre: 'Method', descripcion: 'Procesos, metodologías y forma de trabajo.' },
    { id: 'calambre', nombre: 'CALAMBRE', descripcion: 'Frente independiente: CALAMBRE.' },
    { id: 'banger', nombre: 'BANGER', descripcion: 'Frente independiente: BANGER.' },
  ];

  /**
   * Inicializa el storage si es la primera vez que se usa HASH
   * en este navegador (no pisa datos ya existentes).
   */
  function init() {
    if (localStorage.getItem(KEYS.FRONTS) === null) {
      localStorage.setItem(KEYS.FRONTS, JSON.stringify(DEFAULT_FRONTS));
    }
    if (localStorage.getItem(KEYS.MESSAGES) === null) {
      localStorage.setItem(KEYS.MESSAGES, JSON.stringify([]));
    }
    if (localStorage.getItem(KEYS.ACTIVE_FRONT) === null) {
      localStorage.setItem(KEYS.ACTIVE_FRONT, DEFAULT_FRONTS[0].id);
    }
  }

  /** Devuelve la lista completa de frentes. */
  function getFronts() {
    return JSON.parse(localStorage.getItem(KEYS.FRONTS) || '[]');
  }

  /** Devuelve un frente por su id, o null si no existe. */
  function getFrontById(frontId) {
    return getFronts().find((f) => f.id === frontId) || null;
  }

  /** Devuelve el id del frente activo actualmente. */
  function getActiveFrontId() {
    return localStorage.getItem(KEYS.ACTIVE_FRONT);
  }

  /** Guarda cuál es el frente activo. */
  function setActiveFrontId(frontId) {
    localStorage.setItem(KEYS.ACTIVE_FRONT, frontId);
  }

  /** Devuelve todos los mensajes guardados (de todos los frentes). */
  function getAllMessages() {
    return JSON.parse(localStorage.getItem(KEYS.MESSAGES) || '[]');
  }

  /** Devuelve los mensajes de un frente específico, ordenados por fecha. */
  function getMessagesByFront(frontId) {
    return getAllMessages()
      .filter((m) => m.frontId === frontId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Crea y guarda un nuevo mensaje dentro de un frente.
   * Devuelve el mensaje creado.
   */
  function addMessage(frontId, texto) {
    const mensaje = {
      id: generateId(),
      frontId,
      texto,
      timestamp: Date.now(),
    };

    const mensajes = getAllMessages();
    mensajes.push(mensaje);
    localStorage.setItem(KEYS.MESSAGES, JSON.stringify(mensajes));

    return mensaje;
  }

  /** Genera un id simple y suficientemente único para uso local. */
  function generateId() {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // ---------------------------------------------------------------------
  // Sincronización con la fuente de memoria externa (ver config.js y
  // js/datasources/). Esta sección es la única que conoce la existencia
  // de DataSourceFactory; el resto de storage.js sigue sin saber de
  // dónde "vinieron" originalmente los datos.
  // ---------------------------------------------------------------------

  /**
   * Trae mensajes desde la fuente externa activa y los integra al
   * storage local: agrega frentes nuevos que no existieran todavía,
   * y agrega mensajes que no estuvieran ya guardados (evita duplicar
   * en cada sincronización).
   *
   * Devuelve un resumen de lo que pasó: { mensajesNuevos, frentesNuevos }.
   * Si la fuente falla, propaga el error para que app.js decida cómo
   * mostrarlo (esta función no oculta errores).
   */
  async function syncFromExternalSource() {
    const source = DataSourceFactory.getActiveSource();
    const mensajesExternos = await source.fetchConversations();

    const frentesNuevos = ensureFrontsExist(mensajesExternos);
    const mensajesNuevos = mergeExternalMessages(mensajesExternos);

    return { mensajesNuevos, frentesNuevos };
  }

  /**
   * Garantiza que todo frontId visto en los mensajes externos exista
   * como frente. Si no existe, lo crea con un nombre legible derivado
   * del id. Devuelve cuántos frentes nuevos se crearon.
   */
  function ensureFrontsExist(mensajesExternos) {
    const frentesActuales = getFronts();
    const idsActuales = new Set(frentesActuales.map((f) => f.id));

    const idsVistos = new Set(mensajesExternos.map((m) => m.frontId));
    const idsFaltantes = [...idsVistos].filter((id) => id && !idsActuales.has(id));

    if (idsFaltantes.length === 0) return 0;

    const nuevos = idsFaltantes.map((id) => ({
      id,
      nombre: idToLabel(id),
      descripcion: 'Frente creado automáticamente desde la fuente externa.',
    }));

    localStorage.setItem(KEYS.FRONTS, JSON.stringify([...frentesActuales, ...nuevos]));
    return nuevos.length;
  }

  function idToLabel(id) {
    return id
      .split('-')
      .filter(Boolean)
      .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  }

  /**
   * Combina los mensajes externos con los ya guardados localmente,
   * evitando duplicados. Un mensaje externo se considera "el mismo" que
   * uno ya guardado si coincide frontId + texto + timestamp exactos.
   */
  function mergeExternalMessages(mensajesExternos) {
    const mensajesActuales = getAllMessages();

    const yaExiste = (externo) =>
      mensajesActuales.some((local) =>
        local.frontId === externo.frontId &&
        local.texto === externo.texto &&
        local.timestamp === externo.timestamp
      );

    const nuevos = mensajesExternos
      .filter((externo) => !yaExiste(externo))
      .map((externo) => ({
        id: generateId(),
        frontId: externo.frontId,
        texto: externo.texto,
        timestamp: externo.timestamp,
        autor: externo.autor || null,
        origen: 'externo',
      }));

    if (nuevos.length > 0) {
      localStorage.setItem(KEYS.MESSAGES, JSON.stringify([...mensajesActuales, ...nuevos]));
    }

    return nuevos.length;
  }

  /**
   * Replica un mensaje (ya guardado localmente por addMessage) hacia el
   * almacenamiento externo activo, si esa fuente sabe escribir.
   *
   * Esto es SIEMPRE secundario: el mensaje ya existe y ya es visible en
   * HASH desde el momento en que addMessage() lo guardó localmente. Si
   * esta función falla (sin red, fuente caída, fuente sin writeUrl
   * configurada, etc.), HASH no pierde el mensaje ni dejar de funcionar:
   * solo no llegó a replicarse hacia afuera. Por eso esta función no
   * modifica nada del storage local, solo informa el resultado.
   *
   * Devuelve { replicado: boolean, motivo?: string }.
   */
  async function replicateToExternalSource(mensaje) {
    const source = DataSourceFactory.getActiveSource();

    if (typeof source.saveMessage !== 'function') {
      return { replicado: false, motivo: 'La fuente activa no admite escritura.' };
    }

    try {
      await source.saveMessage(mensaje);
      return { replicado: true };
    } catch (err) {
      return { replicado: false, motivo: err.message };
    }
  }

  return {
    init,
    getFronts,
    getFrontById,
    getActiveFrontId,
    setActiveFrontId,
    getAllMessages,
    getMessagesByFront,
    addMessage,
    syncFromExternalSource,
    replicateToExternalSource,
  };

})();
