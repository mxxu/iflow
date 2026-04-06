import Parser from 'rss-parser'
import { z } from 'zod'
import type { Article, Feed } from './types.js'
import { calcHeatScore } from './scorer.js'

const rssParser = new Parser({
  timeout: 10000,
  customFields: {
    item: [['media:content', 'mediaContent']],
  },
})

const RssItemSchema = z.object({
  title: z.string().min(1),
  link: z.string().url(),
  isoDate: z.string().optional(),
  pubDate: z.string().optional(),
  guid: z.string().optional(),
  contentSnippet: z.string().optional(),
})

export async function parseFeed(feed: Feed): Promise<Article[]> {
  let parsed
  try {
    parsed = await rssParser.parseURL(feed.url)
  } catch (err) {
    console.warn(`[parser] Failed to fetch ${feed.name}: ${(err as Error).message}`)
    return []
  }

  const articles: Article[] = []

  // Cap at 30 most recent items per feed to avoid ingesting full history
  const items = (parsed.items ?? []).slice(0, 30)

  for (const item of items) {
    const result = RssItemSchema.safeParse(item)
    if (!result.success) continue

    const { title, link, isoDate, pubDate, guid, contentSnippet } = result.data

    const publishedAt = new Date(isoDate ?? pubDate ?? Date.now())
    if (isNaN(publishedAt.getTime())) continue

    articles.push({
      guid: guid ?? link,
      title: title.trim(),
      url: link,
      source_name: feed.name,
      source_url: feed.url,
      published_at: publishedAt.toISOString(),
      summary: contentSnippet?.trim() || null,
      tags: [],
      heat_score: calcHeatScore(publishedAt),
    })
  }

  return articles
}
