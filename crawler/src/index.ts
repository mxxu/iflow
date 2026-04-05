import 'dotenv/config'
import { setupProxy } from './proxy.js'
setupProxy()
import { feeds } from './feeds.js'
import { parseFeed } from './parser.js'
import { upsertArticles, getArticlesNeedingSummary, updateSummaryAndTags } from './db.js'
import { summarizeArticle, sleep, GEMINI_RPM } from './summarizer.js'

const USE_GEMINI = process.env.SUMMARIZER === 'gemini'

async function main() {
  console.log(`[crawler] Starting at ${new Date().toISOString()}`)

  // Phase 1: Fetch all feeds and upsert articles
  let totalInserted = 0
  for (const feed of feeds) {
    console.log(`[crawler] Fetching ${feed.name}...`)
    const articles = await parseFeed(feed)
    if (articles.length === 0) {
      console.log(`[crawler] No articles from ${feed.name}`)
      continue
    }
    await upsertArticles(articles)
    console.log(`[crawler] Upserted ${articles.length} articles from ${feed.name}`)
    totalInserted += articles.length
  }
  console.log(`[crawler] Phase 1 complete: ${totalInserted} total articles processed`)

  // Phase 2: Generate summaries for articles missing them
  if (USE_GEMINI && !process.env.GEMINI_API_KEY) {
    console.log('[crawler] SUMMARIZER=gemini but GEMINI_API_KEY not set, skipping summarization')
    return
  }
  const backend = USE_GEMINI ? 'Gemini' : `Ollama (${process.env.OLLAMA_MODEL ?? 'qwen3:8b'})`
  console.log(`[crawler] Phase 2: Summarizing with ${backend}...`)

  // Gemini pool total RPD: 1500 + 1500 + 500 = 3500/day
  // Crawl runs 6x/day → ~580 per run, well within capacity; cap at 50 to be safe
  const PER_RUN_LIMIT = USE_GEMINI ? 50 : 20
  // RPM=15 for all pool models → 1 request per 4s (with small buffer)
  const GEMINI_SLEEP_MS = USE_GEMINI ? Math.ceil(60_000 / GEMINI_RPM) + 500 : 0

  const needsSummary = await getArticlesNeedingSummary(PER_RUN_LIMIT)
  console.log(`[crawler] ${needsSummary.length} articles need summaries (limit: ${PER_RUN_LIMIT})`)

  for (const article of needsSummary) {
    const result = await summarizeArticle(article.title, article.url)
    if (result) {
      await updateSummaryAndTags(article.id, result.summary, result.tags)
      console.log(`[crawler] Summarized: ${article.title.slice(0, 60)}`)
    }
    if (GEMINI_SLEEP_MS > 0) await sleep(GEMINI_SLEEP_MS)
  }

  console.log(`[crawler] Done at ${new Date().toISOString()}`)
}

main().catch((err) => {
  console.error('[crawler] Fatal error:', err)
  process.exit(1)
})
