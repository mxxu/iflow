// Default to local Ollama; set SUMMARIZER=gemini to use Gemini API instead
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen3:8b'
const GEMINI_MODEL = 'gemini-2.0-flash'

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

  // Extract JSON object if surrounded by extra text
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return null

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

async function summarizeWithGemini(title: string, url: string): Promise<SummaryResult | null> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('Missing GEMINI_API_KEY')

  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })
  const result = await model.generateContent(PROMPT_TEMPLATE(title, url))
  return parseResult(result.response.text())
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
