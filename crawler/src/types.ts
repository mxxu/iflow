export interface Article {
  guid: string
  title: string
  url: string
  source_name: string
  source_url: string
  published_at: string // ISO string
  summary: string | null
  tags: string[]
  heat_score: number
}

export interface Feed {
  name: string
  url: string
}
