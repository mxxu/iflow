import { FeedCard } from './FeedCard'
import type { Article } from '@/lib/types'

export function FeedGrid({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return (
      <div className="py-24 text-center text-white/30">
        <p className="text-lg">暂无内容</p>
        <p className="mt-1 text-sm">爬虫将在下一个整点运行</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {articles.map((article) => (
        <FeedCard key={article.id} article={article} />
      ))}
    </div>
  )
}
