import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { Article } from '@/lib/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  return NextResponse.json(
    { data: data as Article },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
  )
}
