// ============================================================
//  LA CIVELLE — app.js
// ============================================================
//
//  CONFIGURATION
//  Remplacer GITHUB_TOKEN par un Personal Access Token GitHub
//  (Settings → Developer settings → Personal access tokens → Fine-grained)
//  Permissions requises : Contents → Read and write
//
// Token stocké dans localStorage — saisi une fois via la modale de configuration
function getToken() { return localStorage.getItem('civelle_gh_token') || ''; }
const GITHUB_REPO  = 'RemsT/LaCivelle';
const EVENTS_FILE  = 'events.json';

// Couleurs disponibles pour les séjours
const COLORS = [
  { name: 'Océan',    value: '#1a6b8a' },
  { name: 'Corail',   value: '#e74c3c' },
  { name: 'Sable',    value: '#e67e22' },
  { name: 'Palmier',  value: '#27ae60' },
  { name: 'Lavande',  value: '#8e44ad' },
  { name: 'Rose',     value: '#e91e8c' },
  { name: 'Ardoise',  value: '#2c3e50' },
  { name: 'Turquoise',value: '#16a085' },
];

// ============================================================
//  ÉTAT GLOBAL
// ============================================================
const STORAGE_KEY = 'civelle_checklist_v1';
const state = {
  currentStep:    0,
  calendar:       null,
  events:         [],
  eventsSha:      null,   // SHA du fichier events.json sur GitHub
  pendingStart:   null,
  pendingEnd:     null,
  selectedColor:  COLORS[0].value,
  currentEventId: null,
};

// ============================================================
//  ONGLET — NAVIGATION
// ============================================================
function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  document.getElementById('panel-' + name).classList.add('active');
  const btn = document.getElementById('tab-' + name);
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');

  // Re-render le calendrier quand on revient sur cet onglet
  if (name === 'calendar' && state.calendar) {
    setTimeout(() => state.calendar.updateSize(), 50);
  }
}

// ============================================================
//  GITHUB API — LECTURE / ÉCRITURE events.json
// ============================================================
async function fetchEvents() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${EVENTS_FILE}`,
      { headers: { Authorization: `token ${getToken()}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    state.eventsSha = data.sha;
    return JSON.parse(atob(data.content.replace(/\n/g, '')));
  } catch (e) {
    console.error('fetchEvents:', e);
    return [];
  }
}

async function saveEvents(events) {
  const content = btoa(new TextEncoder().encode(JSON.stringify(events, null, 2)).reduce((s, b) => s + String.fromCharCode(b), ''));
  const body = {
    message: 'Mise à jour des séjours',
    content,
    sha: state.eventsSha,
  };
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${EVENTS_FILE}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${getToken()}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    state.eventsSha = data.content.sha;
    return true;
  } catch (e) {
    console.error('saveEvents:', e);
    return false;
  }
}

// ============================================================
//  CALENDRIER FULLCALENDAR
// ============================================================
async function initCalendar() {
  const events = await fetchEvents();
  state.events = events;

  const calendarEl = document.getElementById('fullcalendar');
  const cal = new FullCalendar.Calendar(calendarEl, {
    locale: 'fr',
    initialView: window.innerWidth < 600 ? 'listMonth' : 'dayGridMonth',
    headerToolbar: {
      left:   'prev,next today',
      center: 'title',
      right:  window.innerWidth < 600 ? 'dayGridMonth,listMonth' : 'dayGridMonth,multiMonthYear,listMonth',
    },
    buttonText: { today: "Aujourd'hui", month: 'Mois', year: 'Année', list: 'Liste' },
    views: {
      multiMonthYear: {
        type: 'multiMonth',
        duration: { years: 1 },
        multiMonthMaxColumns: window.innerWidth < 768 ? 1 : 2,
        multiMonthMinWidth: 280,
      },
    },
    height: 'auto',
    selectable: true,
    selectMirror: true,
    unselectAuto: true,
    events: events.map(evtToFC),
    eventDisplay: 'block',
    displayEventTime: false,

    // Clic sur une plage → ouvre modale ajout
    select(info) {
      // Soustraire 1 jour car FullCalendar end est exclusif
      const endDate = new Date(info.endStr);
      endDate.setDate(endDate.getDate() - 1);
      state.pendingStart = info.startStr;
      state.pendingEnd   = endDate.toISOString().slice(0, 10);
      openEventModal(info.startStr, endDate.toISOString().slice(0, 10));
    },

    // Clic sur un événement existant → ouvre modale détail
    eventClick(info) {
      state.currentEventId = info.event.id;
      openDetailModal(info.event);
    },
  });

  cal.render();
  state.calendar = cal;
}

// Convertit un event stocké en objet FullCalendar
function evtToFC(evt) {
  // End est exclusif dans FullCalendar dayGrid
  const endDate = new Date(evt.end + 'T00:00:00');
  endDate.setDate(endDate.getDate() + 1);
  return {
    id:              evt.id,
    title:           evt.title,
    start:           evt.start,
    end:             endDate.toISOString().slice(0, 10),
    backgroundColor: evt.color,
    borderColor:     evt.color,
    textColor:       '#ffffff',
  };
}

// ============================================================
//  MODALE AJOUT SÉJOUR
// ============================================================
function buildColorPicker() {
  const container = document.getElementById('color-picker');
  container.innerHTML = '';
  COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-swatch' + (c.value === state.selectedColor ? ' selected' : '');
    btn.style.background = c.value;
    btn.title = c.name;
    btn.setAttribute('aria-label', c.name);
    btn.onclick = () => {
      state.selectedColor = c.value;
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      btn.classList.add('selected');
    };
    container.appendChild(btn);
  });
}

function openEventModal(start, end) {
  document.getElementById('ev-title').value = '';
  document.getElementById('ev-start').value = start;
  document.getElementById('ev-end').value   = end;
  state.selectedColor = COLORS[0].value;
  buildColorPicker();
  document.getElementById('event-modal').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('ev-title').focus();
}

function closeEventModal() {
  document.getElementById('event-modal').classList.add('hidden');
  document.getElementById('modal-overlay').classList.add('hidden');
  if (state.calendar) state.calendar.unselect();
}

async function saveEvent() {
  const title = document.getElementById('ev-title').value.trim();
  const start = document.getElementById('ev-start').value;
  const end   = document.getElementById('ev-end').value;

  if (!title) { document.getElementById('ev-title').focus(); return; }
  if (!start || !end || end < start) {
    alert('Veuillez saisir des dates valides.');
    return;
  }

  const newEvt = {
    id:    Date.now().toString(),
    title,
    start,
    end,
    color: state.selectedColor,
  };

  // Afficher immédiatement dans le calendrier
  state.calendar.addEvent(evtToFC(newEvt));
  state.events.push(newEvt);
  closeEventModal();

  // Sauvegarder en arrière-plan
  const ok = await saveEvents(state.events);
  if (!ok) openTokenModal();
}

// ============================================================
//  MODALE DÉTAIL / SUPPRESSION
// ============================================================
function openDetailModal(fcEvent) {
  document.getElementById('detail-title').textContent = fcEvent.title;

  const start = new Date(fcEvent.startStr + 'T12:00:00');
  // Recalculer la vraie fin (end FullCalendar est exclusif)
  const storedEvt = state.events.find(e => e.id === fcEvent.id);
  const endStr    = storedEvt ? storedEvt.end : fcEvent.startStr;
  const end       = new Date(endStr + 'T12:00:00');

  const fmt = d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('detail-dates').textContent =
    start.toDateString() === end.toDateString()
      ? fmt(start)
      : `${fmt(start)} → ${fmt(end)}`;

  document.getElementById('detail-modal').classList.remove('hidden');
  document.getElementById('detail-overlay').classList.remove('hidden');
}

function closeDetailModal() {
  document.getElementById('detail-modal').classList.add('hidden');
  document.getElementById('detail-overlay').classList.add('hidden');
  state.currentEventId = null;
}

async function deleteEvent() {
  if (!confirm('Supprimer ce séjour ?')) return;

  const fcEvt = state.calendar.getEventById(state.currentEventId);
  if (fcEvt) fcEvt.remove();
  state.events = state.events.filter(e => e.id !== state.currentEventId);
  closeDetailModal();

  const ok = await saveEvents(state.events);
  if (!ok) openTokenModal();
}

// ============================================================
//  UTILITAIRES CHECKLIST
// ============================================================
function loadCheckState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveCheckState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
function totalItems()      { return CHECKLIST_DATA.reduce((n, s) => n + s.items.length, 0); }
function doneItems()       { const s = loadCheckState(); return Object.keys(s).filter(k => s[k]).length; }
function isStepDone(i)     { const s = loadCheckState(); return CHECKLIST_DATA[i].items.every(it => s[it.id]); }

// ============================================================
//  CHECK-OUT — BARRE DE PROGRESSION
// ============================================================
function updateProgressBar() {
  const done  = doneItems();
  const total = totalItems();
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-label').textContent = `${done} / ${total} tâches`;
  const cur = state.currentStep;
  document.getElementById('progress-step-label').textContent =
    `Étape ${cur + 1} / ${CHECKLIST_DATA.length} — ${CHECKLIST_DATA[cur].title}`;
  document.querySelectorAll('.step-dot').forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i === cur)           dot.classList.add('active');
    else if (isStepDone(i)) dot.classList.add('done');
  });
}

// ============================================================
//  CHECK-OUT — RENDU
// ============================================================
function renderStepIndicators() {
  const container = document.getElementById('step-indicators');
  container.innerHTML = '';
  CHECKLIST_DATA.forEach((sec, i) => {
    const btn = document.createElement('button');
    btn.className = 'step-dot';
    btn.setAttribute('aria-label', `Aller à : ${sec.title}`);
    btn.textContent = i + 1;
    btn.onclick = () => goToStep(i);
    container.appendChild(btn);
  });
}

function renderStep(idx) {
  state.currentStep = idx;
  const sec        = CHECKLIST_DATA[idx];
  const checkState = loadCheckState();
  const container  = document.getElementById('step-content');

  let html = `<h2 class="step-title">${sec.title}</h2>`;
  sec.items.forEach(item => {
    const checked = !!checkState[item.id];
    let photosHtml = '';
    if (item.photos && item.photos.length > 0) {
      photosHtml = `<div class="item-photos">${
        item.photos.map(src =>
          `<img src="${src}" alt="Photo" class="photo-thumb"
            onclick="event.stopPropagation(); openLightbox('${src}')" loading="lazy">`
        ).join('')
      }</div>`;
    }
    html += `
      <div class="checklist-item${checked ? ' checked' : ''}" id="item-wrap-${item.id}">
        <label class="item-label">
          <input type="checkbox" class="item-checkbox" ${checked ? 'checked' : ''}
            onchange="toggleItem('${item.id}', this.checked)">
          <span class="item-text">${item.text}</span>
        </label>
        ${photosHtml}
      </div>`;
  });
  container.innerHTML = html;

  const isFirst = idx === 0;
  const isLast  = idx === CHECKLIST_DATA.length - 1;
  document.getElementById('btn-prev').disabled = isFirst;
  const btnNext = document.getElementById('btn-next');
  btnNext.textContent = isLast ? '✅ Terminer' : 'Suivant →';
  btnNext.classList.toggle('btn-finish', isLast);

  updateProgressBar();
  document.getElementById('panel-checkout').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleItem(itemId, checked) {
  const s = loadCheckState();
  if (checked) s[itemId] = true; else delete s[itemId];
  saveCheckState(s);
  const wrap = document.getElementById('item-wrap-' + itemId);
  if (wrap) wrap.classList.toggle('checked', checked);
  updateProgressBar();
}

function goNext() {
  if (state.currentStep < CHECKLIST_DATA.length - 1) {
    renderStep(state.currentStep + 1);
  } else {
    document.getElementById('finish-screen').classList.remove('hidden');
  }
}
function goPrev()      { if (state.currentStep > 0) renderStep(state.currentStep - 1); }
function goToStep(idx) { renderStep(idx); }

function resetChecklist() {
  if (confirm('Réinitialiser toutes les cases ?')) {
    localStorage.removeItem(STORAGE_KEY);
    document.getElementById('finish-screen').classList.add('hidden');
    renderStep(0);
  }
}

// ============================================================
//  LIGHTBOX
// ============================================================
function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  document.getElementById('lightbox').classList.add('hidden');
  document.getElementById('lightbox-img').src = '';
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLightbox(); closeEventModal(); closeDetailModal(); closeTokenModal(); } });

// ============================================================
//  MODALE TOKEN
// ============================================================
function openTokenModal() {
  document.getElementById('token-input').value = getToken();
  document.getElementById('token-modal').classList.remove('hidden');
  document.getElementById('token-overlay').classList.remove('hidden');
  document.getElementById('token-input').focus();
}
function closeTokenModal() {
  document.getElementById('token-modal').classList.add('hidden');
  document.getElementById('token-overlay').classList.add('hidden');
}
function saveToken() {
  const t = document.getElementById('token-input').value.trim();
  if (!t) return;
  localStorage.setItem('civelle_gh_token', t);
  closeTokenModal();
}

// ============================================================
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Afficher la modale token au premier lancement si pas encore configuré
  if (!getToken()) openTokenModal();
  initCalendar();
  renderStepIndicators();
  renderStep(0);
});
