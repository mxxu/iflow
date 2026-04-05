import { createServerSupabaseClient } from '@/lib/supabase'
import { FeedGrid } from '@/components/FeedGrid'
import type { Article } from '@/lib/types'

// Regenerate page every hour (ISR)
export const revalidate = 3600

async function getArticles(): Promise<Article[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('articles')
    .select('id, guid, title, url, source_name, source_url, published_at, summary, tags, heat_score, created_at')
    .order('heat_score', { ascending: false })
    .limit(60)

  if (error) {
    console.error('Failed to fetch articles:', error.message)
    return []
  }
  return (data as Article[]) ?? []
}

export default async function HomePage() {
  const articles = await getArticles()

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">iFlow</h1>
        <p className="mt-1 text-sm text-white/40">科技资讯 · 实时聚合 · 热度排序</p>
      </header>

      {/* Stats bar */}
      <div className="mb-6 flex items-center gap-4 text-xs text-white/30">
        <span>{articles.length} 篇文章</span>
        <span>·</span>
        <span>每4小时更新</span>
        <span>·</span>
        <span>来源: HN · TechCrunch · The Verge · MIT TR · 更多</span>
      </div>

      <FeedGrid articles={articles} />
    </main>
  )
}
