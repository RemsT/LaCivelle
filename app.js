// ============================================================
//  LA CIVELLE — app.js
// ============================================================
//
//  CONFIGURATION — à remplir une seule fois
//  1. Créer un Google Calendar partagé et le rendre public
//  2. Activer l'API Google Calendar sur console.cloud.google.com
//  3. Coller le Calendar ID et la clé API ci-dessous
//
const GOOGLE_CALENDAR_ID = 'a80ad7f5e68c553cf07da4471391ea2d59ae9b923929537869499a73cae57187@group.calendar.google.com';
const GOOGLE_API_KEY     = 'VOTRE_CLE_API_GOOGLE';

// ============================================================
//  ÉTAT GLOBAL
// ============================================================
const STORAGE_KEY = 'civelle_checklist_v1';
const state = { currentStep: 0 };

// ============================================================
//  UTILITAIRES
// ============================================================

function loadCheckState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveCheckState(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function totalItems() {
  return CHECKLIST_DATA.reduce((n, sec) => n + sec.items.length, 0);
}

function doneItems() {
  const s = loadCheckState();
  return Object.keys(s).filter(k => s[k]).length;
}

function isStepDone(sectionIdx) {
  const s = loadCheckState();
  const sec = CHECKLIST_DATA[sectionIdx];
  return sec.items.every(item => s[item.id]);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((target - today) / 86400000);
  return diff;
}

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
}

// ============================================================
//  SÉJOURS — CARTE PROCHAINE VISITE
// ============================================================
async function loadNextVisit() {
  const card = document.getElementById('next-visit-card');

  // Pas de clé API → masque la carte
  if (GOOGLE_API_KEY.startsWith('VOTRE')) {
    card.style.display = 'none';
    return;
  }

  try {
    const now = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`
      + `?key=${GOOGLE_API_KEY}&timeMin=${now}&orderBy=startTime&singleEvents=true&maxResults=1`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('API error ' + res.status);
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      card.innerHTML = `
        <div class="next-visit-label">📅 Prochaine visite</div>
        <div class="next-visit-empty">Aucune réservation à venir — ajoutez la vôtre !</div>`;
      return;
    }

    const event = data.items[0];
    const startStr = event.start.date || event.start.dateTime.slice(0, 10);
    const endRaw   = event.end.date   || event.end.dateTime.slice(0, 10);
    // Google Calendar: end date is exclusive, subtract 1 day for display
    const endDate  = new Date(endRaw + 'T00:00:00');
    endDate.setDate(endDate.getDate() - 1);
    const endStr   = endDate.toISOString().slice(0, 10);

    const days = daysUntil(startStr);
    let badge = '';
    if (days === 0)      badge = "Aujourd'hui !";
    else if (days === 1) badge = "Demain !";
    else if (days > 0)   badge = `dans ${days} jour${days > 1 ? 's' : ''}`;
    else                 badge = "En cours";

    card.innerHTML = `
      <div class="next-visit-label">🏖️ Prochaine visite</div>
      <div class="next-visit-name">${event.summary || 'Séjour'}</div>
      <div class="next-visit-dates">${formatDate(startStr)} — ${formatDate(endStr)}</div>
      <span class="next-visit-badge">${badge}</span>`;

  } catch (err) {
    console.error('Calendrier :', err);
    card.innerHTML = `
      <div class="next-visit-label">📅 Prochaine visite</div>
      <div class="next-visit-empty">Impossible de charger le calendrier.</div>`;
  }
}

// ============================================================
//  SÉJOURS — IFRAME GOOGLE CALENDAR
// ============================================================
function renderCalendarIframe() {
  const iframe = document.getElementById('google-calendar-iframe');
  if (GOOGLE_CALENDAR_ID.startsWith('VOTRE')) {
    iframe.parentElement.innerHTML =
      '<p style="padding:24px;color:#6b8599;text-align:center;font-weight:600;">Calendrier non configuré — remplir GOOGLE_CALENDAR_ID dans app.js</p>';
    return;
  }

  const encId = encodeURIComponent(GOOGLE_CALENDAR_ID);
  iframe.src = `https://calendar.google.com/calendar/embed?src=${encId}`
    + `&hl=fr&ctz=Europe%2FParis&showTitle=0&showNav=1&showDate=1`
    + `&showPrint=0&showTabs=1&showCalendars=0&showTz=0&mode=MONTH`;
}

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
  const nb  = CHECKLIST_DATA.length;
  document.getElementById('progress-step-label').textContent =
    `Étape ${cur + 1} / ${nb} — ${CHECKLIST_DATA[cur].title}`;

  // Mise à jour des indicateurs
  document.querySelectorAll('.step-dot').forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i === cur)             dot.classList.add('active');
    else if (isStepDone(i))   dot.classList.add('done');
  });
}

// ============================================================
//  CHECK-OUT — INDICATEURS D'ÉTAPES
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

// ============================================================
//  CHECK-OUT — RENDU D'UNE ÉTAPE
// ============================================================
function renderStep(idx) {
  state.currentStep = idx;
  const sec      = CHECKLIST_DATA[idx];
  const checkState = loadCheckState();
  const container  = document.getElementById('step-content');

  let html = `<h2 class="step-title">${sec.title}</h2>`;

  sec.items.forEach(item => {
    const checked = !!checkState[item.id];
    const checkedClass = checked ? ' checked' : '';

    // Thumbnails
    let photosHtml = '';
    if (item.photos && item.photos.length > 0) {
      const thumbs = item.photos.map(src =>
        `<img src="${src}" alt="Photo" class="photo-thumb"
          onclick="event.stopPropagation(); openLightbox('${src}')"
          loading="lazy">`
      ).join('');
      photosHtml = `<div class="item-photos">${thumbs}</div>`;
    }

    html += `
      <div class="checklist-item${checkedClass}" id="item-wrap-${item.id}">
        <label class="item-label">
          <input type="checkbox" class="item-checkbox"
            ${checked ? 'checked' : ''}
            onchange="toggleItem('${item.id}', this.checked)">
          <span class="item-text">${item.text}</span>
        </label>
        ${photosHtml}
      </div>`;
  });

  container.innerHTML = html;

  // Boutons nav
  const isFirst  = idx === 0;
  const isLast   = idx === CHECKLIST_DATA.length - 1;
  const btnPrev  = document.getElementById('btn-prev');
  const btnNext  = document.getElementById('btn-next');

  btnPrev.disabled = isFirst;
  btnNext.textContent = isLast ? '✅ Terminer' : 'Suivant →';
  btnNext.classList.toggle('btn-finish', isLast);

  updateProgressBar();

  // Scroll haut
  document.getElementById('panel-checkout').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================
//  CHECK-OUT — TOGGLE ITEM
// ============================================================
function toggleItem(itemId, checked) {
  const s = loadCheckState();
  if (checked) s[itemId] = true;
  else delete s[itemId];
  saveCheckState(s);

  // Mise à jour visuelle sans re-render complet
  const wrap = document.getElementById('item-wrap-' + itemId);
  if (wrap) wrap.classList.toggle('checked', checked);

  updateProgressBar();
}

// ============================================================
//  CHECK-OUT — NAVIGATION
// ============================================================
function goNext() {
  const last = CHECKLIST_DATA.length - 1;
  if (state.currentStep < last) {
    renderStep(state.currentStep + 1);
  } else {
    // Dernière étape → écran de fin
    document.getElementById('finish-screen').classList.remove('hidden');
  }
}

function goPrev() {
  if (state.currentStep > 0) {
    renderStep(state.currentStep - 1);
  }
}

function goToStep(idx) {
  renderStep(idx);
}

// ============================================================
//  CHECK-OUT — RESET
// ============================================================
function resetChecklist() {
  if (confirm('Réinitialiser toutes les cases ? Cette action ne peut pas être annulée.')) {
    localStorage.removeItem(STORAGE_KEY);
    document.getElementById('finish-screen').classList.add('hidden');
    renderStep(0);
  }
}

// ============================================================
//  LIGHTBOX
// ============================================================
function openLightbox(src) {
  const lb  = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  img.src = src;
  lb.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.add('hidden');
  document.getElementById('lightbox-img').src = '';
  document.body.style.overflow = '';
}

// Fermer lightbox avec Échap
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

// ============================================================
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Séjours
  loadNextVisit();
  renderCalendarIframe();

  // Check-out
  renderStepIndicators();
  renderStep(0);
});
