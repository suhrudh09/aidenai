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

export { BASE_URL }
export default client
