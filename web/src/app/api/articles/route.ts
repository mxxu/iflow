import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { Article } from '@/lib/types'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0)
  const source = searchParams.get('source')
  const tag = searchParams.get('tag')

  const supabase = createServerSupabaseClient()
  let query = supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .order('heat_score', { ascending: false })
    .range(offset, offset + limit - 1)

  if (source) query = query.eq('source_name', source)
  if (tag) query = query.contains('tags', [tag])

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { data: data as Article[], total: count ?? 0, limit, offset },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
  )
}
