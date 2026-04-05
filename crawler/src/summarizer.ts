// Default to local Ollama; set SUMMARIZER=gemini to use Gemini API instead
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen3:8b'

// Gemini model pool — tried in order, falls back on 429 (quota exhausted)
// RPM=15 for all; RPD: gemma-4-26b=1500, gemma-4-31b=1500, gemini-3.1-flash-lite=500
const GEMINI_MODEL_POOL = [
  'gemma-4-26b-a4b-it',      // primary: RPD 1500
  'gemma-4-31b-it',          // fallback: RPD 1500
  'gemini-3.1-flash-lite-preview', // last resort: RPD 500
]

export const GEMINI_RPM = 15 // requests per minute, same for all pool models

interface SummaryResult {
  summary: string
  tags: string[]
}

const PROMPT_TEMPLATE = (title: string, url: string) => `你是一位科技新闻编辑。根据文章标题（和URL），生成：
1. 1-2句简洁的中文摘要，抓住核心要点
2. 3-5个简短的中文主题标签（如"大模型"、"AI芯片"、"开源"、"融资"、"产品发布"）

文章标题：${title}
URL：${url}

只输出合法JSON，不要markdown，格式如下：
{"summary": "...", "tags": ["...", "..."]}`

function parseResult(text: string): SummaryResult | null {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/, '')
    // Strip <think>...</think> blocks from reasoning models (deepseek-r1, qwen3)
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim()

  // Extract the LAST JSON object — models like Gemma 4 emit chain-of-thought
  // followed by multiple JSON blocks; the final one is the actual answer
  const matches = [...cleaned.matchAll(/\{[^{}]*\}/g)]
  if (matches.length === 0) return null
  const match = matches[matches.length - 1]

  const parsed = JSON.parse(match[0]) as { summary: string; tags: string[] }
  if (typeof parsed.summary !== 'string' || !Array.isArray(parsed.tags)) return null

  return { summary: parsed.summary, tags: parsed.tags.slice(0, 5) }
}

async function summarizeWithOllama(title: string, url: string): Promise<SummaryResult | null> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: PROMPT_TEMPLATE(title, url),
      stream: false,
      options: { temperature: 0.3 },
    }),
  })

  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}: ${await response.text()}`)

  const data = (await response.json()) as { response: string }
  return parseResult(data.response)
}

// Tracks which model in the pool is currently active
let activeModelIndex = 0

async function summarizeWithGemini(title: string, url: string): Promise<SummaryResult | null> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('Missing GEMINI_API_KEY')

  const genAI = new GoogleGenerativeAI(key)

  // Try each model in pool; rotate on 429
  for (let attempt = 0; attempt < GEMINI_MODEL_POOL.length; attempt++) {
    const modelId = GEMINI_MODEL_POOL[activeModelIndex]
    try {
      const model = genAI.getGenerativeModel({ model: modelId })
      const result = await model.generateContent(PROMPT_TEMPLATE(title, url))
      return parseResult(result.response.text())
    } catch (err) {
      const msg = (err as Error).message
      const isQuotaError = msg.includes('429') || msg.includes('quota')
      if (isQuotaError && activeModelIndex < GEMINI_MODEL_POOL.length - 1) {
        console.warn(`[summarizer] ${modelId} quota exhausted, switching to next model`)
        activeModelIndex++
      } else {
        throw err
      }
    }
  }

  throw new Error('All Gemini models in pool exhausted')
}

export async function summarizeArticle(title: string, url: string): Promise<SummaryResult | null> {
  const backend = process.env.SUMMARIZER === 'gemini' ? 'gemini' : 'ollama'
  try {
    return backend === 'gemini'
      ? await summarizeWithGemini(title, url)
      : await summarizeWithOllama(title, url)
  } catch (err) {
    console.warn(`[summarizer:${backend}] Failed for "${title}": ${(err as Error).message}`)
    return null
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
