import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

/**
 * Send text to the FastAPI guardrail backend for analysis.
 *
 * @param {string} text  The prompt or model response to scan.
 * @param {'prompt' | 'response'} mode  How the text should be treated.
 * @returns {Promise<{
 *   safety_score: number,
 *   category: 'Prompt Injection'|'Jailbreak'|'PII Exposure'|'Hallucination Risk'|'Safe',
 *   action: 'BLOCKED'|'ALLOWED',
 *   explanation: string,
 *   redacted_text: string|null
 * }>}
 */
export async function analyzeText(text, mode) {
  const { data } = await client.post('/api/analyze', { text, mode })
  return data
}

/**
 * Run the full guardrail pipeline on a chat message:
 * input screening → LLM (OpenRouter) → output detectors → explainability.
 *
 * @param {string} message  The user's chat message.
 * @param {Array<{role:string, content:string}>} [history]  Prior turns.
 * @returns {Promise<{
 *   action: 'ALLOWED'|'BLOCKED',
 *   category: string,
 *   safety_score: number,
 *   reply: string|null,
 *   model: string|null,
 *   blocked_stage: 'input'|'output'|null,
 *   redacted_text: string|null,
 *   note: string|null,
 *   detectors: Record<string, any>,
 *   explainability: {
 *     summary: string, stage: string, decision: string,
 *     primary_category: string,
 *     factors: Array<{detector:string, detected:boolean, severity:string, reason:string, evidence:string[]}>,
 *     triggered: string[]
 *   }
 * }>}
 */
export async function sendChatMessage(message, history) {
  const { data } = await client.post('/api/chat', { message, history })
  return data
}

/** Whether the backend has an LLM (OpenRouter) key configured. */
export async function getConfig() {
  const { data } = await client.get('/api/config')
  return data
}

export { BASE_URL }
export default client
