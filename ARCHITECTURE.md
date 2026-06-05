# Architecture

End-to-end design of the AI Safety Guardrail. The Chat page runs the full
pipeline: **input guardrail → LLM (OpenRouter) → output detectors →
Explainability Engine → ALLOW / BLOCK**.

## Pipeline flowchart

```mermaid
flowchart TD
    User([User types message]) --> UI[React Chat UI<br/>Chat.jsx]
    UI -->|POST /api/chat| API[FastAPI backend :8000<br/>routes/chat.py]
    API --> RC[["guardrail.run_chat()"]]

    %% Stage 1 - input guardrail
    RC --> IN{{"① INPUT GUARDRAIL<br/>injection · jailbreak · toxicity · pii"}}
    IN --> Q1{Injection / Jailbreak<br/>/ HIGH toxicity?}
    Q1 -->|Yes| BLK[["⑤ BLOCK<br/>action=BLOCKED<br/>reply=null · LLM never called"]]
    Q1 -->|No| RED[Redact any PII<br/>out of the prompt]

    %% Stage 2 - LLM
    RED --> LLM[["② LLM call<br/>services/openrouter.py"]]
    LLM -->|HTTPS| OR[(OpenRouter API<br/>OpenAI / Llama)]
    OR --> RESP[Model reply]

    %% Stage 3 - output detectors
    RESP --> OUT{{"③ OUTPUT DETECTORS<br/>toxicity · hallucination · pii"}}
    OUT --> Q2{HIGH toxicity<br/>in reply?}
    Q2 -->|Yes| BLK
    Q2 -->|No| Q3{PII in input<br/>or reply?}
    Q3 -->|Yes| PII[["ALLOW + redact<br/>category=PII Exposure · 0.55"]]
    Q3 -->|No| Q4{Hallucination<br/>signals?}
    Q4 -->|Yes| HAL[["ALLOW + warn<br/>category=Hallucination · 0.50"]]
    Q4 -->|No| SAFE[["ALLOW<br/>category=Safe · 0.05"]]

    %% Stage 4 - explainability + return
    BLK --> EXP[["④ EXPLAINABILITY ENGINE<br/>detectors → summary + factors"]]
    PII --> EXP
    HAL --> EXP
    SAFE --> EXP
    EXP --> JSON[/JSON verdict:<br/>action · category · score<br/>reply · redacted · explainability/]
    JSON --> REPORT[Chat UI renders<br/>reply + guardrail report]
    REPORT --> User

    %% persistence
    JSON -.->|saveScanLog| FS[(Firebase Firestore<br/>scan_logs)]

    classDef block fill:#fee2e2,stroke:#ef4444,color:#991b1b;
    classDef allow fill:#dcfce7,stroke:#22c55e,color:#166534;
    classDef warn fill:#fef9c3,stroke:#eab308,color:#854d0e;
    classDef stage fill:#e0e7ff,stroke:#6366f1,color:#3730a3;
    class BLK block;
    class SAFE,PII allow;
    class HAL warn;
    class IN,OUT,LLM,EXP,RC stage;
```

## Component layers

```mermaid
flowchart LR
    subgraph FE [Frontend · React + Vite :5173]
        C[Chat.jsx]
        S[PromptScanner.jsx]
        D[Dashboard.jsx]
        H[ThreatHistory.jsx]
        API[services/api.js]
        FB[services/firebase.js]
        C --> API
        S --> API
        H --> FB
        D --> FB
    end

    subgraph BE [Backend · FastAPI :8000]
        M[main.py]
        RA[routes/analyze.py]
        RC[routes/chat.py]
        G[guardrail.py]
        E[explainability.py]
        ORC[services/openrouter.py]
        subgraph DET [detectors/]
            P1[prompt_injection]
            P2[jailbreak]
            P3[toxicity]
            P4[hallucination]
            P5[pii]
        end
        M --> RA --> G
        M --> RC --> G
        G --> DET
        G --> E
        G --> ORC
    end

    API -->|HTTP JSON| RA
    API -->|HTTP JSON| RC
    ORC -->|HTTPS| OR[(OpenRouter<br/>OpenAI / Llama)]
    FB -->|SDK| FS[(Firestore)]
```

## Decision policy (highest risk wins)

| Trigger                                   | Action  | Category           | Score |
| ----------------------------------------- | ------- | ------------------ | ----- |
| Prompt injection                          | BLOCKED | Prompt Injection   | 0.94  |
| Jailbreak                                 | BLOCKED | Jailbreak          | 0.90  |
| Toxicity (HIGH: threat / hate / self-harm)| BLOCKED | Toxicity           | 0.88  |
| PII in prompt or reply                    | ALLOWED | PII Exposure       | 0.55  |
| Hallucination signals                     | ALLOWED | Hallucination Risk | 0.50  |
| Nothing                                   | ALLOWED | Safe               | 0.05  |

## How each detector scores

- **Prompt injection / Jailbreak** — regex patterns for instruction-override and
  known jailbreak personas; word boundaries prevent false positives (e.g. `\bdan\b`).
- **Toxicity** — lexicon across 4 buckets (self-harm / threat / hate = HIGH,
  profanity = MEDIUM); overall severity = the highest bucket that matched.
- **Hallucination Risk** — heuristic linguistic signals (unsourced authority,
  fabricated citations, overconfidence); ≥2 signal types = MEDIUM. Warns, never blocks.
- **PII** — regex for email / phone / PAN / Aadhaar / credit card; cards are
  Luhn-validated; `redact_pii()` swaps matches for `[EMAIL]`, `[CARD]`, etc.

> The scores are **fixed per-category severities**, not model probabilities — the
> detectors are deterministic rules, chosen for speed and explainability.

## Key design decisions

1. **Input screening before the LLM** — attacks are blocked at the door; no LLM
   cost is paid on a prompt-injection attempt.
2. **PII redacted before the LLM call** — user PII never crosses the third-party
   API boundary.
3. **Output re-screened** — the model's own reply is checked for toxicity,
   hallucination, and PII leaks.
4. **LLM is server-side & pluggable** — the OpenRouter key stays in `backend/.env`;
   any model slug works via `OPENROUTER_MODEL`.
5. **Graceful degradation** — if the LLM is down / unconfigured, detectors still
   run and a `note` explains the missing reply instead of erroring.
6. **Explainable by construction** — every verdict ships with per-detector factors.
