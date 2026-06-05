# AI Safety Guardrail — Frontend

A React dashboard for an AI Safety Guardrail system. It scans user prompts and
model responses for unsafe content via a Python **FastAPI** backend and stores
every result in **Firebase Firestore**.

> This repo is the **frontend only**. The FastAPI backend is not included.

## Stack

- **React 18** + **Vite** (functional components & hooks)
- **react-router-dom** for navigation
- **Tailwind CSS** (dark navy/slate theme)
- **Recharts** for the threat-breakdown chart
- **lucide-react** for icons
- **axios** for API calls
- **firebase** (Firestore) for persistence

## Screens

| Route       | Screen          | What it does |
|-------------|-----------------|--------------|
| `/`         | Dashboard       | Summary cards, recent activity feed, threat-category pie chart |
| `/scanner`  | Prompt Scanner  | Submit text to `/api/analyze`, view safety score / category / action / explanation / redacted text |
| `/history`  | Threat History  | Firestore-backed table with category + date-range filters; click a row for full detail |

## Getting started

```bash
npm install
cp .env.example .env   # then fill in the values
npm run dev
```

Open http://localhost:5173.

### Environment variables

Set these in `.env` (see [.env.example](.env.example)):

- `VITE_API_BASE_URL` — base URL of the FastAPI backend (e.g. `http://localhost:8000`)
- `VITE_FIREBASE_*` — your Firebase web app config

> If the Firebase vars are missing the app still runs — the scanner works
> against the API, but scans aren't persisted and History stays empty.

## API contract

`POST {VITE_API_BASE_URL}/api/analyze`

```jsonc
// request
{ "text": "string", "mode": "prompt" | "response" }

// response
{
  "safety_score": 0.94,                 // 0.0–1.0, higher = riskier
  "category": "Prompt Injection",       // | Jailbreak | PII Exposure | Hallucination Risk | Safe
  "action": "BLOCKED",                  // | ALLOWED
  "explanation": "string",
  "redacted_text": "string or null"
}
```

## Firestore

- Collection: **`scan_logs`**
- Document shape: `{ text, mode, safety_score, category, action, explanation, redacted_text, timestamp }`
- History reads ordered by `timestamp` desc.

You'll want a Firestore index on `timestamp` (Firestore prompts you with a link
the first time the ordered query runs).

## Project structure

```
src/
  components/
    Sidebar.jsx            # desktop sidebar + mobile bottom nav
    Dashboard.jsx          # cards, activity feed, Recharts pie
    PromptScanner.jsx      # main feature: analyze + presets + results
    ThreatHistory.jsx      # filterable Firestore table
    ThreatDetailModal.jsx  # full-detail modal
    SafetyScoreBar.jsx     # color-coded score bar (+ riskTier helper)
    CategoryBadge.jsx      # color-coded category pill
  services/
    api.js                 # axios → FastAPI
    firebase.js            # Firestore read/write helpers
  lib/
    categories.js          # category colors/icons (single source of truth)
    format.js              # date / text formatting helpers
  App.jsx                  # routes + layout
  main.jsx                 # entry + BrowserRouter
```
