/**
 * app.js — HASH
 * Fuente de verdad: Google Sheets vía Apps Script.
 * localStorage: caché ante fallos momentáneos.
 */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbykkY8Cc9_iLQ5F5cGiL3iFXAol_HNIc8TOCia547S2NHAuboN0Bc745zS4KUjF0yjG3Q/exec';

// ── Estado ─────────────────────────────────────────────────────────────────

let fronts = [];
let activeFrontId = localStorage.getItem('hash_active_front') || null;
let messages = [];

// ── Caché ──────────────────────────────────────────────────────────────────

function cacheGetFronts() {
  try { return JSON.parse(localStorage.getItem('hash_fronts')) || []; } catch { return []; }
}
function cacheSetFronts(f) {
  try { localStorage.setItem('hash_fronts', JSON.stringify(f)); } catch {}
}
function cacheGetMessages(frontId) {
  try { return JSON.parse(localStorage.getItem('hash_msgs_' + frontId)) || []; } catch { return []; }
}
function cacheSetMessages(frontId, msgs) {
  try { localStorage.setItem('hash_msgs_' + frontId, JSON.stringify(msgs)); } catch {}
}

// ── Red ────────────────────────────────────────────────────────────────────

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error ' + res.status);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Error desconocido');
  return data;
}

async function apiPost(body) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Error ' + res.status);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Error desconocido');
  return data;
}

// ── Lógica ─────────────────────────────────────────────────────────────────

async function loadFronts() {
  try {
    const data = await apiFetch(APPS_SCRIPT_URL);
    fronts = data.fronts || [];
    cacheSetFronts(fronts);
  } catch {
    fronts = cacheGetFronts();
  }

  if (!activeFrontId || !fronts.find(f => f.id === activeFrontId)) {
    activeFrontId = fronts.length ? fronts[0].id : null;
  }
}

async function loadMessages(frontId) {
  if (!frontId) { messages = []; return; }
  try {
    const data = await apiFetch(APPS_SCRIPT_URL + '?front=' + encodeURIComponent(frontId));
    messages = data.messages || [];
    cacheSetMessages(frontId, messages);
  } catch {
    messages = cacheGetMessages(frontId);
  }
}

async function createFront(name) {
  const data = await apiPost({ action: 'createFront', name });
  const newFront = { id: name, name: name };
  fronts = [...fronts, newFront];
  cacheSetFronts(fronts);
  return newFront;
}

async function saveMessage(texto) {
  const msg = {
    id: crypto.randomUUID(),
    front: activeFrontId,
    message: texto,
    created_at: new Date().toISOString(),
  };
  await apiPost({ action: 'saveMessage', data: msg });
  messages = [msg, ...messages];
  cacheSetMessages(activeFrontId, messages);
  return msg;
}

// ── Render ─────────────────────────────────────────────────────────────────

function renderFrontList() {
  const nav = document.getElementById('front-list');
  nav.innerHTML = '';

  fronts.forEach(f => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'front-item' + (f.id === activeFrontId ? ' front-item--active' : '');
    btn.textContent = f.name;
    btn.onclick = () => selectFront(f.id);
    nav.appendChild(btn);
  });

  // Botón nuevo frente
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'front-add';
  addBtn.textContent = '+ Nuevo frente';
  addBtn.onclick = handleNewFront;
  nav.appendChild(addBtn);
}

function renderHeader() {
  const front = fronts.find(f => f.id === activeFrontId);
  document.getElementById('active-front-name').textContent = front ? front.name : '—';
  document.getElementById('active-front-description').textContent = '';
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
  const busy = state === 'loading';
  document.getElementById('sync-button').disabled = busy;
  document.getElementById('message-submit').disabled = busy;
}

// ── Handlers ───────────────────────────────────────────────────────────────

async function selectFront(frontId) {
  activeFrontId = frontId;
  localStorage.setItem('hash_active_front', frontId);
  renderFrontList();
  renderHeader();
  setSyncStatus('loading', 'Cargando...');
  await loadMessages(frontId);
  renderMessages();
  setSyncStatus('success', messages.length + ' mensaje(s).');
}

async function handleNewFront() {
  const name = prompt('Nombre del nuevo frente:');
  if (!name || !name.trim()) return;
  setSyncStatus('loading', 'Creando frente...');
  try {
    const front = await createFront(name.trim());
    activeFrontId = front.id;
    localStorage.setItem('hash_active_front', front.id);
    messages = [];
    renderFrontList();
    renderHeader();
    renderMessages();
    setSyncStatus('success', 'Frente creado.');
  } catch (err) {
    setSyncStatus('error', 'No se pudo crear el frente. (' + err.message + ')');
  }
}

async function handleSync() {
  setSyncStatus('loading', 'Actualizando...');
  await loadFronts();
  renderFrontList();
  renderHeader();
  await loadMessages(activeFrontId);
  renderMessages();
  setSyncStatus('success', messages.length + ' mensaje(s).');
}

async function handleSaveMessage() {
  const input = document.getElementById('message-input');
  const texto = input.value.trim();
  if (!texto || !activeFrontId) return;
  input.value = '';
  setSyncStatus('loading', 'Guardando...');
  try {
    await saveMessage(texto);
    renderMessages();
    setSyncStatus('success', 'Guardado.');
  } catch (err) {
    setSyncStatus('error', 'No se pudo guardar. (' + err.message + ')');
  }
}

// ── Init ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('sync-button').addEventListener('click', handleSync);

  document.getElementById('message-submit').addEventListener('click', handleSaveMessage);

  document.getElementById('message-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveMessage();
  });

  await handleSync();
});

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
