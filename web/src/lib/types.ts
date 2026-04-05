export interface Article {
  id: string
  guid: string
  title: string
  url: string
  source_name: string
  source_url: string
  published_at: string
  summary: string | null
  tags: string[]
  heat_score: number
  created_at: string
}
