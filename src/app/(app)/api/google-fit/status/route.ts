import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const hasToken = !!cookieStore.get('gfit_token')?.value
  const hasRefresh = !!cookieStore.get('gfit_refresh')?.value

  return NextResponse.json({
    hasToken,
    hasRefresh,
  })
}
