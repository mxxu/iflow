import 'dotenv/config'
import { setupProxy } from './proxy.js'
setupProxy()
import { feeds } from './feeds.js'
import { parseFeed } from './parser.js'
import { upsertArticles, getArticlesNeedingSummary, updateSummaryAndTags, deleteOldArticles } from './db.js'
import { summarizeArticle, sleep, GEMINI_RPM } from './summarizer.js'

const USE_GEMINI = process.env.SUMMARIZER === 'gemini'

async function main() {
  console.log(`[crawler] Starting at ${new Date().toISOString()}`)

  // Phase 0: Clean up articles older than 7 days
  const deleted = await deleteOldArticles(7)
  if (deleted > 0) console.log(`[crawler] Deleted ${deleted} articles older than 7 days`)

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
  const PER_RUN_LIMIT = USE_GEMINI ? 200 : 20
  // RPM=15 → process in batches of 5 concurrent requests, then wait 20s
  // 5 req / 20s = 15 RPM, batch processing is 5x faster than serial
  const GEMINI_CONCURRENCY = USE_GEMINI ? 5 : 1
  const GEMINI_BATCH_SLEEP_MS = USE_GEMINI ? 20_000 : 0

  const needsSummary = await getArticlesNeedingSummary(PER_RUN_LIMIT)
  console.log(`[crawler] ${needsSummary.length} articles need summaries (limit: ${PER_RUN_LIMIT}, concurrency: ${GEMINI_CONCURRENCY})`)

  // Process in concurrent batches
  for (let i = 0; i < needsSummary.length; i += GEMINI_CONCURRENCY) {
    const batch = needsSummary.slice(i, i + GEMINI_CONCURRENCY)
    await Promise.all(
      batch.map(async (article) => {
        const result = await summarizeArticle(article.title, article.url)
        if (result) {
          await updateSummaryAndTags(article.id, result.summary, result.tags)
          console.log(`[crawler] Summarized: ${article.title.slice(0, 60)}`)
        }
      })
    )
    // Wait between batches to respect RPM limit (skip after last batch)
    if (GEMINI_BATCH_SLEEP_MS > 0 && i + GEMINI_CONCURRENCY < needsSummary.length) {
      await sleep(GEMINI_BATCH_SLEEP_MS)
    }
  }

  console.log(`[crawler] Done at ${new Date().toISOString()}`)
}

main().catch((err) => {
  console.error('[crawler] Fatal error:', err)
  process.exit(1)
})
