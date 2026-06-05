import { useState, useRef, useEffect } from 'react'
import {
  Plus,
  Mic,
  ArrowUp,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Sparkles,
  EyeOff,
  AlertTriangle,
  Check,
  X,
  Cpu,
  ChevronDown,
} from 'lucide-react'
import { sendChatMessage, getConfig } from '../services/api'
import { saveScanLog, isFirebaseConfigured } from '../services/firebase'
import SafetyScoreBar from './SafetyScoreBar'
import CategoryBadge from './CategoryBadge'

/**
 * Conversational landing page wired to the full guardrail pipeline:
 *
 *   prompt -> input guardrail -> LLM (OpenRouter) -> output detectors
 *          -> Explainability Engine -> ALLOW / BLOCK
 *
 * Each assistant turn shows the model's reply (when allowed) plus a guardrail
 * report: the verdict, safety score, and per-detector explainability.
 */

const SUGGESTIONS = [
  { label: 'Ask a question', icon: Sparkles, text: 'Explain how HTTPS keeps a connection secure, in simple terms.' },
]

let nextId = 0
const makeId = () => `m${nextId++}`

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [llmConfigured, setLlmConfigured] = useState(true)
  const endRef = useRef(null)
  const textareaRef = useRef(null)

  const hasThread = messages.length > 0

  useEffect(() => {
    getConfig()
      .then((c) => setLlmConfigured(!!c.llm_configured))
      .catch(() => setLlmConfigured(true)) // backend down — don't nag yet
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [input])

  async function send(rawText) {
    const text = (rawText ?? input).trim()
    if (!text || loading) return

    // Build short history from prior turns for multi-turn context.
    const history = messages
      .filter((m) => m.role === 'user' || m.result?.reply)
      .map((m) => ({
        role: m.role,
        content: m.role === 'user' ? m.text : m.result.reply,
      }))

    setMessages((m) => [...m, { id: makeId(), role: 'user', text }])
    setInput('')
    setLoading(true)

    try {
      const data = await sendChatMessage(text, history)
      setMessages((m) => [...m, { id: makeId(), role: 'assistant', text, result: data }])
      // Persist a history record (mapped to the scan-log shape).
      saveScanLog({
        text,
        mode: 'prompt',
        safety_score: data.safety_score,
        category: data.category,
        action: data.action,
        explanation: data.explainability?.summary || '',
        redacted_text: data.redacted_text || null,
      }).catch((e) => console.error('[chat] failed to save log', e))
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          id: makeId(),
          role: 'assistant',
          error:
            e?.response?.data?.detail ||
            e?.message ||
            'Failed to reach the guardrail service.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-3xl flex-col md:h-[calc(100vh-3rem)]">
      {hasThread ? (
        <div className="flex-1 space-y-6 overflow-y-auto pb-6 pt-2">
          {messages.map((msg) =>
            msg.role === 'user' ? (
              <UserBubble key={msg.id} text={msg.text} />
            ) : (
              <AssistantBubble key={msg.id} msg={msg} />
            ),
          )}
          {loading && <ThinkingBubble />}
          <div ref={endRef} />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <h1 className="mb-8 text-center text-3xl font-semibold tracking-tight text-slate-900">
            What&apos;s on the agenda today?
          </h1>
          <div className="w-full max-w-2xl">
            <Composer
              input={input}
              setInput={setInput}
              onSend={() => send()}
              onKeyDown={handleKeyDown}
              loading={loading}
              textareaRef={textareaRef}
            />
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map(({ label, icon: Icon, text }) => (
                <button
                  key={label}
                  onClick={() => send(text)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-ink-900 px-3.5 py-2 text-sm text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
                >
                  <Icon className="h-4 w-4 text-slate-500" />
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-slate-500">
              Every message is screened by the guardrail, answered by an LLM, then
              re-screened before you see it.
            </p>
            {!llmConfigured && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-yellow-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                No OpenRouter key on the server — set OPENROUTER_API_KEY in
                backend/.env to get model replies.
              </p>
            )}
          </div>
        </div>
      )}

      {hasThread && (
        <div className="border-t border-slate-200 bg-ink-950/80 pt-4 backdrop-blur">
          <Composer
            input={input}
            setInput={setInput}
            onSend={() => send()}
            onKeyDown={handleKeyDown}
            loading={loading}
            textareaRef={textareaRef}
          />
          {!isFirebaseConfigured && (
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Firebase isn&apos;t configured — this chat won&apos;t be saved to history.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Composer({ input, setInput, onSend, onKeyDown, loading, textareaRef }) {
  const canSend = input.trim().length > 0 && !loading
  return (
    <div className="flex items-end gap-2 rounded-[28px] border border-slate-300 bg-ink-900 px-3 py-2 shadow-sm transition-shadow focus-within:shadow-md">
      <button
        type="button"
        className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label="Add attachment"
      >
        <Plus className="h-5 w-5" />
      </button>
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder="Ask anything"
        className="flex-1 resize-none bg-transparent py-1.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
      <button
        type="button"
        className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label="Dictate"
      >
        <Mic className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onSend}
        disabled={!canSend}
        className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Send message"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
      </button>
    </div>
  )
}

function UserBubble({ text }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-slate-900 px-4 py-2.5 text-[15px] text-white">
        {text}
      </div>
    </div>
  )
}

function AssistantBubble({ msg }) {
  if (msg.error) {
    return (
      <div className="flex gap-3">
        <Avatar danger />
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl rounded-tl-md border border-risk-high/30 bg-risk-high/10 px-4 py-3 text-sm text-red-700">
            {msg.error}
          </div>
        </div>
      </div>
    )
  }

  const r = msg.result
  const blocked = r.action === 'BLOCKED'

  return (
    <div className="flex gap-3">
      <Avatar danger={blocked} />
      <div className="min-w-0 flex-1 space-y-2.5">
        {/* The model's reply (when allowed) */}
        {r.reply && (
          <div className="whitespace-pre-wrap rounded-2xl rounded-tl-md border border-slate-200 bg-ink-900 px-4 py-3 text-[15px] leading-relaxed text-slate-800 shadow-sm">
            {r.reply}
          </div>
        )}

        {/* Blocked: no reply, show the refusal */}
        {blocked && (
          <div className="rounded-2xl rounded-tl-md border border-risk-high/30 bg-risk-high/10 px-4 py-3 text-[15px] leading-relaxed text-red-700">
            {r.blocked_stage === 'input'
              ? "I can't help with that — your message was blocked by the guardrail before reaching the model."
              : 'The model produced a response that was blocked by the guardrail, so it has been withheld.'}
          </div>
        )}

        {/* Note (PII redacted / hallucination warning / LLM unavailable) */}
        {r.note && (
          <div className="flex items-start gap-1.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{r.note}</span>
          </div>
        )}

        <GuardrailReport result={r} />
      </div>
    </div>
  )
}

function Avatar({ danger }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
        danger ? 'bg-risk-high/15' : 'bg-risk-low/15'
      }`}
    >
      {danger ? (
        <ShieldAlert className="h-4 w-4 text-risk-high" />
      ) : (
        <ShieldCheck className="h-4 w-4 text-risk-low" />
      )}
    </div>
  )
}

/** Collapsible guardrail verdict + per-detector explainability. */
function GuardrailReport({ result }) {
  const [open, setOpen] = useState(false)
  const blocked = result.action === 'BLOCKED'
  const factors = result.explainability?.factors || []

  return (
    <div className="rounded-xl border border-slate-200 bg-ink-950">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold ${
            blocked ? 'bg-risk-high/15 text-risk-high' : 'bg-risk-low/15 text-risk-low'
          }`}
        >
          {blocked ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {result.action}
        </span>
        <CategoryBadge category={result.category} size="sm" />
        {result.model && (
          <span className="hidden items-center gap-1 text-[11px] text-slate-400 sm:inline-flex">
            <Cpu className="h-3 w-3" />
            {result.model}
          </span>
        )}
        <ChevronDown
          className={`ml-auto h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-200 px-3 py-3">
          <p className="text-xs text-slate-600">{result.explainability?.summary}</p>

          <SafetyScoreBar score={result.safety_score} size="sm" />

          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Detectors
            </div>
            {factors.map((f) => (
              <FactorRow key={f.detector} factor={f} />
            ))}
          </div>

          {result.redacted_text && (
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                <EyeOff className="h-3.5 w-3.5" />
                Redacted reply
              </div>
              <p className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-2.5 font-mono text-xs leading-relaxed text-blue-800">
                {result.redacted_text}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FactorRow({ factor }) {
  const { detector, detected, severity, evidence } = factor
  return (
    <div className="flex items-start gap-2 text-xs">
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
          detected ? 'bg-risk-high/15 text-risk-high' : 'bg-risk-low/15 text-risk-low'
        }`}
      >
        {detected ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
      </span>
      <div className="min-w-0 flex-1">
        <span className="font-medium text-slate-700">{detector}</span>
        {detected && (
          <span className="ml-1.5 text-slate-500">
            · {severity}
            {evidence?.length ? ` · ${evidence.slice(0, 3).join(', ')}` : ''}
          </span>
        )}
      </div>
    </div>
  )
}

function ThinkingBubble() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-risk-low/15">
        <ShieldCheck className="h-4 w-4 text-risk-low" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-slate-200 bg-ink-900 px-4 py-3.5 shadow-sm">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
