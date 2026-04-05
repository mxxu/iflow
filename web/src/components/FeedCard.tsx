import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ExternalLink } from 'lucide-react'
import type { Article } from '@/lib/types'

// Deterministic color from source name for tag/accent visuals
function sourceColor(name: string): string {
  const colors = [
    'bg-blue-900/40 text-blue-300',
    'bg-purple-900/40 text-purple-300',
    'bg-green-900/40 text-green-300',
    'bg-orange-900/40 text-orange-300',
    'bg-rose-900/40 text-rose-300',
    'bg-cyan-900/40 text-cyan-300',
    'bg-amber-900/40 text-amber-300',
  ]
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffff
  return colors[hash % colors.length]
}

export function FeedCard({ article }: { article: Article }) {
  const timeAgo = formatDistanceToNow(new Date(article.published_at), {
    addSuffix: true,
    locale: zhCN,
  })

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(article.url).hostname}&sz=16`

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-white/8 bg-white/4 p-4 transition-all duration-200 hover:border-white/20 hover:bg-white/8"
    >
      {/* Source + time */}
      <div className="mb-2 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={faviconUrl} alt="" width={14} height={14} className="opacity-70" />
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sourceColor(article.source_name)}`}>
          {article.source_name}
        </span>
        <span className="ml-auto text-xs text-white/40">{timeAgo}</span>
      </div>

      {/* Title */}
      <h2 className="mb-2 text-sm font-semibold leading-snug text-white/90 group-hover:text-white line-clamp-2">
        {article.title}
        <ExternalLink className="ml-1 inline h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
      </h2>

      {/* Summary */}
      {article.summary && (
        <p className="mb-3 text-xs leading-relaxed text-white/50 line-clamp-3">{article.summary}</p>
      )}

      {/* Tags */}
      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {article.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-white/6 px-2 py-0.5 text-xs text-white/40">
              {tag}
            </span>
          ))}
        </div>
      )}
    </a>
  )
}
