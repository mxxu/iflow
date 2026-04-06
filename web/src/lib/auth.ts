import { NextRequest, NextResponse } from 'next/server'

export function verifyApiKey(request: NextRequest): NextResponse | null {
  const secret = process.env.API_SECRET_KEY
  // If no secret is configured, allow all requests (dev mode)
  if (!secret) return null

  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return null

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
