/**
 * ui.js
 * ---------------------------------------------------------------------------
 * Responsabilidad única: renderizar datos en el DOM y exponer referencias
 * a los elementos de la interfaz.
 *
 * Este módulo NO sabe nada de cómo se guardan los datos (eso es storage.js).
 * Solo recibe datos ya listos y los pinta en pantalla, o lee lo que el
 * usuario escribió en el formulario.
 * ---------------------------------------------------------------------------
 */

const UI = (() => {

  // Referencias a elementos del DOM, resueltas una sola vez.
  const elements = {
    frontList: document.getElementById('front-list'),
    activeFrontName: document.getElementById('active-front-name'),
    activeFrontDescription: document.getElementById('active-front-description'),
    messageList: document.getElementById('message-list'),
    messageForm: document.getElementById('message-form'),
    messageInput: document.getElementById('message-input'),
    syncButton: document.getElementById('sync-button'),
    syncStatus: document.getElementById('sync-status'),
  };

  /**
   * Dibuja el listado de frentes en la barra lateral.
   * @param {Array} fronts - lista de frentes
   * @param {String} activeFrontId - id del frente actualmente activo
   * @param {Function} onSelectFront - callback(frontId) al hacer click
   */
  function renderFrontList(fronts, activeFrontId, onSelectFront) {
    elements.frontList.innerHTML = '';

    fronts.forEach((front) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'front-item';
      item.textContent = front.nombre;
      item.dataset.frontId = front.id;

      if (front.id === activeFrontId) {
        item.classList.add('front-item--active');
      }

      item.addEventListener('click', () => onSelectFront(front.id));
      elements.frontList.appendChild(item);
    });
  }

  /** Actualiza el encabezado con el nombre/descripción del frente activo. */
  function renderActiveFrontHeader(front) {
    if (!front) return;
    elements.activeFrontName.textContent = front.nombre;
    elements.activeFrontDescription.textContent = front.descripcion || '';
  }

  /**
   * Dibuja la lista de mensajes de un frente.
   * @param {Array} messages - mensajes ya filtrados/ordenados del frente activo
   */
  function renderMessages(messages) {
    elements.messageList.innerHTML = '';

    if (messages.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'message-list-empty';
      empty.textContent = 'Todavía no hay nada registrado en este frente.';
      elements.messageList.appendChild(empty);
      return;
    }

    messages.forEach((mensaje) => {
      const item = document.createElement('article');
      item.className = 'message-item';

      const meta = document.createElement('time');
      meta.className = 'message-item-date';
      meta.textContent = formatDate(mensaje.timestamp);

      const texto = document.createElement('p');
      texto.className = 'message-item-text';
      texto.textContent = mensaje.texto;

      item.appendChild(meta);
      item.appendChild(texto);
      elements.messageList.appendChild(item);
    });

    // Mantener el scroll abajo, mostrando el mensaje más reciente.
    elements.messageList.scrollTop = elements.messageList.scrollHeight;
  }

  /** Lee y limpia el contenido actual del input de mensaje. */
  function readAndClearInput() {
    const valor = elements.messageInput.value.trim();
    elements.messageInput.value = '';
    return valor;
  }

  /** Registra el handler de envío del formulario de mensajes. */
  function onMessageSubmit(callback) {
    elements.messageForm.addEventListener('submit', (event) => {
      event.preventDefault();
      callback();
    });
  }

  /** Registra el handler de click del botón "Actualizar desde fuente externa". */
  function onSyncRequested(callback) {
    elements.syncButton.addEventListener('click', callback);
  }

  /** Muestra el estado actual de una operación contra el almacenamiento externo. */
  function renderSyncStatus(status, detail) {
    const mensajesPorDefecto = {
      idle: '',
      loading: 'Trabajando con el almacenamiento externo...',
      success: 'Listo.',
      error: 'Ocurrió un error con el almacenamiento externo.',
    };

    elements.syncStatus.textContent = detail || mensajesPorDefecto[status] || '';
    elements.syncStatus.dataset.state = status;
    elements.syncButton.disabled = status === 'loading';
  }

  function formatDate(timestamp) {
    const fecha = new Date(timestamp);
    return fecha.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return {
    renderFrontList,
    renderActiveFrontHeader,
    renderMessages,
    readAndClearInput,
    onMessageSubmit,
    onSyncRequested,
    renderSyncStatus,
  };

})();
