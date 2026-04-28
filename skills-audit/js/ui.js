// ═══════════════════════════════════════════════════════════════════════════
// SKILLS AUDIT UI v2.0
// Handles: all DOM rendering, screen transitions, feedback variety, results
// ═══════════════════════════════════════════════════════════════════════════

const UI = (() => {

  // ── Screen refs ──────────────────────────────────────────────────────────
  const screens = {
    domain:   () => document.getElementById('screen-domain'),
    question: () => document.getElementById('screen-question'),
    results:  () => document.getElementById('screen-results')
  };

  function show(name) {
    Object.keys(screens).forEach(k => {
      const el = screens[k]();
      if (el) el.style.display = k === name ? 'block' : 'none';
    });
  }

  // ── Domain Select Screen ─────────────────────────────────────────────────
  function renderDomainCards(domains, selectedSet, onToggle) {
    const grid = document.getElementById('domain-grid');
    if (!grid) return;
    grid.innerHTML = '';

    domains.forEach(d => {
      const card = document.createElement('div');
      card.className = 'dcard' + (selectedSet.has(d.key) ? ' sel' : '');
      card.dataset.key = d.key;
      card.innerHTML = `
        <div class="dchk">✓</div>
        <div class="d-icon">${d.icon}</div>
        <div class="d-name">${d.label}</div>
        <div class="d-count">${d.total} QUESTIONS IN POOL</div>
        <div class="d-rot">ROTATES EACH SESSION</div>`;
      card.addEventListener('click', () => onToggle(d.key, card));
      grid.appendChild(card);
    });
  }

  function updateSelectionUI(selectedSet, maxDomains) {
    document.querySelectorAll('.dcard').forEach(c => {
      c.classList.toggle('sel', selectedSet.has(c.dataset.key));
    });

    const tags = document.getElementById('sel-tags');
    const bank = Engine.getBank();
    if (tags) {
      tags.innerHTML = [...selectedSet].map(k => {
        const d = bank[k];
        return `<span class="tag">${d?.icon || ''} ${d?.label || k}</span>`;
      }).join('');
    }

    const count = document.getElementById('sel-count');
    if (count) {
      count.textContent = `${selectedSet.size} domain${selectedSet.size !== 1 ? 's' : ''} selected (max ${maxDomains})`;
    }

    const btn = document.getElementById('start-btn');
    if (btn) btn.disabled = selectedSet.size === 0;
  }

  // ── Question Screen ──────────────────────────────────────────────────────
  function renderQuestion(q, index, total) {
    // Progress bar
    const pct = (index / total) * 100;
    const bar = document.getElementById('prog-fill');
    if (bar) bar.style.width = pct + '%';

    // Counter
    const counter = document.getElementById('q-counter');
    if (counter) counter.textContent = `${index + 1} / ${total}`;

    // Meta
    const bank = Engine.getBank();
    const meta = bank[q.domain] || {};
    const tagEl = document.getElementById('q-tag');
    if (tagEl) {
      tagEl.textContent = meta.label || q.domain.toUpperCase();
      tagEl.style.color = meta.color || '#00e5ff';
      tagEl.style.borderColor = (meta.color || '#00e5ff') + '40';
    }

    const diffEl = document.getElementById('q-diff');
    if (diffEl) {
      const label = (q.difficulty || 'foundational').toUpperCase();
      const colorMap = { FOUNDATIONAL: '#b8ff57', INTERMEDIATE: '#ffaa00', ADVANCED: '#ff3c6e' };
      diffEl.textContent = 'DIFFICULTY: ' + label;
      diffEl.style.color = colorMap[label] || '#6b6b80';
    }

    // Question number
    const numEl = document.getElementById('q-num');
    if (numEl) numEl.textContent = `Q${index + 1} of ${total}`;

    // Question text
    const textEl = document.getElementById('q-text');
    if (textEl) textEl.textContent = q.question;

    // Code block
    const codeEl = document.getElementById('q-code');
    if (codeEl) {
      if (q.code) {
        codeEl.style.display = 'block';
        codeEl.textContent = q.code;
      } else {
        codeEl.style.display = 'none';
      }
    }

    // Hide feedback
    hideFeedback();

    // Render answer area
    const ansArea  = document.getElementById('ans-area');
    const openWrap = document.getElementById('open-wrap');

    if (q.type === 'mcq' && q.options) {
      if (openWrap) openWrap.style.display = 'none';
      if (ansArea)  {
        ansArea.style.display = 'flex';
        ansArea.innerHTML = q.options.map((opt, i) => `
          <button class="aopt" data-i="${i}" onclick="App.pickOption(this)">
            <span class="opt-l">${String.fromCharCode(65 + i)}.</span>
            <span class="opt-t">${opt}</span>
          </button>`).join('');
      }
    } else {
      if (ansArea)  ansArea.style.display = 'none';
      if (openWrap) {
        openWrap.style.display = 'block';
        const ta = document.getElementById('open-ans');
        if (ta) {
          ta.value = '';
          ta.placeholder = getOpenPlaceholder();
        }
      }
    }

    // Buttons
    setBtn('sub-btn', { show: true, disabled: false, text: 'SUBMIT ANSWER' });
    setBtn('nxt-btn', { show: false });
  }

  // ── Varied open-response placeholder text ────────────────────────────────
  const openPlaceholders = [
    "Write what you actually know — model answer revealed after submit.",
    "Be specific. Vague answers get called out in the review.",
    "Walk through it step by step. The model answer covers everything.",
    "No partial credit for 'it depends' without explaining what it depends on.",
    "Explain it like you're writing the runbook. Full detail.",
    "Think out loud. The model answer is the standard you're aiming for.",
    "Don't guess — write what you'd actually do on the job.",
    "Be thorough. This is graded against a textbook-quality ideal response."
  ];

  function getOpenPlaceholder() {
    return openPlaceholders[Math.floor(Math.random() * openPlaceholders.length)];
  }

  // ── Pick Option ──────────────────────────────────────────────────────────
  function pickOption(el) {
    document.querySelectorAll('.aopt').forEach(o => o.classList.remove('sel'));
    el.classList.add('sel');
  }

  // ── Show Feedback (variety system) ──────────────────────────────────────
  function showMCQFeedback(result) {
    const { correct, chosenIndex, correctIndex, explanation, lab } = result;

    // Mark options
    document.querySelectorAll('.aopt').forEach((o, i) => {
      o.classList.add('disabled');
      if (i === correctIndex) o.classList.add('correct');
      else if (i === chosenIndex && !correct) o.classList.add('wrong');
    });

    const box = document.getElementById('fb-box');
    if (!box) return;

    box.className = 'fb-box ' + (correct ? 'fb-correct' : 'fb-wrong');
    box.style.display = 'block';

    // Varied result headers
    const correctHeaders = [
      { emoji: '✓', label: 'CORRECT' },
      { emoji: '💡', label: 'NAILED IT' },
      { emoji: '✅', label: 'CORRECT' },
      { emoji: '🎯', label: 'PRECISE' },
      { emoji: '✓', label: 'GOOD WORK' }
    ];
    const wrongHeaders = [
      { emoji: '✗', label: 'INCORRECT' },
      { emoji: '⚠', label: 'NOT QUITE' },
      { emoji: '✗', label: 'MISSED' },
      { emoji: '📖', label: 'REVIEW THIS' },
      { emoji: '⚡', label: 'GAP IDENTIFIED' }
    ];

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const header = correct ? pick(correctHeaders) : pick(wrongHeaders);

    const lbl = document.getElementById('fb-label');
    if (lbl) {
      lbl.textContent = `${header.emoji} ${header.label}`;
      lbl.style.color = correct ? 'var(--accent3)' : 'var(--accent2)';
    }

    // Explanation
    const expEl = document.getElementById('fb-explanation');
    if (expEl) expEl.textContent = explanation || '';

    // Lab scenario
    renderLabPanel(lab);

    // Score tally
    updateScoreTally();

    // Buttons
    setBtn('sub-btn', { show: false });
    setBtn('nxt-btn', { show: true, text: Engine.hasNext() ? 'NEXT QUESTION →' : 'SEE RESULTS →' });
  }

  function showOpenFeedback(result) {
    const { idealResponse, userAnswer, lab } = result;

    const box = document.getElementById('fb-box');
    if (!box) return;

    box.className = 'fb-box fb-open';
    box.style.display = 'block';

    const openHeaders = [
      { emoji: '📋', label: 'MODEL ANSWER' },
      { emoji: '📚', label: 'IDEAL RESPONSE' },
      { emoji: '🎯', label: 'TEXTBOOK ANSWER' },
      { emoji: '📖', label: 'REFERENCE STANDARD' },
      { emoji: '✍', label: 'COMPARE YOUR ANSWER' }
    ];

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const header = pick(openHeaders);

    const lbl = document.getElementById('fb-label');
    if (lbl) {
      lbl.textContent = `${header.emoji} ${header.label}`;
      lbl.style.color = 'var(--accent)';
    }

    // Show user's answer
    const userEl = document.getElementById('fb-user-answer');
    if (userEl && userAnswer) {
      userEl.style.display = 'block';
      const uaTxt = document.getElementById('fb-ua-text');
      if (uaTxt) uaTxt.textContent = userAnswer;
    }

    // Ideal response
    const expEl = document.getElementById('fb-explanation');
    if (expEl) expEl.textContent = idealResponse || '';

    // Lab
    renderLabPanel(lab);

    // Prompt self-assessment
    const selfEl = document.getElementById('fb-self-assess');
    const prompts = [
      "How much of the ideal response did you cover? Be honest.",
      "Rate yourself: Full Credit / Partial Credit / Need to Study This.",
      "What did you miss? Add that gap to your study list.",
      "Did you hit the key points? Compare and note the gaps.",
      "Identify the one thing in the ideal response you didn't know."
    ];
    if (selfEl) selfEl.textContent = prompts[Math.floor(Math.random() * prompts.length)];

    updateScoreTally();

    setBtn('sub-btn', { show: false });
    setBtn('nxt-btn', { show: true, text: Engine.hasNext() ? 'NEXT QUESTION →' : 'SEE RESULTS →' });
  }

  function hideFeedback() {
    const box = document.getElementById('fb-box');
    if (box) box.style.display = 'none';
    const userEl = document.getElementById('fb-user-answer');
    if (userEl) userEl.style.display = 'none';
    const labEl = document.getElementById('fb-lab');
    if (labEl) labEl.style.display = 'none';
  }

  function renderLabPanel(lab) {
    const labEl = document.getElementById('fb-lab');
    if (!labEl) return;

    if (lab && lab.title) {
      labEl.style.display = 'block';
      const labTitle = document.getElementById('fb-lab-title');
      const labSteps = document.getElementById('fb-lab-steps');
      if (labTitle) labTitle.textContent = '🔬 ' + lab.title;
      if (labSteps) labSteps.textContent = lab.steps || '';
    } else {
      labEl.style.display = 'none';
    }
  }

  function updateScoreTally() {
    const results = Engine.getResults();
    const tally = document.getElementById('score-tally');
    if (tally) {
      const answered = results.answers.length;
      const correct  = results.answers.filter(a => a.correct).length;
      tally.textContent = `Running: ${correct} / ${answered} · ${answered > 0 ? Math.round((correct / answered) * 100) : 0}%`;
    }
  }

  // ── Results Screen ───────────────────────────────────────────────────────
  function renderResults(results) {
    show('results');

    const { pct, totalEarned, totalPossible, domainBreakdown, answers, tier, verdict } = results;

    // Animate ring
    const circ = 395.8;
    const offset = circ - (pct / 100) * circ;
    setTimeout(() => {
      const ring = document.getElementById('ring-fill');
      if (ring) ring.style.strokeDashoffset = offset;
    }, 150);

    setText('grade-pct', pct + '%');
    setText('grade-tier', tier);
    setText('res-title', pct >= 78 ? 'STRONG PERFORMANCE' : pct >= 55 ? 'PASSING — GAPS IDENTIFIED' : 'SIGNIFICANT GAPS FOUND');
    setText('res-sub', `${Math.round(totalEarned * 2) / 2} / ${totalPossible} pts · ${domainBreakdown.length} domain${domainBreakdown.length !== 1 ? 's' : ''}`);

    // Domain breakdown bars
    const bkWrap = document.getElementById('bk-wrap');
    if (bkWrap) {
      bkWrap.innerHTML = domainBreakdown.map(d => {
        const col = d.pct >= 80 ? 'var(--accent3)' : d.pct >= 57 ? 'var(--accent)' : 'var(--accent2)';
        return `<div class="bk-row">
          <div class="bk-icon">${d.icon}</div>
          <div class="bk-name">${d.label}</div>
          <div class="bk-bar-wrap"><div class="bk-bar" style="width:0%;background:${col}" data-t="${d.pct}"></div></div>
          <div class="bk-score">${d.earned}/${d.total} · ${d.pct}%</div>
        </div>`;
      }).join('');

      setTimeout(() => {
        document.querySelectorAll('.bk-bar').forEach(b => {
          b.style.transition = 'width 1.1s ease';
          b.style.width = b.dataset.t + '%';
        });
      }, 200);
    }

    // Verdict
    setText('verdict-text', verdict);

    // Question review
    const revWrap = document.getElementById('q-review');
    if (revWrap) {
      revWrap.innerHTML = answers.map((a, i) => {
        const bank = Engine.getBank();
        const domainMeta = bank[a.domain] || {};
        const icon = a.partial ? '📝' : a.correct ? '✅' : '❌';
        const badge = a.partial ? 'OPEN' : a.correct ? 'CORRECT' : 'INCORRECT';
        const badgeColor = a.partial ? 'var(--accent)' : a.correct ? 'var(--accent3)' : 'var(--accent2)';

        return `<div class="rev-item">
          <div class="rev-head" onclick="UI.toggleReview(${i})">
            <div class="rev-icon">${icon}</div>
            <div style="flex:1">
              <div class="rev-meta">${domainMeta.label || a.domain} · Q${i + 1} <span style="color:${badgeColor};font-size:9px;letter-spacing:1px;">${badge}</span></div>
              <div class="rev-q">${a.question.substring(0, 88)}${a.question.length > 88 ? '…' : ''}</div>
            </div>
            <div class="rev-chevron" id="chev-${i}">›</div>
          </div>
          <div class="rev-body" id="rev-${i}">
            ${a.type === 'open' && a.userAnswer ? `<div class="rev-ua"><strong>Your answer:</strong> ${a.userAnswer}</div>` : ''}
            <div class="rev-exp"><strong>${a.type === 'open' ? 'Ideal Response:' : 'Explanation:'}</strong> ${a.explanation || a.idealResponse || ''}</div>
            ${a.lab ? `<div class="rev-lab">🔬 <strong>${a.lab.title}</strong><br>${a.lab.steps}</div>` : ''}
          </div>
        </div>`;
      }).join('');
    }
  }

  function toggleReview(i) {
    const body = document.getElementById(`rev-${i}`);
    const chev = document.getElementById(`chev-${i}`);
    if (!body) return;
    const open = body.style.display === 'block';
    body.style.display = open ? 'none' : 'block';
    if (chev) chev.style.transform = open ? 'rotate(0deg)' : 'rotate(90deg)';
  }

  // ── Utility ──────────────────────────────────────────────────────────────
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function setBtn(id, { show, disabled, text } = {}) {
    const el = document.getElementById(id);
    if (!el) return;
    if (show !== undefined) el.style.display = show ? 'inline-flex' : 'none';
    if (disabled !== undefined) el.disabled = disabled;
    if (text !== undefined) el.textContent = text;
  }

  // ── Public ───────────────────────────────────────────────────────────────
  return {
    show,
    renderDomainCards,
    updateSelectionUI,
    renderQuestion,
    pickOption,
    showMCQFeedback,
    showOpenFeedback,
    hideFeedback,
    renderResults,
    toggleReview,
    setBtn,
    setText
  };
})();
