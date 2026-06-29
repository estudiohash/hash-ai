/**
 * app.js — HASH
 * Fuente de verdad: Google Sheets vía Apps Script.
 * localStorage: caché de lectura rápida y respaldo ante fallos momentáneos.
 */

// ── Configuración ──────────────────────────────────────────────────────────

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwqT_7HQlrGJvHv4h2y0UbiUlaO9uQYAjb74mhpxyzqZHdocJwkQWlcr91R2N1U937pFg/exec';

// ── Estado ─────────────────────────────────────────────────────────────────

let FRONTS = [];  // cargado desde Google Sheets al iniciar
let activeFrontId = localStorage.getItem('hash_active_front') || null;
let messages = [];  // mensajes del frente activo, cargados desde Sheets o caché

// ── Caché local ────────────────────────────────────────────────────────────

function cacheGet(frontId) {
  try {
    return JSON.parse(localStorage.getItem('hash_msgs_' + frontId)) || [];
  } catch { return []; }
}

function cacheSet(frontId, msgs) {
  try {
    localStorage.setItem('hash_msgs_' + frontId, JSON.stringify(msgs));
  } catch {}
}

function cacheFrontsGet() {
  try {
    return JSON.parse(localStorage.getItem('hash_fronts')) || [];
  } catch { return []; }
}

function cacheFrontsSet(fronts) {
  try {
    localStorage.setItem('hash_fronts', JSON.stringify(fronts));
  } catch {}
}

// ── Red ────────────────────────────────────────────────────────────────────

async function fetchMessages(frontId) {
  const res = await fetch(APPS_SCRIPT_URL + '?front=' + encodeURIComponent(frontId));
  if (!res.ok) throw new Error('Error ' + res.status);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Error desconocido');
  return data.messages; // [{ id, front, message, created_at }, ...]
}

async function postMessage(msg) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'saveMessage', data: msg }),
  });
  if (!res.ok) throw new Error('Error ' + res.status);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Error desconocido');
  return data;
}

async function fetchFronts() {
  const res = await fetch(APPS_SCRIPT_URL + '?resource=fronts');
  if (!res.ok) throw new Error('Error ' + res.status);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Error desconocido');
  return data.fronts; // [{ id, name, description, created_at }, ...]
}

async function postFront(front) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'saveFront', data: front }),
  });
  if (!res.ok) throw new Error('Error ' + res.status);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Error desconocido');
  return data;
}

// ── Lógica ─────────────────────────────────────────────────────────────────

async function loadFronts() {
  try {
    FRONTS = await fetchFronts();
    cacheFrontsSet(FRONTS);
  } catch (err) {
    FRONTS = cacheFrontsGet();
    if (!FRONTS.length) {
      // Sin red y sin caché: sidebar muestra error pero la app no rompe
      const nav = document.getElementById('front-list');
      const p = document.createElement('p');
      p.className = 'front-list-error';
      p.textContent = 'No se pudieron cargar los chats.';
      nav.appendChild(p);
      return;
    }
  }

  // Determinar frente activo: respetar el guardado en localStorage si existe
  if (!activeFrontId || !FRONTS.find(f => f.id === activeFrontId)) {
    activeFrontId = FRONTS[0]?.id || null;
  }

  renderFrontList();
  renderHeader();
  if (activeFrontId) syncFront(activeFrontId);
}

async function createFront(name, description) {
  const front = {
    id: crypto.randomUUID(),
    name: name.trim(),
    description: description.trim(),
    created_at: new Date().toISOString(),
  };

  await postFront(front);
  FRONTS = [...FRONTS, front];
  cacheFrontsSet(FRONTS);
  renderFrontList();
  selectFront(front.id);
  return front;
}

async function syncFront(frontId) {
  // Cache-first: mostrar caché inmediatamente, luego actualizar en background
  const cached = cacheGet(frontId);
  if (cached.length) {
    messages = cached;
    renderMessages();
    setSyncStatus('success', messages.length + ' mensaje(s) cargado(s).');
  } else {
    setSyncStatus('loading', 'Cargando...');
  }

  try {
    const fresh = await fetchMessages(frontId);
    messages = fresh;
    cacheSet(frontId, messages);
    renderMessages();
    setSyncStatus('success', messages.length + ' mensaje(s) cargado(s).');
  } catch (err) {
    if (!cached.length) {
      setSyncStatus('error', 'Sin conexión. Sin datos en caché.');
    }
    // Si había caché ya está mostrado, no hacer nada
  }
}

async function saveMessage(texto) {
  const msg = {
    id: crypto.randomUUID(),
    front: activeFrontId,
    message: texto,
    created_at: new Date().toISOString(),
  };

  setSyncStatus('loading', 'Guardando...');
  try {
    await postMessage(msg);
    messages = [msg, ...messages];
    cacheSet(activeFrontId, messages);
    renderMessages();
    setSyncStatus('success', 'Guardado.');
  } catch (err) {
    setSyncStatus('error', 'No se pudo guardar. (' + err.message + ')');
  }
}

function selectFront(frontId) {
  activeFrontId = frontId;
  localStorage.setItem('hash_active_front', frontId);
  renderFrontList();
  renderHeader();
  syncFront(frontId);
}

// ── Render ─────────────────────────────────────────────────────────────────

function renderFrontList() {
  const nav = document.getElementById('front-list');
  nav.innerHTML = '';
  FRONTS.forEach(f => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'front-item' + (f.id === activeFrontId ? ' front-item--active' : '');
    btn.textContent = f.name;
    btn.onclick = () => selectFront(f.id);
    nav.appendChild(btn);
  });

  // Botón + Nuevo chat (siempre al final)
  const newBtn = document.createElement('button');
  newBtn.type = 'button';
  newBtn.id = 'new-front-button';
  newBtn.className = 'front-item front-item--new';
  newBtn.textContent = '+ Nuevo chat';
  newBtn.onclick = () => {
    const modal = document.getElementById('new-front-modal');
    const nameInput = document.getElementById('new-front-name');
    const descInput = document.getElementById('new-front-description');
    const modalStatus = document.getElementById('new-front-status');
    nameInput.value = '';
    descInput.value = '';
    modalStatus.textContent = '';
    modal.removeAttribute('hidden');
    nameInput.focus();
  };
  nav.appendChild(newBtn);
}

function renderHeader() {
  const front = FRONTS.find(f => f.id === activeFrontId);
  document.getElementById('active-front-name').textContent = front ? front.name : '—';
  document.getElementById('active-front-description').textContent = front ? front.description : '';
}

function renderMessages() {
  const list = document.getElementById('message-list');
  list.innerHTML = '';
  if (!messages.length) {
    const p = document.createElement('p');
    p.className = 'message-list-empty';
    p.textContent = 'Todavía no hay nada registrado en este frente.';
    list.appendChild(p);
    return;
  }
  [...messages]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .forEach(msg => {
      const item = document.createElement('div');
      item.className = 'message-item';
      item.innerHTML =
        '<span class="message-item-date">' + formatDate(msg.created_at) + '</span>' +
        '<p class="message-item-text">' + escapeHtml(msg.message) + '</p>';
      list.appendChild(item);
    });
}

function setSyncStatus(state, text) {
  const el = document.getElementById('sync-status');
  el.dataset.state = state;
  el.textContent = text;
  const saving = state === 'loading';
  document.getElementById('sync-button').disabled = saving;
  document.getElementById('message-submit').disabled = saving;
}

// ── Utilidades ─────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Sidebar muestra estado de carga mientras llegan los fronts
  const nav = document.getElementById('front-list');
  const loading = document.createElement('p');
  loading.className = 'front-list-loading';
  loading.textContent = 'Cargando...';
  nav.appendChild(loading);

  loadFronts();

  document.getElementById('sync-button').addEventListener('click', () => syncFront(activeFrontId));

  document.getElementById('message-submit').addEventListener('click', async () => {
    const input = document.getElementById('message-input');
    const texto = input.value.trim();
    if (!texto) return;
    input.value = '';
    await saveMessage(texto);
  });

  document.getElementById('message-input').addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      const input = document.getElementById('message-input');
      const texto = input.value.trim();
      if (!texto) return;
      input.value = '';
      await saveMessage(texto);
    }
  });

  // Modal — nuevo chat
  const modal        = document.getElementById('new-front-modal');
  const cancelBtn    = document.getElementById('new-front-cancel');
  const submitBtn    = document.getElementById('new-front-submit');
  const nameInput    = document.getElementById('new-front-name');
  const descInput    = document.getElementById('new-front-description');
  const modalStatus  = document.getElementById('new-front-status');

  function closeModal() {
    modal.setAttribute('hidden', '');
  }
  cancelBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  submitBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    submitBtn.disabled = true;
    cancelBtn.disabled = true;
    modalStatus.textContent = 'Guardando...';
    try {
      await createFront(name, descInput.value);
      closeModal();
    } catch (err) {
      modalStatus.textContent = 'Error al guardar. (' + err.message + ')';
      submitBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitBtn.click();
  });
});
