# SKILLS AUDIT v2.0
### IT & Cybersecurity Adaptive Assessment Tool

A self-hosted skills assessment platform for MSP technicians and cybersecurity practitioners.
Built to identify real knowledge gaps, not just vocabulary — every question uses scenario-based
problems from actual field work.

---

## Features

- **8 domains, 70+ questions** in the rotating pool
- **Questions rotate every session** — correct answer positions shuffle, unseen questions prioritized
- **MCQ + Open Response** — open questions reveal textbook-quality ideal responses for honest self-assessment
- **Home lab scenarios** on every question — practical exercises tied directly to the assessed skill
- **Live feedback variety** — varied result headers and phrasing so it doesn't feel robotic
- **Domain breakdown** with honest, unfiltered verdict
- **Zero dependencies** — vanilla JS, no frameworks, no npm, no build step
- **GitHub Pages ready** — drop the folder in a repo and enable Pages

---

## Domains

| Domain | Questions |
|--------|-----------|
| 🖥️ Help Desk / SysAdmin | 10 |
| 🌐 Network Engineering | 10 |
| 📧 M365 / Exchange / Entra | 5 |
| ☁️ Azure Cloud / Entra ID | 8 |
| 🛡️ Security Operations | 8 |
| 💻 Scripting / Automation | 6 |
| 📨 Email Security | 6 |
| 🏗️ Security Architecture | 6 |

---

## Quick Start (Local)

Because the app fetches `data/questions.json`, you need a local web server —
`file://` URLs block fetch requests.

**Option 1 — Python (built-in):**
```bash
cd skills-audit
python3 -m http.server 8080
# Open http://localhost:8080
```

**Option 2 — Node.js:**
```bash
npx serve .
```

**Option 3 — VS Code:**
Install the "Live Server" extension, right-click `index.html` → Open with Live Server.

---

## GitHub Pages Deployment

1. Create a new GitHub repository
2. Upload the entire `skills-audit` folder contents to the repo root
3. Go to **Settings → Pages → Source → Deploy from branch → main / root**
4. Your app will be live at `https://yourusername.github.io/repo-name`

That's it. No build step, no CI, no config.

---

## Adding Questions

Edit `data/questions.json`. Each question follows this schema:

```json
{
  "id": "unique_id",
  "difficulty": "foundational | intermediate | advanced",
  "type": "mcq | open",
  "question": "Question text",
  "code": "Optional code block (null if not needed)",

  // MCQ only:
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": "A",
  "explanation": "Why this answer is correct and others are wrong",

  // Open only:
  "idealResponse": "Full textbook-quality model answer",

  // Both types:
  "lab": {
    "title": "Home Lab: Short descriptive title",
    "steps": "Step-by-step instructions for building this skill in a home lab"
  }
}
```

**Notes:**
- Answer positions shuffle automatically — always set `answer` relative to the `options` array order you define
- The engine reshuffles `options` on each session and updates `answer` accordingly
- `id` must be unique across all domains
- `lab` is optional but strongly encouraged — it's the differentiating feature

---

## Question Rotation Logic

- Questions are split into **unseen** and **seen** pools per domain per browser session
- Unseen questions are always prioritized
- When all questions in a domain have been seen, the pool resets and randomizes again
- MCQ answer positions shuffle on every session (correct answer is never stuck at B)
- Domains are interleaved so questions from different domains alternate

---

## Project Structure

```
skills-audit/
├── index.html          # Main HTML shell
├── css/
│   └── styles.css      # Full stylesheet
├── js/
│   ├── engine.js       # Assessment logic, rotation, scoring
│   ├── ui.js           # DOM rendering, feedback, results
│   └── app.js          # Controller — wires engine + ui
├── data/
│   └── questions.json  # Question bank (edit to add questions)
└── README.md
```

---

## Recommended Certifications by Domain

| Domain | Certs to Target |
|--------|----------------|
| Help Desk / SysAdmin | CompTIA A+, MD-102 |
| Network Engineering | CompTIA Network+, CCNA |
| M365 / Exchange | MS-102, MS-900 |
| Azure Cloud | AZ-900 → AZ-104 → AZ-500 |
| Security Operations | CompTIA Sec+, CySA+ |
| Scripting | No formal cert — GitHub portfolio |
| Email Security | No formal cert — part of Sec+/CySA+ |
| Security Architecture | CISSP, CCSP |

---

## Built For

MSP technicians transitioning into security roles. The question scenarios, home lab exercises,
and verdicts are designed around the reality of working in an MSP environment — not academic
security theory.

---

*Built with vanilla JS + zero dependencies. Dark terminal aesthetic. No AI API calls at runtime —
fully offline capable after initial page load.*
