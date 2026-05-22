// ============================================================
// PATCH INSTRUCTIONS FOR app.js
// ============================================================
// 1. In the state object (top of file), add:
//      conversationsData: null,
//      conversation: { scenario: null, node: null, chosenPath: null, stepCount: 0, flipped: false, answered: false }
//
// 2. In loadData(), add 'restaurant' to a new CONVERSATIONS_FILES list and fetch:
//      const CONVERSATIONS_FILES = ['restaurant'];
//      const convScenarios = await fetchJsonFiles(CONVERSATIONS_FILES, 'data/lessons/conversations/');
//      state.conversationsData = { scenarios: convScenarios };
//
// 3. In the navigate() pages object, add:
//      conversations: renderConversations,
//      'conversation-scenario': renderConversationScenario,
//
// 4. Paste the full code below at the end of app.js, before the // ========== START ========== line.
// ============================================================


// ========== GESPREKKEN (BRANCHING CONVERSATIONS) ==========

function renderConversations() {
  const main = document.getElementById('main');
  const scenarios = state.conversationsData?.scenarios || [];

  main.innerHTML = `
    <div class="breadcrumb">
      <span class="breadcrumb-link" onclick="navigate('home')">Home</span>
      <span class="breadcrumb-sep">›</span>
      <span>Gesprekken</span>
    </div>
    <div class="section-title">🗣️ Scenario-oefeningen</div>
    <div class="section-subtitle">Kies een situatie en oefen een echt gesprek — elke keuze vertakt het gesprek anders!</div>

    ${scenarios.length === 0
      ? '<p style="color:var(--text-muted);text-align:center;padding:40px;">Geen scenario\'s gevonden.</p>'
      : `<div class="card-grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));">
          ${scenarios.map(s => `
            <div class="lesson-card" onclick="navigate('conversation-scenario', ${JSON.stringify(s).replace(/"/g, '&quot;')})">
              <span class="lesson-icon">${s.icon}</span>
              <div class="lesson-title">${s.title}</div>
              <div class="lesson-desc">${s.description}</div>
              <div style="margin-top:10px;">
                <span class="level-badge">${s.level}</span>
              </div>
            </div>
          `).join('')}
        </div>`
    }

    <div class="card" style="margin-top:32px;background:var(--gold-pale);border:1px solid var(--gold);">
      <div style="font-weight:700;color:var(--navy);margin-bottom:8px;">💡 Hoe werkt het?</div>
      <div style="color:var(--text-muted);font-size:0.9rem;line-height:1.6;">
        Je ziet een hint in het Nederlands — draai de kaart om om de drie Zweedse antwoordopties te zien.<br>
        <strong>A</strong> = soepel antwoord &nbsp;·&nbsp; <strong>B</strong> = kleine verwarring &nbsp;·&nbsp; <strong>C</strong> = grappig misverstand<br>
        Elke keuze vertakt het gesprek naar een ander pad!
      </div>
    </div>
  `;
}

function renderConversationScenario() {
  const s = state.currentLesson; // reuse currentLesson slot for scenario data
  if (!s || !s.tree) { navigate('conversations'); return; }

  // Reset conversation state
  state.conversation = {
    scenario: s,
    node: s.tree,
    chosenPath: null,
    stepCount: 0,
    flipped: false,
    answered: false
  };

  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="breadcrumb">
      <span class="breadcrumb-link" onclick="navigate('home')">Home</span>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-link" onclick="navigate('conversations')">Gesprekken</span>
      <span class="breadcrumb-sep">›</span>
      <span>${s.title}</span>
    </div>

    <div style="max-width:520px;margin:0 auto;">
      <!-- Scenario header card -->
      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--gray-light);">
          <div style="font-size:1.8rem;">${s.icon}</div>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:1rem;color:var(--navy);">${s.title}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);" id="conv-path-label">Kies je eigen pad</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;" id="conv-step-label">Stap 1 / ${s.totalSteps || 3}</div>
            <div style="display:flex;gap:4px;justify-content:flex-end;" id="conv-dots"></div>
          </div>
        </div>

        <!-- Chat log -->
        <div id="conv-chat-log"></div>
        <!-- Interaction area (flip card + options) -->
        <div id="conv-interaction"></div>
      </div>
    </div>
  `;

  _convRenderNode(state.conversation.node);
}

// ── internal helpers ──────────────────────────────────────

const _convTagColors = { a: '#1D9E75', b: '#7F77DD', c: '#EF9F27' };
const _convMoodEnd = {
  a: { bg: '#E1F5EE', tc: '#085041', label: 'Uitstekend! 🌟' },
  b: { bg: '#EEEDFE', tc: '#3C3489', label: 'Goed gedaan! 👍' },
  c: { bg: '#FAEEDA', tc: '#633806', label: 'Memorabel! 😄' }
};

function _convAddNpcBubble(sv, nl) {
  const s = state.conversation.scenario;
  const log = document.getElementById('conv-chat-log');
  if (!log) return;
  const d = document.createElement('div');
  d.className = 'chat-bubble npc';
  d.innerHTML = `
    <div class="conv-avatar">${s.npcAvatar || '🧑'}</div>
    <div class="conv-bnpc">
      <span class="conv-sv">${sv}</span>
      <span class="conv-nl">${nl}</span>
    </div>`;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
}

function _convAddPlayerBubble(sv, nl, tag) {
  const log = document.getElementById('conv-chat-log');
  if (!log) return;
  const bg = tag === 'a' ? '#E1F5EE' : tag === 'b' ? '#EEEDFE' : '#FAEEDA';
  const tc = tag === 'a' ? '#085041' : tag === 'b' ? '#3C3489' : '#633806';
  const sc = tag === 'a' ? '#0F6E56' : tag === 'b' ? '#534AB7' : '#854F0B';
  const d = document.createElement('div');
  d.className = 'chat-bubble player';
  d.innerHTML = `
    <div class="conv-avatar">🧑</div>
    <div class="conv-bplayer" style="background:${bg};color:${tc};">
      <span style="font-weight:600;display:block;">${sv}</span>
      <span style="display:block;font-size:0.75rem;margin-top:2px;color:${sc};">${nl}</span>
    </div>`;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
}

function _convAddPathBadge(tag, label) {
  const log = document.getElementById('conv-chat-log');
  if (!log || !label) return;
  const d = document.createElement('div');
  d.className = `conv-path-badge conv-path-${tag}`;
  d.innerHTML = `<span style="width:7px;height:7px;border-radius:50%;background:${_convTagColors[tag]};display:inline-block;flex-shrink:0;"></span> ${label}`;
  log.appendChild(d);
}

function _convUpdateHeader() {
  const cv = state.conversation;
  const stepEl = document.getElementById('conv-step-label');
  const pathEl = document.getElementById('conv-path-label');
  const dotsEl = document.getElementById('conv-dots');
  const total = cv.scenario?.totalSteps || 3;

  if (stepEl) stepEl.textContent = `Stap ${Math.min(cv.stepCount + 1, total)} / ${total}`;
  if (pathEl && cv.chosenPath) {
    const labels = { a: 'Pad A — soepel gesprek', b: 'Pad B — kleine verwarring', c: 'Pad C — grappig misverstand' };
    pathEl.textContent = labels[cv.chosenPath] || 'Kies je eigen pad';
  }
  if (dotsEl) {
    dotsEl.innerHTML = Array.from({ length: total }, (_, i) => {
      const cls = i < cv.stepCount
        ? `conv-dot done-${cv.chosenPath || 'a'}`
        : 'conv-dot';
      return `<span class="${cls}"></span>`;
    }).join('');
  }
}

function _convRenderNode(node) {
  if (!node) return;
  const cv = state.conversation;
  cv.flipped = false;
  cv.answered = false;

  const ia = document.getElementById('conv-interaction');
  if (!ia) return;

  if (cv.stepCount > 0) _convAddNpcBubble(node.npc.sv, node.npc.nl);
  if (node.pathLabel) _convAddPathBadge(cv.chosenPath || 'a', node.pathLabel);
  _convUpdateHeader();
  ia.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'conv-flip-card';
  card.innerHTML = `
    <div class="conv-flip-inner" id="conv-fi">
      <!-- FRONT: hint in Dutch only -->
      <div class="conv-flip-face conv-flip-front">
        <div class="conv-your-turn-label">Jij reageert</div>
        <div class="conv-your-turn-hint">${node.hint}</div>
        <div class="conv-tap-hint">↩️ Draai om voor de opties</div>
      </div>
      <!-- BACK: Swedish options (Dutch hidden until chosen) -->
      <div class="conv-flip-face conv-flip-back">
        <div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Kies jouw antwoord in het Zweeds</div>
        <div class="conv-options">
          ${node.options.map((o, i) => `
            <button class="conv-opt-btn" id="conv-ob-${i}" onclick="convChoose(${i})">
              <span class="conv-opt-tag conv-tag-${o.tag}">${o.tag.toUpperCase()}</span>
              <span>
                <span class="conv-opt-sv">${o.sv}</span>
                <span class="conv-opt-nl" id="conv-nl-${i}" style="display:none;">${o.nl}</span>
              </span>
            </button>`).join('')}
        </div>
      </div>
    </div>`;

  // Flip on card click (not on button click)
  card.querySelector('#conv-fi').addEventListener('click', function (e) {
    if (cv.answered || e.target.closest('.conv-opt-btn')) return;
    if (!cv.flipped) {
      this.classList.add('flipped');
      cv.flipped = true;
    }
  });

  ia.appendChild(card);

  // First step: show NPC bubble after card renders
  if (cv.stepCount === 0) _convAddNpcBubble(node.npc.sv, node.npc.nl);
  cv.stepCount++;
}

function convChoose(i) {
  const cv = state.conversation;
  if (cv.answered || !cv.flipped) return;
  cv.answered = true;

  const opt = cv.node.options[i];
  if (!cv.chosenPath) cv.chosenPath = opt.tag;

  // Show chosen button styled + reveal Dutch translation on chosen option only
  document.querySelectorAll('.conv-opt-btn').forEach((b, j) => {
    b.disabled = true;
    if (j === i) {
      b.classList.add(`conv-chosen-${opt.tag}`);
      const nlSpan = document.getElementById(`conv-nl-${j}`);
      if (nlSpan) nlSpan.style.display = 'block';
    }
  });

  _convAddPlayerBubble(opt.sv, opt.nl, opt.tag);

  const next = opt.next;
  if (next.isLeaf) {
    setTimeout(() => _convRenderLeaf(next), 800);
  } else {
    cv.node = next;
    setTimeout(() => _convRenderNode(cv.node), 900);
  }
}

function _convRenderLeaf(leaf) {
  const ia = document.getElementById('conv-interaction');
  if (!ia) return;
  const m = _convMoodEnd[leaf.mood] || _convMoodEnd.a;
  ia.innerHTML = `
    <div style="border-radius:12px;padding:20px;text-align:center;background:${m.bg};margin-top:8px;">
      <div style="font-size:1.3rem;font-weight:700;color:${m.tc};margin-bottom:8px;">${m.label}</div>
      <div style="font-size:0.875rem;color:${m.tc};opacity:0.85;line-height:1.6;margin-bottom:18px;">${leaf.msg}</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="convRestart()">🔁 Opnieuw proberen</button>
        <button class="btn btn-outline" onclick="navigate('conversations')">← Alle scenario's</button>
      </div>
    </div>`;

  _convUpdateHeader();
}

function convRestart() {
  const s = state.conversation.scenario;
  if (!s) { navigate('conversations'); return; }
  state.conversation = {
    scenario: s,
    node: s.tree,
    chosenPath: null,
    stepCount: 0,
    flipped: false,
    answered: false
  };
  const log = document.getElementById('conv-chat-log');
  const ia = document.getElementById('conv-interaction');
  const pathEl = document.getElementById('conv-path-label');
  if (log) log.innerHTML = '';
  if (ia) ia.innerHTML = '';
  if (pathEl) pathEl.textContent = 'Kies je eigen pad';
  _convRenderNode(state.conversation.node);
}