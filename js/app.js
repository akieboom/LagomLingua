/* ============================================
   SVENSKA LÄRA — Main Application Logic
   ============================================ */

// ========== STATE ==========
const state = {
  page: 'home',
  vocabData: null,
  grammarData: null,
  currentLesson: null,
  currentTopic: null,
  flashcard: {
    words: [],
    index: 0,
    flipped: false,
    known: [],
    unknown: []
  },
  exercise: {
    questions: [],
    index: 0,
    score: 0,
    answered: false,
    done: false
  },
  stats: JSON.parse(localStorage.getItem('sv_stats') || '{"totalWords":0,"knownWords":[],"streak":0,"lastDate":"","lessonsCompleted":[]}'),
  searchQuery: ''
};

// ========== INIT ==========
async function init() {
  await loadData();
  renderProgress();
  navigate('home');
  setupMobileMenu();
}

async function loadData() {
  // Resolve base path dynamically — works on root AND in a subdir like /LagomLingua/
  const base = location.href.endsWith('/')
    ? location.href
    : location.href.replace(/\/[^/]*$/, '/');

  try {
    const [vocabRes, grammarRes] = await Promise.all([
      fetch(base + 'data/vocabulary.json'),
      fetch(base + 'data/grammar.json')
    ]);

    if (!vocabRes.ok) throw new Error('vocabulary.json: ' + vocabRes.status + ' ' + vocabRes.statusText);
    if (!grammarRes.ok) throw new Error('grammar.json: ' + grammarRes.status + ' ' + grammarRes.statusText);

    state.vocabData = await vocabRes.json();
    state.grammarData = await grammarRes.json();
  } catch (e) {
    console.error('Error loading data:', e);
    document.getElementById('main').innerHTML =
      '<div style="text-align:center;padding:60px 24px;">' +
      '<div style="font-size:2.5rem;margin-bottom:16px;">⚠️</div>' +
      '<div style="font-size:1.1rem;font-weight:700;color:var(--navy);margin-bottom:8px;">Kon data niet laden</div>' +
      '<div style="color:var(--text-muted);font-size:0.9rem;max-width:400px;margin:0 auto 24px;">' +
      e.message + '<br><br>Controleer of de data/ map correct is gedeployed naar GitHub Pages.</div>' +
      '<button class="btn btn-primary" onclick="location.reload()">&#8635; Probeer opnieuw</button></div>';
  }
}

// ========== NAVIGATION ==========
function navigate(page, data = null) {
  state.page = page;
  if (data) {
    if (page === 'lesson') state.currentLesson = data;
    if (page === 'grammar-topic') state.currentTopic = data;
  }

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  const main = document.getElementById('main');
  main.innerHTML = '';
  main.className = 'fade-in';

  const pages = {
    home: renderHome,
    alphabet: renderAlphabet,
    vocabulary: renderVocabulary,
    lesson: renderLesson,
    grammar: renderGrammar,
    'grammar-topic': renderGrammarTopic,
    sentences: renderSentences,
    progress: renderProgress_page
  };

  if (pages[page]) pages[page]();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== HOME ==========
function renderHome() {
  const main = document.getElementById('main');
  const completedCount = state.stats.lessonsCompleted.length;
  const totalLessons = state.vocabData ? state.vocabData.lessons.length : 0;

  main.innerHTML = `
    <div class="hero">
      <div class="hero-title">Leer Zweeds 🇸🇪</div>
      <div class="hero-subtitle">Van alfabet tot B1 — woordenschat, grammatica, uitspraak en zinnen in één plek.</div>
      <div class="hero-badges">
        <span class="hero-badge">🎯 Tot B1</span>
        <span class="hero-badge">🔊 Uitspraak via TTS</span>
        <span class="hero-badge">📚 500+ woorden</span>
        <span class="hero-badge">✏️ Grammatica-oefeningen</span>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <button class="btn btn-gold btn-lg" onclick="navigate('alphabet')">🔤 Begin met alfabet</button>
        <button class="btn btn-outline btn-lg" style="border-color:rgba(255,255,255,0.4);color:#fff;" onclick="navigate('vocabulary')">📖 Woordenschat</button>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">${state.stats.knownWords.length}</span>
        <span class="stat-label">Woorden geleerd</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${completedCount}/${totalLessons}</span>
        <span class="stat-label">Lessen voltooid</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${state.stats.streak}</span>
        <span class="stat-label">Dag streak 🔥</span>
      </div>
    </div>

    <div class="section-title">Snel beginnen</div>
    <div class="section-subtitle">Kies een onderdeel om mee te oefenen</div>
    <div class="card-grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));">
      ${[
        { icon:'🔤', title:'Alfabet & Uitspraak', desc:'Leer de 29 letters en moeilijke klanken', page:'alphabet' },
        { icon:'🃏', title:'Flashcards', desc:'Oefen woordenschat met flip-kaarten', page:'vocabulary' },
        { icon:'📝', title:'Grammatica', desc:'Regels, uitleg en oefeningen', page:'grammar' },
        { icon:'💬', title:'Zinnen', desc:'Handige zinnen per situatie', page:'sentences' },
        { icon:'📊', title:'Voortgang', desc:'Bekijk je statistieken', page:'progress' }
      ].map(item => `
        <div class="lesson-card" onclick="navigate('${item.page}')">
          <span class="lesson-icon">${item.icon}</span>
          <div class="lesson-title">${item.title}</div>
          <div class="lesson-desc">${item.desc}</div>
        </div>
      `).join('')}
    </div>

    <div style="margin-top:40px;">
      <div class="section-title">Alle lessen</div>
      <div class="section-subtitle">Georganiseerd van basis tot B1</div>
      <div class="card-grid">
        ${state.vocabData ? state.vocabData.lessons.map(lesson => {
          const wordCount = lesson.words ? lesson.words.length : 0;
          const completed = state.stats.lessonsCompleted.includes(lesson.id);
          return `
            <div class="lesson-card ${completed ? 'completed' : ''}" onclick="navigate('lesson', '${lesson.id}')">
              <span class="lesson-icon">${lesson.icon}</span>
              <div class="lesson-title">${lesson.title}</div>
              <div class="lesson-desc">${lesson.description}</div>
              <div class="lesson-meta">
                <span class="level-badge">${lesson.level}</span>
                ${wordCount > 0 ? `<span class="word-count">${wordCount} woorden</span>` : ''}
                ${completed ? '<span style="color:var(--success);font-size:0.8rem;font-weight:700;">✓ Voltooid</span>' : ''}
              </div>
            </div>
          `;
        }).join('') : ''}
      </div>
    </div>
  `;
}

// ========== ALPHABET ==========
function renderAlphabet() {
  const main = document.getElementById('main');
  const lesson = state.vocabData?.lessons.find(l => l.id === 'alphabet');

  main.innerHTML = `
    <div class="breadcrumb">
      <span class="breadcrumb-link" onclick="navigate('home')">Home</span>
      <span class="breadcrumb-sep">›</span>
      <span>Alfabet & Uitspraak</span>
    </div>
    <div class="section-title">🔤 Alfabet & Uitspraak</div>
    <div class="section-subtitle">Het Zweedse alfabet heeft 29 letters — inclusief Å, Ä en Ö</div>

    <div class="tabs">
      <button class="tab active" onclick="switchAlphabetTab('letters', this)">Alfabet</button>
      <button class="tab" onclick="switchAlphabetTab('phonetics', this)">Uitspraakreg­els</button>
      <button class="tab" onclick="switchAlphabetTab('practice', this)">Oefenen</button>
    </div>

    <div id="alphabet-content">
      ${renderAlphabetLetters(lesson)}
    </div>
  `;
}

function renderAlphabetLetters(lesson) {
  if (!lesson) return '<p>Data laden...</p>';
  const special = ['Å','Ä','Ö'];
  return `
    <div class="alphabet-grid">
      ${lesson.alphabet.map(item => `
        <div class="letter-card ${special.includes(item.letter) ? 'special' : ''}"
             onclick="speak('${item.example}')">
          <div class="letter-big">${item.letter}</div>
          <div class="letter-sound">${item.sound}</div>
          <div class="letter-example">${item.example}</div>
          <div class="letter-translation">${item.translation}</div>
        </div>
      `).join('')}
    </div>
    <p style="color:var(--text-muted);font-size:0.85rem;text-align:center;">
      🔊 Klik op een letter om het voorbeeldwoord te horen
    </p>
  `;
}

function switchAlphabetTab(tab, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const lesson = state.vocabData?.lessons.find(l => l.id === 'alphabet');
  const content = document.getElementById('alphabet-content');

  if (tab === 'letters') {
    content.innerHTML = renderAlphabetLetters(lesson);
  } else if (tab === 'phonetics') {
    content.innerHTML = lesson ? `
      <div style="margin-bottom:16px;">
        <div class="section-title" style="font-size:1.4rem;">Uitspraakregels</div>
        <div class="section-subtitle">Klik op een woord om het te horen 🔊</div>
      </div>
      ${lesson.phonetics.map(p => `
        <div class="phonetic-rule">
          <div class="phonetic-pattern">${p.rule}</div>
          <div class="phonetic-sound">→ ${p.sound}</div>
          <div class="phonetic-examples">
            ${p.examples.map(ex => `
              <span class="phonetic-ex" onclick="speak('${ex.split(' ')[0]}')">${ex}</span>
            `).join('')}
          </div>
        </div>
      `).join('')` : '';
  } else if (tab === 'practice') {
    const words = lesson ? lesson.alphabet.slice(0, 10).map(a => ({
      sv: a.example, nl: a.translation, example: a.example, exampleNl: a.translation
    })) : [];
    startFlashcardMode(words, content, () => switchAlphabetTab('practice', btn));
  }
}

// ========== VOCABULARY ==========
function renderVocabulary() {
  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="breadcrumb">
      <span class="breadcrumb-link" onclick="navigate('home')">Home</span>
      <span class="breadcrumb-sep">›</span>
      <span>Woordenschat</span>
    </div>
    <div class="section-title">📖 Woordenschat</div>
    <div class="section-subtitle">Kies een les om te oefenen met flashcards of zoek een woord</div>

    <input class="search-box" type="text" placeholder="🔍 Zoek een woord in het Nederlands of Zweeds..."
      oninput="handleSearch(this.value)" id="vocab-search">

    <div id="vocab-content">
      <div class="card-grid">
        ${state.vocabData ? state.vocabData.lessons.filter(l => l.words && l.words.length > 0).map(lesson => `
          <div class="lesson-card" onclick="navigate('lesson', '${lesson.id}')">
            <span class="lesson-icon">${lesson.icon}</span>
            <div class="lesson-title">${lesson.title}</div>
            <div class="lesson-desc">${lesson.description}</div>
            <div class="lesson-meta">
              <span class="level-badge">${lesson.level}</span>
              <span class="word-count">${lesson.words.length} woorden</span>
            </div>
          </div>
        `).join('') : ''}
      </div>
    </div>
  `;
}

function handleSearch(query) {
  state.searchQuery = query.toLowerCase();
  const content = document.getElementById('vocab-content');
  if (!query.trim()) {
    content.innerHTML = `<div class="card-grid">
      ${state.vocabData.lessons.filter(l => l.words && l.words.length > 0).map(lesson => `
        <div class="lesson-card" onclick="navigate('lesson', '${lesson.id}')">
          <span class="lesson-icon">${lesson.icon}</span>
          <div class="lesson-title">${lesson.title}</div>
          <div class="lesson-desc">${lesson.description}</div>
          <div class="lesson-meta">
            <span class="level-badge">${lesson.level}</span>
            <span class="word-count">${lesson.words.length} woorden</span>
          </div>
        </div>
      `).join('')}
    </div>`;
    return;
  }

  const allWords = [];
  state.vocabData.lessons.forEach(lesson => {
    if (!lesson.words) return;
    lesson.words.forEach(word => {
      if (word.sv.toLowerCase().includes(state.searchQuery) ||
          word.nl.toLowerCase().includes(state.searchQuery)) {
        allWords.push({ ...word, lessonTitle: lesson.title });
      }
    });
  });

  if (allWords.length === 0) {
    content.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:40px;">Geen resultaten voor "<strong>${query}</strong>"</p>`;
    return;
  }

  content.innerHTML = `
    <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:16px;">${allWords.length} resultaten</p>
    <div class="word-list">
      ${allWords.map(word => `
        <div class="word-item">
          <span class="word-sv">${word.sv}</span>
          <span class="word-nl">${word.nl}</span>
          <button class="speak-btn" onclick="speak('${escapeForAttr(word.sv)}')" title="Uitspraak">🔊</button>
          <span style="font-size:0.75rem;color:var(--gray);margin-left:auto;">${word.lessonTitle}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// ========== LESSON ==========
function renderLesson() {
  const main = document.getElementById('main');
  const lesson = state.vocabData?.lessons.find(l => l.id === state.currentLesson);
  if (!lesson) { navigate('vocabulary'); return; }

  const isAlphabet = lesson.id === 'alphabet';

  main.innerHTML = `
    <div class="breadcrumb">
      <span class="breadcrumb-link" onclick="navigate('home')">Home</span>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-link" onclick="navigate('vocabulary')">Woordenschat</span>
      <span class="breadcrumb-sep">›</span>
      <span>${lesson.title}</span>
    </div>
    <div class="section-title">${lesson.icon} ${lesson.title}</div>
    <div class="section-subtitle">${lesson.description}</div>

    <div class="tabs" id="lesson-tabs">
      ${!isAlphabet ? `<button class="tab active" onclick="switchLessonTab('flashcards', this)">🃏 Flashcards</button>` : ''}
      <button class="tab ${isAlphabet ? 'active' : ''}" onclick="switchLessonTab('list', this)">📋 Woordenlijst</button>
      ${!isAlphabet ? `<button class="tab" onclick="switchLessonTab('quiz', this)">✏️ Quiz</button>` : ''}
    </div>

    <div id="lesson-content">
      ${isAlphabet ? renderWordList(lesson.words || []) : renderFlashcards(lesson.words || [])}
    </div>
  `;
}

function switchLessonTab(tab, btn) {
  document.querySelectorAll('#lesson-tabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const lesson = state.vocabData?.lessons.find(l => l.id === state.currentLesson);
  const content = document.getElementById('lesson-content');

  if (tab === 'flashcards') {
    content.innerHTML = renderFlashcards(lesson.words || []);
    initFlashcardListeners();
  } else if (tab === 'list') {
    content.innerHTML = renderWordList(lesson.words || []);
  } else if (tab === 'quiz') {
    renderQuiz(lesson.words || [], content);
  }
}

function renderWordList(words) {
  if (!words.length) return '<p style="color:var(--text-muted);">Geen woorden in deze les.</p>';
  return `
    <div class="word-list">
      ${words.map(word => `
        <div class="word-item">
          <span class="word-sv">${word.sv}</span>
          <span class="word-nl">${word.nl}</span>
          <button class="speak-btn" onclick="speak('${escapeForAttr(word.sv)}')" title="Hoor uitspraak">🔊</button>
          ${word.example ? `<span class="word-example-text">${word.example}</span>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

// ========== FLASHCARDS ==========
function renderFlashcards(words) {
  if (!words.length) return '<p style="color:var(--text-muted);">Geen woorden in deze les.</p>';

  state.flashcard.words = shuffleArray([...words]);
  state.flashcard.index = 0;
  state.flashcard.flipped = false;
  state.flashcard.known = [];
  state.flashcard.unknown = [];

  return buildFlashcardHTML();
}

function buildFlashcardHTML() {
  const fc = state.flashcard;
  const total = fc.words.length;
  const current = fc.words[fc.index];
  if (!current) return renderFlashcardResults();

  return `
    <div class="flashcard-container">
      <div class="flashcard-progress">
        ${fc.words.map((_, i) => {
          let cls = '';
          if (fc.known.includes(i)) cls = 'known';
          else if (fc.unknown.includes(i)) cls = 'unknown';
          else if (i === fc.index) cls = 'current';
          return `<div class="progress-dot ${cls}"></div>`;
        }).join('')}
      </div>

      <p style="color:var(--text-muted);font-size:0.85rem;">${fc.index + 1} / ${total} — Klik op de kaart om te draaien</p>

      <div class="flashcard-scene" id="flashcard-scene" onclick="flipCard()">
        <div class="flashcard ${fc.flipped ? 'flipped' : ''}" id="flashcard">
          <div class="flashcard-face flashcard-front">
            <div class="card-swedish">${current.sv}</div>
            <button class="speak-btn" onclick="event.stopPropagation();speak('${escapeForAttr(current.sv)}')"
              style="margin-top:12px;">🔊</button>
            <div class="card-hint">Klik om te draaien</div>
          </div>
          <div class="flashcard-face flashcard-back">
            <div class="card-dutch">${current.nl}</div>
            ${current.example ? `
              <div class="card-example">
                <span class="card-example-sv">${current.example}</span>
                <span class="card-example-nl">${current.exampleNl || ''}</span>
              </div>` : ''}
            <button class="speak-btn" onclick="event.stopPropagation();speak('${escapeForAttr(current.sv)}')"
              style="margin-top:10px;">🔊</button>
          </div>
        </div>
      </div>

      <div class="flashcard-actions" id="fc-actions" style="${fc.flipped ? '' : 'visibility:hidden;'}">
        <button class="btn-unknown" onclick="markCard(false)">✗ Nog oefenen</button>
        <button class="btn-known" onclick="markCard(true)">✓ Ik ken dit!</button>
      </div>
    </div>
  `;
}

function startFlashcardMode(words, container, restartFn) {
  state.flashcard.words = shuffleArray([...words]);
  state.flashcard.index = 0;
  state.flashcard.flipped = false;
  state.flashcard.known = [];
  state.flashcard.unknown = [];
  container.innerHTML = buildFlashcardHTML();
  initFlashcardListeners();
}

function initFlashcardListeners() {
  // keyboard support
  document.onkeydown = (e) => {
    if (e.code === 'Space') { e.preventDefault(); flipCard(); }
    if (e.code === 'ArrowRight' && state.flashcard.flipped) markCard(true);
    if (e.code === 'ArrowLeft' && state.flashcard.flipped) markCard(false);
  };
}

function flipCard() {
  state.flashcard.flipped = !state.flashcard.flipped;
  const card = document.getElementById('flashcard');
  const actions = document.getElementById('fc-actions');
  if (card) card.classList.toggle('flipped', state.flashcard.flipped);
  if (actions) actions.style.visibility = state.flashcard.flipped ? 'visible' : 'hidden';
}

function markCard(known) {
  const fc = state.flashcard;
  if (known) {
    fc.known.push(fc.index);
    const word = fc.words[fc.index];
    if (word && !state.stats.knownWords.includes(word.sv)) {
      state.stats.knownWords.push(word.sv);
      saveStats();
    }
  } else {
    fc.unknown.push(fc.index);
  }

  fc.index++;
  fc.flipped = false;

  const content = document.getElementById('lesson-content') ||
                  document.getElementById('alphabet-content');
  if (content) {
    if (fc.index >= fc.words.length) {
      content.innerHTML = renderFlashcardResults();
    } else {
      content.innerHTML = buildFlashcardHTML();
      initFlashcardListeners();
    }
  }
}

function renderFlashcardResults() {
  const fc = state.flashcard;
  const known = fc.known.length;
  const total = fc.words.length;
  const pct = Math.round((known / total) * 100);

  // Mark lesson complete if >70%
  if (pct >= 70 && state.currentLesson &&
      !state.stats.lessonsCompleted.includes(state.currentLesson)) {
    state.stats.lessonsCompleted.push(state.currentLesson);
    updateStreak();
    saveStats();
  }

  return `
    <div class="score-screen card fade-in">
      <div class="score-circle">
        <div class="score-number">${pct}%</div>
        <div class="score-total">${known}/${total}</div>
      </div>
      <div class="section-title" style="margin-bottom:8px;">${pct >= 80 ? '🌟 Uitstekend!' : pct >= 60 ? '👍 Goed gedaan!' : '💪 Blijf oefenen!'}</div>
      <p style="color:var(--text-muted);margin-bottom:24px;">
        Je kende <strong>${known}</strong> van de <strong>${total}</strong> woorden.
        ${fc.unknown.length > 0 ? `<br>Nog ${fc.unknown.length} woorden te leren.` : ''}
      </p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="retryUnknown()">🔁 Herhaal onbekend</button>
        <button class="btn btn-gold" onclick="restartFlashcards()">↺ Opnieuw</button>
        ${state.currentLesson ? `<button class="btn btn-outline" onclick="switchLessonTab('quiz', document.querySelector('.tab'))">✏️ Quiz proberen</button>` : ''}
      </div>
    </div>
  `;
}

function retryUnknown() {
  const fc = state.flashcard;
  const unknownWords = fc.unknown.map(i => fc.words[i]);
  if (unknownWords.length === 0) { restartFlashcards(); return; }
  fc.words = shuffleArray(unknownWords);
  fc.index = 0;
  fc.flipped = false;
  fc.known = [];
  fc.unknown = [];
  const content = document.getElementById('lesson-content') || document.getElementById('alphabet-content');
  if (content) { content.innerHTML = buildFlashcardHTML(); initFlashcardListeners(); }
}

function restartFlashcards() {
  const lesson = state.vocabData?.lessons.find(l => l.id === state.currentLesson);
  const content = document.getElementById('lesson-content') || document.getElementById('alphabet-content');
  if (content && lesson) {
    content.innerHTML = renderFlashcards(lesson.words || []);
    initFlashcardListeners();
  }
}

// ========== QUIZ ==========
function renderQuiz(words, container) {
  if (words.length < 4) {
    container.innerHTML = '<p style="color:var(--text-muted);">Te weinig woorden voor een quiz.</p>';
    return;
  }

  const questions = generateQuizQuestions(words, Math.min(10, words.length));
  state.exercise.questions = questions;
  state.exercise.index = 0;
  state.exercise.score = 0;
  state.exercise.done = false;

  container.innerHTML = buildQuizHTML();
}

function generateQuizQuestions(words, count) {
  const shuffled = shuffleArray([...words]);
  return shuffled.slice(0, count).map(word => {
    const wrong = shuffleArray(words.filter(w => w.sv !== word.sv)).slice(0, 3).map(w => w.nl);
    const options = shuffleArray([word.nl, ...wrong]);
    return { question: `Wat betekent: "${word.sv}"?`, answer: word.nl, options, sv: word.sv };
  });
}

function buildQuizHTML() {
  const eq = state.exercise;
  if (eq.done || eq.index >= eq.questions.length) return buildQuizResults();

  const q = eq.questions[eq.index];
  const progress = ((eq.index / eq.questions.length) * 100).toFixed(0);

  return `
    <div class="fade-in">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <span style="color:var(--text-muted);font-size:0.85rem;">Vraag ${eq.index + 1} van ${eq.questions.length}</span>
        <span style="color:var(--gold);font-weight:700;">Score: ${eq.score}</span>
      </div>
      <div style="background:var(--gray-light);border-radius:4px;height:6px;margin-bottom:24px;">
        <div style="background:var(--navy);height:100%;width:${progress}%;border-radius:4px;transition:width 0.4s;"></div>
      </div>
      <div class="exercise-card">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
          <div class="exercise-question">${q.question}</div>
          <button class="speak-btn" onclick="speak('${escapeForAttr(q.sv)}')" title="Uitspraak">🔊</button>
        </div>
        <div class="exercise-options">
          ${q.options.map(opt => `
            <button class="option-btn" onclick="answerQuiz('${escapeForAttr(opt)}', '${escapeForAttr(q.answer)}', this)">
              ${opt}
            </button>
          `).join('')}
        </div>
        <div class="exercise-feedback" id="quiz-feedback"></div>
      </div>
    </div>
  `;
}

function answerQuiz(selected, correct, btn) {
  const eq = state.exercise;
  const feedback = document.getElementById('quiz-feedback');
  const allBtns = document.querySelectorAll('.option-btn');

  allBtns.forEach(b => {
    b.disabled = true;
    if (b.textContent.trim() === correct) b.classList.add('correct');
  });

  if (selected === correct) {
    btn.classList.add('correct');
    eq.score++;
    feedback.textContent = '✓ Correct!';
    feedback.className = 'exercise-feedback show correct';
  } else {
    btn.classList.add('incorrect');
    feedback.textContent = `✗ Fout. Het juiste antwoord is: ${correct}`;
    feedback.className = 'exercise-feedback show incorrect';
  }

  eq.index++;
  setTimeout(() => {
    const content = document.getElementById('lesson-content');
    if (content) content.innerHTML = buildQuizHTML();
  }, 1400);
}

function buildQuizResults() {
  const eq = state.exercise;
  const total = eq.questions.length;
  const pct = Math.round((eq.score / total) * 100);

  return `
    <div class="score-screen card fade-in">
      <div class="score-circle">
        <div class="score-number">${pct}%</div>
        <div class="score-total">${eq.score}/${total}</div>
      </div>
      <div class="section-title" style="margin-bottom:8px;">
        ${pct >= 80 ? '🌟 Uitstekend!' : pct >= 60 ? '👍 Niet slecht!' : '💪 Blijf oefenen!'}
      </div>
      <p style="color:var(--text-muted);margin-bottom:24px;">Je had <strong>${eq.score}</strong> van <strong>${total}</strong> vragen goed.</p>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button class="btn btn-primary" onclick="replayQuiz()">🔁 Opnieuw</button>
        <button class="btn btn-outline" onclick="switchLessonTab('flashcards', document.querySelector('.tab'))">🃏 Flashcards</button>
      </div>
    </div>
  `;
}

function replayQuiz() {
  const lesson = state.vocabData?.lessons.find(l => l.id === state.currentLesson);
  const content = document.getElementById('lesson-content');
  if (content && lesson) renderQuiz(lesson.words || [], content);
}

// ========== GRAMMAR ==========
function renderGrammar() {
  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="breadcrumb">
      <span class="breadcrumb-link" onclick="navigate('home')">Home</span>
      <span class="breadcrumb-sep">›</span>
      <span>Grammatica</span>
    </div>
    <div class="section-title">📝 Grammatica</div>
    <div class="section-subtitle">Kies een onderwerp om te bestuderen en te oefenen</div>

    <div style="display:flex;flex-direction:column;gap:12px;margin-top:8px;">
      ${state.grammarData ? state.grammarData.topics.map(topic => `
        <div class="topic-card" onclick="navigate('grammar-topic', '${topic.id}')">
          <span class="topic-icon">${topic.icon}</span>
          <div>
            <div class="topic-title">${topic.title}</div>
            <div class="topic-level">Niveau: ${topic.level} · ${topic.exercises ? topic.exercises.length : 0} oefeningen</div>
          </div>
          <span class="topic-arrow">›</span>
        </div>
      `).join('') : ''}
    </div>
  `;
}

function renderGrammarTopic() {
  const main = document.getElementById('main');
  const topic = state.grammarData?.topics.find(t => t.id === state.currentTopic);
  if (!topic) { navigate('grammar'); return; }

  main.innerHTML = `
    <div class="breadcrumb">
      <span class="breadcrumb-link" onclick="navigate('home')">Home</span>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-link" onclick="navigate('grammar')">Grammatica</span>
      <span class="breadcrumb-sep">›</span>
      <span>${topic.title}</span>
    </div>
    <div class="section-title">${topic.icon} ${topic.title}</div>
    <div class="section-subtitle">Niveau: ${topic.level}</div>

    <div class="tabs" id="grammar-tabs">
      <button class="tab active" onclick="switchGrammarTab('learn', this)">📖 Uitleg</button>
      <button class="tab" onclick="switchGrammarTab('practice', this)">✏️ Oefeningen</button>
    </div>

    <div id="grammar-content">
      ${renderGrammarLearn(topic)}
    </div>
  `;
}

function switchGrammarTab(tab, btn) {
  document.querySelectorAll('#grammar-tabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const topic = state.grammarData?.topics.find(t => t.id === state.currentTopic);
  const content = document.getElementById('grammar-content');
  if (tab === 'learn') content.innerHTML = renderGrammarLearn(topic);
  else content.innerHTML = renderGrammarPractice(topic);
}

function renderGrammarLearn(topic) {
  return `
    <div class="grammar-explanation">
      <p style="line-height:1.7;color:var(--text);">${topic.explanation}</p>
    </div>

    ${topic.rules.map(rule => `
      <div class="grammar-explanation">
        <div class="grammar-rule">
          <div class="rule-title">${rule.title}</div>
          <div class="rule-content">${rule.content}</div>
          <table class="example-table">
            ${rule.examples.map(ex => `
              <tr>
                <td>
                  <span>${ex.sv}</span>
                  <button class="speak-btn" style="width:28px;height:28px;font-size:0.85rem;margin-left:6px;"
                    onclick="speak('${escapeForAttr(ex.sv.split(' → ')[0])}')">🔊</button>
                </td>
                <td>${ex.nl}</td>
                ${ex.note ? `<td>${ex.note}</td>` : '<td></td>'}
              </tr>
            `).join('')}
          </table>
        </div>
      </div>
    `).join('')}
    <div style="text-align:center;margin-top:20px;">
      <button class="btn btn-primary" onclick="switchGrammarTab('practice', document.querySelectorAll('#grammar-tabs .tab')[1])">
        ✏️ Nu oefenen →
      </button>
    </div>
  `;
}

function renderGrammarPractice(topic) {
  if (!topic.exercises || topic.exercises.length === 0) {
    return '<p style="color:var(--text-muted);">Geen oefeningen beschikbaar.</p>';
  }

  state.exercise.questions = topic.exercises;
  state.exercise.index = 0;
  state.exercise.score = 0;
  state.exercise.done = false;

  return buildGrammarExerciseHTML(topic);
}

function buildGrammarExerciseHTML(topic) {
  const eq = state.exercise;
  if (eq.index >= eq.questions.length) return buildGrammarResults(topic);

  const q = eq.questions[eq.index];
  const progress = ((eq.index / eq.questions.length) * 100).toFixed(0);

  let inputHTML = '';
  if (q.type === 'multiple_choice' || q.type === 'fill_blank') {
    inputHTML = `
      <div class="exercise-options">
        ${(q.options || []).map(opt => `
          <button class="option-btn" onclick="answerGrammar('${escapeForAttr(opt)}', '${escapeForAttr(q.answer)}', this)">
            ${opt}
          </button>
        `).join('')}
      </div>`;
  } else if (q.type === 'translate') {
    inputHTML = `
      <div>
        ${q.hint ? `<p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:10px;">💡 Tip: ${q.hint}</p>` : ''}
        <div style="display:flex;gap:10px;">
          <input class="exercise-input" type="text" id="grammar-input"
            placeholder="Typ je antwoord..." onkeydown="if(event.key==='Enter')checkTranslate()">
          <button class="btn btn-primary" onclick="checkTranslate()">Controleer</button>
        </div>
      </div>`;
  }

  return `
    <div class="fade-in">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <span style="color:var(--text-muted);font-size:0.85rem;">Vraag ${eq.index + 1} / ${eq.questions.length}</span>
        <span style="color:var(--gold);font-weight:700;">Score: ${eq.score}</span>
      </div>
      <div style="background:var(--gray-light);border-radius:4px;height:6px;margin-bottom:24px;">
        <div style="background:var(--navy);height:100%;width:${progress}%;border-radius:4px;transition:width 0.4s;"></div>
      </div>
      <div class="exercise-card">
        <div class="exercise-question">${q.question}</div>
        ${inputHTML}
        <div class="exercise-feedback" id="grammar-feedback"></div>
      </div>
    </div>
  `;
}

function answerGrammar(selected, correct, btn) {
  const eq = state.exercise;
  const feedback = document.getElementById('grammar-feedback');
  const topic = state.grammarData?.topics.find(t => t.id === state.currentTopic);
  const q = eq.questions[eq.index];

  document.querySelectorAll('.option-btn').forEach(b => {
    b.disabled = true;
    if (b.textContent.trim() === correct) b.classList.add('correct');
  });

  if (selected === correct) {
    btn.classList.add('correct');
    eq.score++;
    feedback.textContent = '✓ Correct!' + (q.explanation ? ' ' + q.explanation : '');
    feedback.className = 'exercise-feedback show correct';
  } else {
    btn.classList.add('incorrect');
    feedback.textContent = `✗ Fout. Correct: ${correct}` + (q.explanation ? ' — ' + q.explanation : '');
    feedback.className = 'exercise-feedback show incorrect';
  }

  eq.index++;
  setTimeout(() => {
    const content = document.getElementById('grammar-content');
    if (content) content.innerHTML = buildGrammarExerciseHTML(topic);
  }, 1600);
}

function checkTranslate() {
  const input = document.getElementById('grammar-input');
  if (!input) return;
  const eq = state.exercise;
  const topic = state.grammarData?.topics.find(t => t.id === state.currentTopic);
  const q = eq.questions[eq.index];
  const userAnswer = input.value.trim().toLowerCase();
  const correct = q.answer.trim().toLowerCase();
  const feedback = document.getElementById('grammar-feedback');

  const isCorrect = userAnswer === correct ||
    correct.split('/').map(s => s.trim().toLowerCase()).includes(userAnswer);

  input.disabled = true;
  input.className = 'exercise-input ' + (isCorrect ? 'correct' : 'incorrect');

  if (isCorrect) {
    eq.score++;
    feedback.textContent = '✓ Correct!';
    feedback.className = 'exercise-feedback show correct';
  } else {
    feedback.textContent = `✗ Fout. Correct antwoord: ${q.answer}`;
    feedback.className = 'exercise-feedback show incorrect';
  }

  eq.index++;
  setTimeout(() => {
    const content = document.getElementById('grammar-content');
    if (content) content.innerHTML = buildGrammarExerciseHTML(topic);
  }, 1800);
}

function buildGrammarResults(topic) {
  const eq = state.exercise;
  const total = eq.questions.length;
  const pct = Math.round((eq.score / total) * 100);

  return `
    <div class="score-screen card fade-in">
      <div class="score-circle">
        <div class="score-number">${pct}%</div>
        <div class="score-total">${eq.score}/${total}</div>
      </div>
      <div class="section-title" style="margin-bottom:8px;">
        ${pct >= 80 ? '🌟 Geweldig!' : pct >= 60 ? '👍 Goed bezig!' : '💪 Nogmaals proberen!'}
      </div>
      <p style="color:var(--text-muted);margin-bottom:24px;">
        Je had <strong>${eq.score}</strong> van de <strong>${total}</strong> oefeningen goed.
      </p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="switchGrammarTab('practice', document.querySelectorAll('#grammar-tabs .tab')[1])">🔁 Opnieuw</button>
        <button class="btn btn-outline" onclick="switchGrammarTab('learn', document.querySelectorAll('#grammar-tabs .tab')[0])">📖 Uitleg lezen</button>
        <button class="btn btn-gold" onclick="navigate('grammar')">← Terug</button>
      </div>
    </div>
  `;
}

// ========== SENTENCES ==========
const SENTENCES = [
  { category: 'Begroetingen', items: [
    { sv: 'Hej, hur mår du?', nl: 'Hallo, hoe gaat het?' },
    { sv: 'Jag mår bra, tack!', nl: 'Ik ga goed, bedankt!' },
    { sv: 'Trevligt att träffas!', nl: 'Leuk je te ontmoeten!' },
    { sv: 'Vi ses imorgon.', nl: 'We zien elkaar morgen.' },
  ]},
  { category: 'Restaurant', items: [
    { sv: 'Kan jag få menyn, tack?', nl: 'Mag ik het menu, alsjeblieft?' },
    { sv: 'Jag är vegetarian.', nl: 'Ik ben vegetariër.' },
    { sv: 'Det var mycket gott!', nl: 'Dat was erg lekker!' },
    { sv: 'Kan vi få notan?', nl: 'Kunnen we de rekening krijgen?' },
  ]},
  { category: 'Reizen', items: [
    { sv: 'Var är närmaste tunnelbanestation?', nl: 'Waar is het dichtstbijzijnde metrostation?' },
    { sv: 'Hur mycket kostar en biljett?', nl: 'Hoeveel kost een kaartje?' },
    { sv: 'Jag är förlorad. Kan du hjälpa mig?', nl: 'Ik ben verdwaald. Kun jij me helpen?' },
    { sv: 'Tåget är försenat.', nl: 'De trein heeft vertraging.' },
  ]},
  { category: 'Winkelen', items: [
    { sv: 'Hur mycket kostar det?', nl: 'Hoeveel kost dat?' },
    { sv: 'Har ni det i en annan storlek?', nl: 'Heeft u dit in een andere maat?' },
    { sv: 'Jag betalar med kort.', nl: 'Ik betaal met kaart.' },
    { sv: 'Kan jag lämna tillbaka det?', nl: 'Kan ik dit terugbrengen?' },
  ]},
  { category: 'Noodgevallen', items: [
    { sv: 'Ring ambulansen!', nl: 'Bel de ambulance!' },
    { sv: 'Jag behöver läkare.', nl: 'Ik heb een dokter nodig.' },
    { sv: 'Ring polisen!', nl: 'Bel de politie!' },
    { sv: 'Hjälp!', nl: 'Help!' },
  ]},
  { category: 'Werk', items: [
    { sv: 'Jag jobbar hemifrån idag.', nl: 'Ik werk vandaag vanuit huis.' },
    { sv: 'Vi har möte klockan tio.', nl: 'We hebben een vergadering om tien uur.' },
    { sv: 'Kan du skicka mig rapporten?', nl: 'Kun jij me het rapport sturen?' },
    { sv: 'Jag söker jobb.', nl: 'Ik ben op zoek naar werk.' },
  ]},
];

function renderSentences() {
  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="breadcrumb">
      <span class="breadcrumb-link" onclick="navigate('home')">Home</span>
      <span class="breadcrumb-sep">›</span>
      <span>Zinnen</span>
    </div>
    <div class="section-title">💬 Handige Zinnen</div>
    <div class="section-subtitle">Klik op 🔊 om de uitspraak te horen</div>

    ${SENTENCES.map(cat => `
      <div style="margin-bottom:32px;">
        <h3 style="font-family:'Playfair Display',serif;font-size:1.2rem;color:var(--navy);margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid var(--gold-pale);">
          ${cat.category}
        </h3>
        ${cat.items.map(item => `
          <div class="sentence-card">
            <div class="sentence-sv">
              ${item.sv}
              <button class="speak-btn" onclick="speak('${escapeForAttr(item.sv)}')" title="Uitspraak">🔊</button>
            </div>
            <div class="sentence-nl">${item.nl}</div>
          </div>
        `).join('')}
      </div>
    `).join('')}
  `;
}

// ========== PROGRESS ==========
function renderProgress_page() {
  const main = document.getElementById('main');
  const stats = state.stats;
  const totalWords = state.vocabData
    ? state.vocabData.lessons.reduce((acc, l) => acc + (l.words ? l.words.length : 0), 0)
    : 0;
  const pct = totalWords ? Math.round((stats.knownWords.length / totalWords) * 100) : 0;

  main.innerHTML = `
    <div class="breadcrumb">
      <span class="breadcrumb-link" onclick="navigate('home')">Home</span>
      <span class="breadcrumb-sep">›</span>
      <span>Voortgang</span>
    </div>
    <div class="section-title">📊 Jouw Voortgang</div>

    <div class="stats-bar" style="margin-bottom:32px;">
      <div class="stat-item">
        <span class="stat-value">${stats.knownWords.length}</span>
        <span class="stat-label">Woorden geleerd</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${totalWords}</span>
        <span class="stat-label">Totaal woorden</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${pct}%</span>
        <span class="stat-label">Compleet</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${stats.streak}🔥</span>
        <span class="stat-label">Dag streak</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${stats.lessonsCompleted.length}</span>
        <span class="stat-label">Lessen voltooid</span>
      </div>
    </div>

    <div class="card" style="margin-bottom:24px;">
      <div style="font-weight:700;color:var(--navy);margin-bottom:12px;">Voortgangsbalk</div>
      <div style="background:var(--gray-light);border-radius:8px;height:18px;overflow:hidden;">
        <div style="background:linear-gradient(90deg,var(--navy),var(--gold));height:100%;width:${pct}%;border-radius:8px;transition:width 1s;"></div>
      </div>
      <div style="text-align:right;font-size:0.8rem;color:var(--text-muted);margin-top:6px;">${pct}% van alle woorden geleerd</div>
    </div>

    ${state.vocabData ? `
    <div class="card" style="margin-bottom:24px;">
      <div style="font-weight:700;color:var(--navy);margin-bottom:16px;">Lessen overzicht</div>
      ${state.vocabData.lessons.map(lesson => {
        const done = stats.lessonsCompleted.includes(lesson.id);
        return `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--gray-light);">
            <span style="font-size:1.4rem;">${lesson.icon}</span>
            <span style="font-weight:600;color:var(--navy);flex:1;">${lesson.title}</span>
            <span class="level-badge">${lesson.level}</span>
            <span style="color:${done ? 'var(--success)' : 'var(--gray)'};font-size:1.2rem;">${done ? '✓' : '○'}</span>
          </div>
        `;
      }).join('')}
    </div>` : ''}

    <div style="text-align:center;margin-top:24px;">
      <button class="btn btn-outline" onclick="resetProgress()" style="border-color:var(--error);color:var(--error);">
        🗑️ Voortgang resetten
      </button>
    </div>
  `;
}

function resetProgress() {
  if (!confirm('Weet je zeker dat je alle voortgang wilt resetten?')) return;
  state.stats = { totalWords: 0, knownWords: [], streak: 0, lastDate: '', lessonsCompleted: [] };
  saveStats();
  showToast('Voortgang gereset');
  renderProgress_page();
}

function renderProgress() {
  const fill = document.getElementById('progress-fill');
  if (!fill || !state.vocabData) return;
  const total = state.vocabData.lessons.reduce((acc, l) => acc + (l.words ? l.words.length : 0), 0);
  const pct = total ? (state.stats.knownWords.length / total) * 100 : 0;
  fill.style.width = pct + '%';
}

// ========== SPEECH / TTS ==========
function speak(text) {
  if (!window.speechSynthesis) { showToast('Uitspraak niet ondersteund in deze browser'); return; }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'sv-SE';
  utt.rate = 0.9;
  utt.pitch = 1;

  const voices = window.speechSynthesis.getVoices();
  const svVoice = voices.find(v => v.lang === 'sv-SE' || v.lang.startsWith('sv'));
  if (svVoice) utt.voice = svVoice;

  window.speechSynthesis.speak(utt);
}

// Preload voices
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

// ========== STATS & STREAKS ==========
function updateStreak() {
  const today = new Date().toDateString();
  if (state.stats.lastDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  state.stats.streak = (state.stats.lastDate === yesterday) ? state.stats.streak + 1 : 1;
  state.stats.lastDate = today;
}

function saveStats() {
  localStorage.setItem('sv_stats', JSON.stringify(state.stats));
  renderProgress();
}

// ========== UTILITIES ==========
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeForAttr(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

function setupMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  if (btn && mobileNav) {
    btn.onclick = () => mobileNav.classList.toggle('open');
  }
}

// ========== START ==========
document.addEventListener('DOMContentLoaded', init);
