// ═══════════════════════════════════════════════════════════════════════════
// SKILLS AUDIT APP CONTROLLER v2.0
// Wires Engine + UI, handles all user interactions and application flow
// ═══════════════════════════════════════════════════════════════════════════

const App = (() => {

  const MAX_DOMAINS      = 6;
  const MAX_PER_DOMAIN   = 5;  // questions pulled from each domain's pool per session

  let _selected = new Set();
  let _submitted = false; // prevent double-submit

  // ── Bootstrap ────────────────────────────────────────────────────────────
  async function init() {
    try {
      showLoadingState(true);
      await Engine.loadBank('data/questions.json');
      const domains = Engine.getDomains();
      UI.renderDomainCards(domains, _selected, toggleDomain);
      UI.show('domain');
      showLoadingState(false);
    } catch (err) {
      showLoadingState(false);
      showError('Failed to load question bank. Make sure you are running from a web server (not file://) or GitHub Pages.');
      console.error('[App.init]', err);
    }
  }

  function showLoadingState(active) {
    const spinner = document.getElementById('init-spinner');
    if (spinner) spinner.style.display = active ? 'flex' : 'none';
  }

  function showError(msg) {
    const errEl = document.getElementById('init-error');
    if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
  }

  // ── Domain Toggle ────────────────────────────────────────────────────────
  function toggleDomain(key, cardEl) {
    if (_selected.has(key)) {
      _selected.delete(key);
    } else if (_selected.size < MAX_DOMAINS) {
      _selected.add(key);
    } else {
      // Max reached — flash the card
      cardEl.classList.add('shake');
      setTimeout(() => cardEl.classList.remove('shake'), 400);
      return;
    }
    UI.updateSelectionUI(_selected, MAX_DOMAINS);
  }

  // ── Start Assessment ─────────────────────────────────────────────────────
  function startAssessment() {
    if (_selected.size === 0) return;

    const domains = [..._selected];
    Engine.buildQuestionSet(domains, MAX_PER_DOMAIN);

    UI.show('question');
    renderCurrentQuestion();
  }

  // ── Render Current Question ──────────────────────────────────────────────
  function renderCurrentQuestion() {
    _submitted = false;
    const q     = Engine.currentQuestion();
    const index = Engine.currentIndex();
    const total = Engine.totalQuestions();

    if (!q) { finishAssessment(); return; }

    UI.renderQuestion(q, index, total);
    updateCounter();
  }

  function updateCounter() {
    const answered = Engine.currentIndex();
    const total    = Engine.totalQuestions();
    const counterEl = document.getElementById('header-counter');
    if (counterEl) counterEl.textContent = `${answered} / ${total} answered`;
  }

  // ── Option Selection ─────────────────────────────────────────────────────
  function pickOption(el) {
    if (_submitted) return;
    UI.pickOption(el);
    // Enable submit once selection made
    UI.setBtn('sub-btn', { disabled: false });
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  function submitAnswer() {
    if (_submitted) return;
    _submitted = true;

    const q = Engine.currentQuestion();
    if (!q) return;

    if (q.type === 'mcq') {
      const sel = document.querySelector('.aopt.sel');
      if (!sel) { _submitted = false; return; }
      const chosenIndex = parseInt(sel.dataset.i);
      const result = Engine.submitMCQ(chosenIndex);
      UI.showMCQFeedback(result);

    } else {
      const ta = document.getElementById('open-ans');
      const text = ta ? ta.value.trim() : '';
      if (!text) { _submitted = false; return; }
      const result = Engine.submitOpen(text);
      UI.showOpenFeedback(result);
    }

    updateCounter();
  }

  // ── Next Question ────────────────────────────────────────────────────────
  function nextQuestion() {
    if (Engine.hasNext()) {
      Engine.advance();
      renderCurrentQuestion();
      // Scroll question into view
      const qEl = document.getElementById('screen-question');
      if (qEl) qEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      finishAssessment();
    }
  }

  // ── Finish & Results ─────────────────────────────────────────────────────
  function finishAssessment() {
    const results = Engine.getResults();
    UI.renderResults(results);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Restart (same domains) ───────────────────────────────────────────────
  function restart() {
    Engine.buildQuestionSet([..._selected], MAX_PER_DOMAIN);
    UI.show('question');
    renderCurrentQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Change Domains ───────────────────────────────────────────────────────
  function changeDomains() {
    _selected = new Set();
    const domains = Engine.getDomains();
    UI.renderDomainCards(domains, _selected, toggleDomain);
    UI.updateSelectionUI(_selected, MAX_DOMAINS);
    UI.show('domain');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Public API ───────────────────────────────────────────────────────────
  return {
    init,
    toggleDomain,
    startAssessment,
    pickOption,
    submitAnswer,
    nextQuestion,
    restart,
    changeDomains
  };
})();

// ── Boot on DOM ready ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
