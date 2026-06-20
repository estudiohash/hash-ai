/**
 * app.js — HASH
 * Fuente de verdad: Google Sheets vía Apps Script.
 * localStorage: caché de lectura rápida y respaldo ante fallos momentáneos.
 */

// ── Configuración ──────────────────────────────────────────────────────────

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbykkY8Cc9_iLQ5F5cGiL3iFXAol_HNIc8TOCia547S2NHAuboN0Bc745zS4KUjF0yjG3Q/exec';

const FRONTS = [
  { id: 'personal',   name: 'Personal',   description: 'Reflexiones y vida personal.' },
  { id: 'hash-ai',    name: 'HASH AI',    description: 'Desarrollo del proyecto HASH.' },
  { id: 'method',     name: 'Method',     description: 'Procesos, metodologías y forma de trabajo.' },
  { id: 'calambre',   name: 'CALAMBRE',   description: '' },
  { id: 'banger',     name: 'BANGER',     description: '' },
];

// ── Estado ─────────────────────────────────────────────────────────────────

let activeFrontId = localStorage.getItem('hash_active_front') || FRONTS[0].id;
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

// ── Lógica ─────────────────────────────────────────────────────────────────

async function syncFront(frontId) {
  setSyncStatus('loading', 'Actualizando...');
  try {
    messages = await fetchMessages(frontId);
    cacheSet(frontId, messages);
    setSyncStatus('success', messages.length + ' mensaje(s) cargado(s).');
  } catch (err) {
    messages = cacheGet(frontId);
    setSyncStatus('error', 'Sin conexión. Mostrando caché local.');
  }
  renderMessages();
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
  renderFrontList();
  renderHeader();

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

  syncFront(activeFrontId);
});
