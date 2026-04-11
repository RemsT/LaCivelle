// ============================================================
//  LA CIVELLE — app.js
// ============================================================
//
//  CONFIGURATION — Firebase Realtime Database (aucune clé requise)
//
const FIREBASE_URL = 'https://lacivelle-ab6d3-default-rtdb.europe-west1.firebasedatabase.app';

// ============================================================
//  PROTECTION PAR MOT DE PASSE
// ============================================================
const PASSWORD_HASH = 'ab20c7b19c30cd40bbdffb2d85f206c0488c8db10ead1a7028da03e25b799795';
const SESSION_KEY   = 'civelle_auth';

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === 'ok';
}

async function submitPassword() {
  const input = document.getElementById('pin-input');
  const error = document.getElementById('pin-error');
  const hash = await sha256(input.value.trim());
  if (hash === PASSWORD_HASH) {
    sessionStorage.setItem(SESSION_KEY, 'ok');
    document.getElementById('login-screen').remove();
    document.body.style.overflow = '';
  } else {
    error.style.display = 'block';
    input.value = '';
    input.focus();
  }
}

function showLoginScreen() {
  document.body.style.overflow = 'hidden';
  const screen = document.createElement('div');
  screen.id = 'login-screen';
  screen.innerHTML = `
    <div class="login-box">
      <div class="login-icon">🏖️</div>
      <h2 class="login-title">La Civelle</h2>
      <p class="login-subtitle">Gure Kabanoia</p>
      <input id="pin-input" type="password" inputmode="numeric" pattern="[0-9]*"
             placeholder="Code PIN" class="pin-input" autocomplete="off"
             onkeydown="if(event.key==='Enter') submitPassword()">
      <p id="pin-error" class="pin-error">Code incorrect, réessaie.</p>
      <button class="pin-btn" onclick="submitPassword()">Entrer</button>
    </div>
  `;
  document.body.prepend(screen);
  document.getElementById('pin-input').focus();
}

if (!isAuthenticated()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showLoginScreen);
  } else {
    showLoginScreen();
  }
}

// Personnes avec leur couleur attitrée
const PEOPLE = [
  { name: 'Christian', color: '#1a6b8a' },
  { name: 'Anne',      color: '#e91e8c' },
  { name: 'Zoé',       color: '#f39c12' },
  { name: 'Léna',      color: '#8e44ad' },
  { name: 'Léo',       color: '#27ae60' },
  { name: 'Nino',      color: '#e74c3c' },
  { name: 'Remy',      color: '#2980b9' },
  { name: 'Lou',       color: '#16a085' },
  { name: 'Domi',      color: '#d35400' },
  { name: 'Olivier',   color: '#c0392b' },
];

// Couleurs réservées aux personnes prédéfinies (non disponibles pour "Autre")
const RESERVED_COLORS = PEOPLE.map(p => p.color);

// Palette pour "Autre personne" — couleurs non réservées
const OTHER_COLORS = [
  '#6c5ce7', '#00b894', '#fd79a8', '#636e72',
  '#b2bec3', '#55efc4', '#a29bfe', '#fab1a0',
];

// ============================================================
//  ÉTAT GLOBAL
// ============================================================
const STORAGE_KEY = 'civelle_checklist_v1';
const state = {
  currentStep:    0,
  arrivalStep:    0,
  calendar:       null,
  events:         [],
  pendingStart:   null,
  pendingEnd:     null,
  selectedColor:  PEOPLE[0].color,
  currentEventId: null,
  modalOpen:      false,
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

  // Afficher le FAB uniquement sur l'onglet calendrier
  const fab = document.getElementById('fab-add');
  if (fab) fab.style.display = name === 'calendar' ? 'flex' : 'none';

  // Re-render la checklist arrivée si on revient sur cet onglet
  if (name === 'arrival') renderArrivalStep(state.arrivalStep ?? 0);

  // Re-render le calendrier quand on revient sur cet onglet
  if (name === 'calendar' && state.calendar) {
    setTimeout(() => state.calendar.updateSize(), 50);
  }
}

// ============================================================
//  FIREBASE — LECTURE / ÉCRITURE events
// ============================================================
async function fetchEvents() {
  try {
    const res = await fetch(`${FIREBASE_URL}/events.json`);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    if (!data) return [];
    // Firebase stocke un objet { key: event } — on retourne un tableau
    return Object.values(data);
  } catch (e) {
    console.error('fetchEvents:', e);
    return [];
  }
}

async function saveOneEvent(evt) {
  try {
    const res = await fetch(`${FIREBASE_URL}/events/${evt.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evt),
    });
    if (!res.ok) throw new Error(res.status);
    return true;
  } catch (e) {
    console.error('saveOneEvent:', e);
    return false;
  }
}

async function deleteOneEvent(id) {
  try {
    const res = await fetch(`${FIREBASE_URL}/events/${id}.json`, { method: 'DELETE' });
    if (!res.ok) throw new Error(res.status);
    return true;
  } catch (e) {
    console.error('deleteOneEvent:', e);
    return false;
  }
}

// ============================================================
//  CALENDRIER FULLCALENDAR
// ============================================================
async function initCalendar() {
  let events = [];
  try { events = await fetchEvents(); } catch(e) { console.warn('Calendrier: impossible de charger les événements', e); }
  state.events = events;

  const calendarEl = document.getElementById('fullcalendar');
  const cal = new FullCalendar.Calendar(calendarEl, {
    locale: 'fr',
    initialView: 'dayGridMonth',
    headerToolbar: {
      left:   'prev,next',
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
    selectMirror: false,
    unselectAuto: false,   // on gère l'unselect manuellement
    longPressDelay: 300,
    selectLongPressDelay: 300,
    events: events.map(evtToFC),
    eventDisplay: 'block',
    displayEventTime: false,

    // Tap sur un jour → ouvre modale (dateClick ET select peuvent tous les deux
    // se déclencher sur mobile ; le verrou state.modalOpen empêche la double ouverture)
    dateClick(info) {
      if (state.modalOpen) return;
      openEventModal(info.dateStr, info.dateStr);
    },

    select(info) {
      if (state.modalOpen) return;
      const endDate = new Date(info.endStr + 'T00:00:00');
      endDate.setDate(endDate.getDate() - 1);
      openEventModal(info.startStr, endDate.toISOString().slice(0, 10));
    },

    // Clic sur un événement existant → ouvre modale détail
    eventClick(info) {
      if (state.modalOpen) return;
      state.currentEventId = info.event.id;
      openDetailModal(info.event);
    },
  });

  cal.render();
  state.calendar = cal;
}

// Convertit un event stocké en objet FullCalendar
// La date de fin stockée est inclusive → on ajoute 1 jour (FullCalendar end est exclusif)
function evtToFC(evt) {
  const [y, m, d] = evt.end.split('-').map(Number);
  const endExclusive = new Date(y, m - 1, d + 1); // Date locale, pas UTC
  const pad = n => String(n).padStart(2, '0');
  const endStr = `${endExclusive.getFullYear()}-${pad(endExclusive.getMonth()+1)}-${pad(endExclusive.getDate())}`;
  return {
    id:              evt.id,
    title:           evt.title,
    start:           evt.start,
    end:             endStr,
    backgroundColor: evt.color,
    borderColor:     evt.color,
    textColor:       '#ffffff',
  };
}

// ============================================================
//  MODALE AJOUT SÉJOUR
// ============================================================
function buildPersonSelect() {
  const sel = document.getElementById('person-select');
  sel.innerHTML = '';
  PEOPLE.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });
  const other = document.createElement('option');
  other.value = '__other__';
  other.textContent = '+ Autre personne…';
  sel.appendChild(other);
}

function onPersonChange() {
  const sel = document.getElementById('person-select');
  const val = sel.value;
  if (val === '__other__') {
    document.getElementById('other-form').classList.remove('hidden');
    state.selectedName  = '';
    state.selectedColor = OTHER_COLORS[0];
    buildOtherColorPicker();
    document.getElementById('other-name').focus();
  } else {
    document.getElementById('other-form').classList.add('hidden');
    const person = PEOPLE.find(p => p.name === val);
    state.selectedName  = person.name;
    state.selectedColor = person.color;
    updatePersonDot(person.color);
  }
}

function updatePersonDot(color) {
  document.getElementById('person-dot').style.background = color;
}

function buildOtherColorPicker() {
  const container = document.getElementById('other-color-picker');
  container.innerHTML = '';
  OTHER_COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-swatch' + (c === state.selectedColor ? ' selected' : '');
    btn.style.background = c;
    btn.onclick = () => {
      state.selectedColor = c;
      container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      btn.classList.add('selected');
    };
    container.appendChild(btn);
  });
}

// ---- Scroll lock iOS sans sauter en haut ----
let _scrollY = 0;
function lockScroll() {
  state.modalOpen = true;
  _scrollY = window.scrollY;
  document.body.style.top = `-${_scrollY}px`;
  document.body.classList.add('modal-open');
}
function unlockScroll() {
  state.modalOpen = false;
  document.body.classList.remove('modal-open');
  document.body.style.top = '';
  window.scrollTo(0, _scrollY);
}

function openEventModalToday() {
  const today = new Date().toISOString().slice(0, 10);
  openEventModal(today, today);
}

function openEventModal(start, end) {
  state.selectedName  = PEOPLE[0].name;
  state.selectedColor = PEOPLE[0].color;
  document.getElementById('ev-start').value = start;
  document.getElementById('ev-end').value   = end;
  document.getElementById('other-form').classList.add('hidden');
  document.getElementById('other-name').value = '';
  buildPersonSelect();
  document.getElementById('person-select').value = PEOPLE[0].name;
  updatePersonDot(PEOPLE[0].color);
  document.getElementById('event-modal').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');
  lockScroll();
}

function closeEventModal() {
  document.getElementById('event-modal').classList.add('hidden');
  document.getElementById('modal-overlay').classList.add('hidden');
  unlockScroll();
}

async function saveEvent() {
  try {
    const otherFormVisible = !document.getElementById('other-form').classList.contains('hidden');
    let title = state.selectedName;
    if (otherFormVisible) {
      title = document.getElementById('other-name').value.trim();
      if (!title) { document.getElementById('other-name').focus(); return; }
      state.selectedName = title;
    }
    if (!title) {
      alert('Veuillez choisir une personne.');
      return;
    }

    const start = document.getElementById('ev-start').value;
    const end   = document.getElementById('ev-end').value;
    if (!start || !end || end < start) {
      alert('Veuillez saisir des dates valides.');
      return;
    }

    const newEvt = {
      id:    Date.now().toString(),
      title,
      start,
      end,
      color: state.selectedColor || PEOPLE[0].color,
    };

    // Sauvegarder d'abord dans Firebase
    const ok = await saveOneEvent(newEvt);
    if (!ok) {
      alert('Erreur de sauvegarde. Vérifiez votre connexion internet.');
      return;
    }

    // Puis afficher dans le calendrier
    state.events.push(newEvt);
    state.calendar.addEvent(evtToFC(newEvt));
    closeEventModal();
  } catch(e) {
    console.error('saveEvent error:', e);
    alert('Erreur inattendue : ' + e.message);
  }
}

// ============================================================
//  MODALE DÉTAIL / ÉDITION / SUPPRESSION
// ============================================================
function openDetailModal(fcEvent) {
  const storedEvt = state.events.find(e => e.id === fcEvent.id);
  if (!storedEvt) return;

  // Pré-remplir le formulaire d'édition
  state.selectedColor = storedEvt.color;
  state.selectedName  = storedEvt.title;

  document.getElementById('edit-start').value = storedEvt.start;
  document.getElementById('edit-end').value   = storedEvt.end;

  // Construire le sélecteur de personne
  buildEditPersonSelect(storedEvt.title, storedEvt.color);

  document.getElementById('detail-modal').classList.remove('hidden');
  document.getElementById('detail-overlay').classList.remove('hidden');
  lockScroll();
}

function buildEditPersonSelect(currentName, currentColor) {
  const sel = document.getElementById('edit-person-select');
  sel.innerHTML = '';
  PEOPLE.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });
  const other = document.createElement('option');
  other.value = '__other__';
  other.textContent = '+ Autre personne…';
  sel.appendChild(other);

  const isPerson = PEOPLE.find(p => p.name === currentName);
  if (isPerson) {
    sel.value = currentName;
    document.getElementById('edit-person-dot').style.background = currentColor;
    document.getElementById('edit-other-form').classList.add('hidden');
  } else {
    sel.value = '__other__';
    document.getElementById('edit-person-dot').style.background = currentColor;
    document.getElementById('edit-other-name').value = currentName;
    document.getElementById('edit-other-form').classList.remove('hidden');
    buildEditOtherColorPicker(currentColor);
  }
}

function onEditPersonChange() {
  const val = document.getElementById('edit-person-select').value;
  if (val === '__other__') {
    document.getElementById('edit-other-form').classList.remove('hidden');
    state.selectedColor = OTHER_COLORS[0];
    state.selectedName  = '';
    buildEditOtherColorPicker(state.selectedColor);
    document.getElementById('edit-other-name').focus();
  } else {
    document.getElementById('edit-other-form').classList.add('hidden');
    const person = PEOPLE.find(p => p.name === val);
    state.selectedColor = person.color;
    state.selectedName  = person.name;
    document.getElementById('edit-person-dot').style.background = person.color;
  }
}

function buildEditOtherColorPicker(selected) {
  const container = document.getElementById('edit-other-color-picker');
  container.innerHTML = '';
  OTHER_COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-swatch' + (c === selected ? ' selected' : '');
    btn.style.background = c;
    btn.onclick = () => {
      state.selectedColor = c;
      document.getElementById('edit-person-dot').style.background = c;
      container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      btn.classList.add('selected');
    };
    container.appendChild(btn);
  });
}

function closeDetailModal() {
  document.getElementById('detail-modal').classList.add('hidden');
  document.getElementById('detail-overlay').classList.add('hidden');
  unlockScroll();
  state.currentEventId = null;
}

async function updateEvent() {
  const otherVisible = !document.getElementById('edit-other-form').classList.contains('hidden');
  let title = state.selectedName;
  if (otherVisible) {
    title = document.getElementById('edit-other-name').value.trim();
    if (!title) { document.getElementById('edit-other-name').focus(); return; }
  }
  const start = document.getElementById('edit-start').value;
  const end   = document.getElementById('edit-end').value;
  if (!start || !end || end < start) { alert('Dates invalides.'); return; }

  const idx = state.events.findIndex(e => e.id === state.currentEventId);
  if (idx === -1) return;

  state.events[idx] = { ...state.events[idx], title, start, end, color: state.selectedColor };

  // Mettre à jour FullCalendar sans recharger
  const fcEvt = state.calendar.getEventById(state.currentEventId);
  if (fcEvt) {
    fcEvt.setProp('title', title);
    fcEvt.setProp('backgroundColor', state.selectedColor);
    fcEvt.setProp('borderColor', state.selectedColor);
    const [ey, em, ed] = end.split('-').map(Number);
    const endExclusive = new Date(ey, em - 1, ed + 1);
    const pad = n => String(n).padStart(2, '0');
    const endStr = `${endExclusive.getFullYear()}-${pad(endExclusive.getMonth()+1)}-${pad(endExclusive.getDate())}`;
    fcEvt.setStart(start);
    fcEvt.setEnd(endStr);
  }

  closeDetailModal();
  const ok = await saveOneEvent(state.events[idx]);
  if (!ok) alert('Erreur de sauvegarde. Vérifiez votre connexion internet.');
}

async function deleteEvent() {
  if (!confirm('Supprimer ce séjour ?')) return;

  const idToDelete = state.currentEventId;
  const fcEvt = state.calendar.getEventById(idToDelete);
  if (fcEvt) fcEvt.remove();
  state.events = state.events.filter(e => e.id !== idToDelete);
  closeDetailModal();

  const ok = await deleteOneEvent(idToDelete);
  if (!ok) alert('Erreur de suppression. Vérifiez votre connexion internet.');
}

// ============================================================
//  HELPER — RENDU D'UN ITEM CHECKLIST (partagé arrivée + départ)
// ============================================================
function buildItemHtml(item, checked, onToggle, wrapPrefix) {
  const hasDetail = (item.photos && item.photos.length > 0) || item.note;

  const photosHtml = (item.photos && item.photos.length > 0)
    ? `<div class="item-photos">${
        item.photos.map(src =>
          `<img src="${src}" alt="Photo" class="photo-thumb"
            onclick="event.stopPropagation(); openLightbox('${src}')" loading="lazy">`
        ).join('')
      }</div>`
    : '';

  const noteHtml = item.note
    ? `<p class="item-note">${item.note}</p>`
    : '';

  const detailHtml = hasDetail
    ? `<div class="item-detail hidden" id="detail-${item.id}">${photosHtml}${noteHtml}</div>`
    : '';

  const expandBtn = hasDetail
    ? `<button class="item-expand-btn" onclick="toggleItemDetail('${item.id}')" aria-label="Voir détails">▼</button>`
    : '';

  return `
    <div class="checklist-item${checked ? ' checked' : ''}" id="${wrapPrefix}-${item.id}">
      <div class="item-row">
        <label class="item-label">
          <input type="checkbox" class="item-checkbox" ${checked ? 'checked' : ''}
            onclick="${onToggle}('${item.id}', this.checked)">
          <span class="item-text">${item.text}</span>
        </label>
        ${expandBtn}
      </div>
      ${detailHtml}
    </div>`;
}

function toggleItemDetail(itemId) {
  const detail = document.getElementById('detail-' + itemId);
  if (!detail) return;
  const isOpen = !detail.classList.contains('hidden');
  detail.classList.toggle('hidden', isOpen);
  // Rotation de la flèche
  const btn = detail.closest('.checklist-item').querySelector('.item-expand-btn');
  if (btn) btn.classList.toggle('open', !isOpen);
}

// ============================================================
//  ARRIVÉE — CHECKLIST SIMPLE
// ============================================================
const ARRIVAL_KEY = 'civelle_arrival_v1';

function loadArrivalState() {
  try { return JSON.parse(localStorage.getItem(ARRIVAL_KEY)) || {}; }
  catch { return {}; }
}
function saveArrivalState(s) { localStorage.setItem(ARRIVAL_KEY, JSON.stringify(s)); }

function updateArrivalProgressBar() {
  const checkState = loadArrivalState();
  const total = ARRIVAL_DATA.reduce((n, s) => n + s.items.length, 0);
  const done  = Object.keys(checkState).filter(k => checkState[k]).length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const cur   = state.arrivalStep;
  const fill  = document.getElementById('arrival-progress-fill');
  const label = document.getElementById('arrival-progress-label');
  const stepLabel = document.getElementById('arrival-progress-step-label');
  if (fill)      fill.style.width = pct + '%';
  if (label)     label.textContent = `${done} / ${total} tâches`;
  if (stepLabel) stepLabel.textContent = `Étape ${cur + 1} / ${ARRIVAL_DATA.length} — ${ARRIVAL_DATA[cur].title}`;
  document.querySelectorAll('.arrival-step-dot').forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    const s = loadArrivalState();
    if (i === cur) dot.classList.add('active');
    else if (ARRIVAL_DATA[i].items.every(it => s[it.id])) dot.classList.add('done');
  });
}

function renderArrivalStepIndicators() {
  const container = document.getElementById('arrival-step-indicators');
  container.innerHTML = '';
  ARRIVAL_DATA.forEach((sec, i) => {
    const btn = document.createElement('button');
    btn.className = 'step-dot arrival-step-dot';
    btn.setAttribute('aria-label', `Aller à : ${sec.title}`);
    btn.textContent = i + 1;
    btn.onclick = () => renderArrivalStep(i);
    container.appendChild(btn);
  });
}

function renderArrivalStep(idx) {
  state.arrivalStep = idx;
  const sec        = ARRIVAL_DATA[idx];
  const checkState = loadArrivalState();
  const container  = document.getElementById('arrival-step-content');

  let html = `<h2 class="step-title">${sec.title}</h2>`;
  sec.items.forEach(item => {
    html += buildItemHtml(item, !!checkState[item.id], 'toggleArrivalItem', 'arr-wrap');
  });
  container.innerHTML = html;

  const isFirst = idx === 0;
  const isLast  = idx === ARRIVAL_DATA.length - 1;
  document.getElementById('arrival-btn-prev').disabled = isFirst;
  const btnNext = document.getElementById('arrival-btn-next');
  btnNext.textContent = isLast ? '✅ Terminer' : 'Suivant →';
  btnNext.classList.toggle('btn-finish', isLast);

  updateArrivalProgressBar();
  document.getElementById('panel-arrival').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleArrivalItem(itemId, checked) {
  const s = loadArrivalState();
  if (checked) s[itemId] = true; else delete s[itemId];
  saveArrivalState(s);
  const wrap = document.getElementById('arr-wrap-' + itemId);
  if (wrap) wrap.classList.toggle('checked', checked);
  updateArrivalProgressBar();
}

function goArrivalNext() {
  if (state.arrivalStep < ARRIVAL_DATA.length - 1) {
    renderArrivalStep(state.arrivalStep + 1);
  } else {
    document.getElementById('arrival-finish-screen').classList.remove('hidden');
  }
}
function goArrivalPrev() {
  if (state.arrivalStep > 0) renderArrivalStep(state.arrivalStep - 1);
}

function resetArrival() {
  if (confirm('Réinitialiser toutes les cases ?')) {
    localStorage.removeItem(ARRIVAL_KEY);
    document.getElementById('arrival-finish-screen').classList.add('hidden');
    renderArrivalStep(0);
  }
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
  document.querySelectorAll('#step-indicators .step-dot').forEach((dot, i) => {
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
    html += buildItemHtml(item, !!checkState[item.id], 'toggleItem', 'item-wrap');
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
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLightbox(); closeEventModal(); closeDetailModal(); } });

// ============================================================
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initCalendar();
  renderArrivalStepIndicators();
  renderArrivalStep(0);
  renderStepIndicators();
  renderStep(0);
});
