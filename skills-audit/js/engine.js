// ═══════════════════════════════════════════════════════════════════════════
// SKILLS AUDIT ENGINE v2.0
// Handles: question rotation, pool management, scoring, state, session storage
// ═══════════════════════════════════════════════════════════════════════════

const Engine = (() => {

  // ── Internal State ──────────────────────────────────────────────────────
  let _bank        = {};   // full loaded question bank
  let _questions   = [];   // active question set for this session
  let _current     = 0;
  let _scores      = {};   // { domain: { earned, total } }
  let _answers     = [];   // answer history for review screen
  let _selectedDomains = [];
  let _sessionKey  = 'skillsaudit_v2_session';

  // ── Question Pool (tracks which questions have been seen) ───────────────
  // Stored in sessionStorage so rotating within a browser session is smooth
  // but resets on page close / new visit
  let _seenMap = {}; // { domain: Set of seen question ids }

  // ── Load Bank ───────────────────────────────────────────────────────────
  async function loadBank(url = 'data/questions.json') {
    const cached = sessionStorage.getItem('skillsaudit_bank');
    if (cached) {
      _bank = JSON.parse(cached);
      return _bank;
    }
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Failed to load question bank: ${r.status}`);
    const data = await r.json();
    _bank = data.domains;
    sessionStorage.setItem('skillsaudit_bank', JSON.stringify(_bank));
    return _bank;
  }

  // ── Get Available Domains ───────────────────────────────────────────────
  function getDomains() {
    return Object.entries(_bank).map(([key, val]) => ({
      key,
      label: val.label,
      icon:  val.icon,
      color: val.color,
      total: val.questions.length
    }));
  }

  // ── Build Rotated Question Set ──────────────────────────────────────────
  // Per domain: pick up to maxPerDomain questions, preferring unseen ones
  // Shuffles answer options so correct answer is NOT always in same position
  function buildQuestionSet(domains, maxPerDomain = 5) {
    _questions = [];
    _scores    = {};
    _answers   = [];
    _current   = 0;

    domains.forEach(domainKey => {
      if (!_bank[domainKey]) return;
      const pool = _bank[domainKey].questions;

      // Init seen tracking
      if (!_seenMap[domainKey]) _seenMap[domainKey] = new Set();
      const seen = _seenMap[domainKey];

      // Separate unseen and seen
      const unseen = pool.filter(q => !seen.has(q.id));
      const seenPool = pool.filter(q => seen.has(q.id));

      // If we've seen everything, reset the pool for this domain
      if (unseen.length === 0) {
        _seenMap[domainKey] = new Set();
        unseen.push(...pool);
        seenPool.length = 0;
      }

      // Shuffle each group
      const shuffledUnseen = shuffle([...unseen]);
      const shuffledSeen   = shuffle([...seenPool]);

      // Take up to maxPerDomain, preferring unseen
      const picked = [...shuffledUnseen, ...shuffledSeen].slice(0, maxPerDomain);

      // Mark as seen
      picked.forEach(q => seen.add(q.id));

      // Shuffle MCQ options so correct answer rotates positions
      const processed = picked.map(q => processQuestion(q, domainKey));
      _questions.push(...processed);

      _scores[domainKey] = { earned: 0, total: picked.length };
    });

    // Interleave domains so they're not all grouped together
    _questions = interleave(_questions, domains);
    _selectedDomains = domains;

    return _questions;
  }

  // ── Process Question: shuffle options ───────────────────────────────────
  function processQuestion(q, domainKey) {
    const clone = { ...q, domain: domainKey };

    if (clone.type === 'mcq' && Array.isArray(clone.options)) {
      // Build {text, isCorrect} pairs
      const answerIndex = clone.answer.charCodeAt(0) - 65; // A=0, B=1...
      const pairs = clone.options.map((text, i) => ({
        text,
        isCorrect: i === answerIndex
      }));

      // Shuffle
      const shuffled = shuffle(pairs);

      // Rebuild options and find new correct letter
      clone.options = shuffled.map(p => p.text);
      const newCorrectIndex = shuffled.findIndex(p => p.isCorrect);
      clone.answer = String.fromCharCode(65 + newCorrectIndex);
    }

    return clone;
  }

  // ── Submit MCQ Answer ───────────────────────────────────────────────────
  function submitMCQ(chosenIndex) {
    const q = currentQuestion();
    if (!q) return null;

    const chosenLetter  = String.fromCharCode(65 + chosenIndex);
    const correctLetter = q.answer.trim().toUpperCase();
    const correct       = chosenLetter === correctLetter;
    const correctIndex  = correctLetter.charCodeAt(0) - 65;

    if (correct) _scores[q.domain].earned++;

    const result = {
      correct,
      chosenIndex,
      correctIndex,
      explanation: q.explanation,
      lab: q.lab || null,
      domain: q.domain,
      question: q.question,
      type: 'mcq'
    };

    _answers.push(result);
    return result;
  }

  // ── Submit Open Answer ──────────────────────────────────────────────────
  function submitOpen(userText) {
    const q = currentQuestion();
    if (!q) return null;

    // Give partial credit (0.5) for attempting open questions
    _scores[q.domain].earned += 0.5;

    const result = {
      correct: true, // partial credit
      partial: true,
      userAnswer: userText,
      idealResponse: q.idealResponse,
      lab: q.lab || null,
      domain: q.domain,
      question: q.question,
      type: 'open'
    };

    _answers.push(result);
    return result;
  }

  // ── Navigation ──────────────────────────────────────────────────────────
  function currentQuestion()  { return _questions[_current] || null; }
  function totalQuestions()   { return _questions.length; }
  function currentIndex()     { return _current; }
  function hasNext()          { return _current < _questions.length - 1; }
  function advance()          { _current++; }

  // ── Results ─────────────────────────────────────────────────────────────
  function getResults() {
    let totalEarned = 0, totalPossible = 0;
    const domainBreakdown = [];

    Object.entries(_scores).forEach(([domainKey, s]) => {
      totalEarned   += s.earned;
      totalPossible += s.total;
      const pct = Math.round((s.earned / s.total) * 100);
      const meta = _bank[domainKey];
      domainBreakdown.push({
        key:    domainKey,
        label:  meta?.label  || domainKey,
        icon:   meta?.icon   || '📋',
        color:  meta?.color  || '#00e5ff',
        earned: s.earned,
        total:  s.total,
        pct
      });
    });

    domainBreakdown.sort((a, b) => b.pct - a.pct);

    const pct = totalPossible > 0
      ? Math.round((totalEarned / totalPossible) * 100)
      : 0;

    return {
      pct,
      totalEarned,
      totalPossible,
      domainBreakdown,
      answers: _answers,
      tier: getTier(pct),
      verdict: buildVerdict(pct, domainBreakdown)
    };
  }

  function getTier(pct) {
    if (pct >= 90) return 'ELITE';
    if (pct >= 78) return 'STRONG';
    if (pct >= 63) return 'DEVELOPING';
    if (pct >= 46) return 'FOUNDATIONAL';
    return 'NEEDS WORK';
  }

  function buildVerdict(pct, breakdown) {
    const best  = breakdown[0];
    const worst = breakdown[breakdown.length - 1];
    const bl = best?.label  || 'your strongest domain';
    const wl = worst?.label || 'your weakest domain';

    if (pct >= 88) return `Elite-tier result. Your depth in ${bl} is real — that's not luck, that's reps. The ceiling from here isn't knowledge, it's proof of it: certs, architecture ownership, leading IR calls. If ${wl} scored below 70%, that's the one gap standing between where you are and where you're going. Close it before your next exam cycle.`;
    if (pct >= 72) return `Strong practitioner-level performance. ${bl} is clearly your home turf. The advanced questions in ${wl} likely caught you on second-order thinking — that's the gap between a solid tech and a security engineer. Put dedicated lab hours into that domain this week, not just reading. The Sec+ is well within reach. AZ-500 should follow six months after.`;
    if (pct >= 55) return `Solid foundations, real depth gaps. You know the concepts but struggle to apply them under scenario pressure — which is exactly what the exam and real incidents test. ${wl} needs focused lab work, not more documentation reading. Pick one scenario from the review below, build it in your home lab this week, and retake that domain next session.`;
    if (pct >= 38) return `Foundational knowledge is present but depth drops sharply on intermediate and advanced scenarios. ${wl} needs the most work before any certification attempt. Don't try to cover everything — pick ONE domain, build it in the lab, break it, fix it. One domain done properly beats surface coverage of all of them.`;
    return `The gaps are real but fixable. Every scenario in this assessment is something you can build and test in your home lab this week. Stop reading, start building. Your home lab — UDM Pro, domain controller, VMs — is the most valuable study resource you have. Come back to this in 30 days after putting hands-on time into your lowest-scoring domain.`;
  }

  // ── Utilities ───────────────────────────────────────────────────────────
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Interleave questions so domains alternate rather than cluster
  function interleave(questions, domains) {
    const buckets = {};
    domains.forEach(d => { buckets[d] = []; });
    questions.forEach(q => {
      if (buckets[q.domain]) buckets[q.domain].push(q);
    });

    const result = [];
    let remaining = true;
    while (remaining) {
      remaining = false;
      domains.forEach(d => {
        if (buckets[d].length > 0) {
          result.push(buckets[d].shift());
          remaining = true;
        }
      });
    }
    return result;
  }

  // ── Expose Public API ────────────────────────────────────────────────────
  return {
    loadBank,
    getDomains,
    buildQuestionSet,
    currentQuestion,
    totalQuestions,
    currentIndex,
    hasNext,
    advance,
    submitMCQ,
    submitOpen,
    getResults,
    getBank: () => _bank,
    getSelectedDomains: () => _selectedDomains
  };
})();
