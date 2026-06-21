/**
 * app.js
 * ---------------------------------------------------------------------------
 * Punto de entrada y orquestador de HASH.
 *
 * Este archivo NO guarda datos directamente (eso es storage.js), no sabe
 * de dónde viene el almacenamiento externo (eso es config.js +
 * js/datasources/) y no manipula el DOM directamente (eso es ui.js). Su
 * única responsabilidad es coordinar: reacciona a acciones del usuario,
 * pide/guarda datos a través de Storage, y le pide a UI que renderice el
 * resultado.
 *
 * La memoria de HASH es siempre local (ver storage.js y
 * /docs/decisiones-arquitectura.md, ADR-001). El almacenamiento externo
 * es solo una replicación/respaldo: si falla, HASH sigue funcionando
 * igual con lo que ya guardó localmente.
 * ---------------------------------------------------------------------------
 */

(() => {

  function init() {
    Storage.init();

    const activeFrontId = Storage.getActiveFrontId();

    renderFrontList(activeFrontId);
    renderActiveFront(activeFrontId);

    UI.onMessageSubmit(handleNewMessage);
    UI.onSyncRequested(handleSyncRequested);

    // Sincroniza con la fuente externa configurada en config.js al
    // arrancar, sin bloquear el render inicial (que ya usó lo que había
    // en localStorage). Si falla, se muestra el error pero la app sigue
    // siendo usable con los datos locales.
    handleSyncRequested();
  }

  function renderFrontList(activeFrontId) {
    const fronts = Storage.getFronts();
    UI.renderFrontList(fronts, activeFrontId, handleSelectFront);
  }

  function renderActiveFront(frontId) {
    const front = Storage.getFrontById(frontId);
    const messages = Storage.getMessagesByFront(frontId);

    UI.renderActiveFrontHeader(front);
    UI.renderMessages(messages);
  }

  function handleSelectFront(frontId) {
    Storage.setActiveFrontId(frontId);
    renderFrontList(frontId);
    renderActiveFront(frontId);
  }

  /**
   * Guarda un mensaje nuevo. El guardado local (addMessage) es la
   * operación que importa: es síncrona y nunca depende de la red, así
   * que el mensaje queda visible en HASH inmediatamente. Después,
   * de forma asíncrona y no bloqueante, se intenta replicar hacia el
   * almacenamiento externo activo (si lo hay) — si eso falla, el
   * mensaje sigue estando guardado en HASH igual.
   */
  async function handleNewMessage() {
    const texto = UI.readAndClearInput();
    if (!texto) return;

    const activeFrontId = Storage.getActiveFrontId();
    const mensaje = Storage.addMessage(activeFrontId, texto);

    renderActiveFront(activeFrontId);

    UI.renderSyncStatus('loading', 'Guardando en almacenamiento externo...');
    const resultado = await Storage.replicateToExternalSource(mensaje);

    if (resultado.replicado) {
      UI.renderSyncStatus('success', 'Mensaje guardado también en el almacenamiento externo.');
    } else {
      UI.renderSyncStatus('error', `Mensaje guardado en HASH, pero no se replicó afuera (${resultado.motivo}).`);
    }
  }

  /**
   * Pide a storage.js que traiga lo último de la fuente externa activa
   * (configurada en config.js) y refresca la pantalla si llegó algo nuevo.
   */
  async function handleSyncRequested() {
    UI.renderSyncStatus('loading', 'Actualizando desde el almacenamiento externo...');

    try {
      const resultado = await Storage.syncFromExternalSource();
      const activeFrontId = Storage.getActiveFrontId();

      renderFrontList(activeFrontId);
      renderActiveFront(activeFrontId);

      const detalle = `${resultado.mensajesNuevos} mensaje(s) nuevo(s)` +
        (resultado.frentesNuevos > 0 ? `, ${resultado.frentesNuevos} frente(s) nuevo(s)` : '');
      UI.renderSyncStatus('success', detalle);
    } catch (err) {
      UI.renderSyncStatus('error', err.message);
    }
  }

  document.addEventListener('DOMContentLoaded', init);

})();
