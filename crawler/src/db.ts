import { createClient } from '@supabase/supabase-js'
import type { Article } from './types.js'

function getClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  // auth.autoRefreshToken/persistSession disabled — this is a server-side script
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function upsertArticles(articles: Article[]): Promise<void> {
  if (articles.length === 0) return
  const supabase = getClient()

  const { error } = await supabase.from('articles').upsert(
    articles.map((a) => ({
      guid: a.guid,
      title: a.title,
      url: a.url,
      source_name: a.source_name,
      source_url: a.source_url,
      published_at: a.published_at,
      // Only set summary/tags on insert; don't overwrite Gemini-generated ones
      summary: a.summary,
      tags: a.tags,
      heat_score: a.heat_score,
    })),
    {
      onConflict: 'guid',
      ignoreDuplicates: false,
    }
  )

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`)
}

export async function getArticlesNeedingSummary(limit = 20): Promise<{ id: string; title: string; url: string }[]> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, url')
    .is('summary', null)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Supabase query failed: ${error.message}`)
  return data ?? []
}

export async function updateSummaryAndTags(id: string, summary: string, tags: string[]): Promise<void> {
  const supabase = getClient()
  const { error } = await supabase.from('articles').update({ summary, tags }).eq('id', id)
  if (error) throw new Error(`Supabase update failed: ${error.message}`)
}
