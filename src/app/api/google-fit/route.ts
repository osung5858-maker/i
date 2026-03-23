import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const GOOGLE_FIT_BASE = 'https://www.googleapis.com/fitness/v1/users/me'

// Google Fit 데이터소스 타입
const DATA_SOURCES = {
  steps: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
  sleep: 'derived:com.google.sleep.segment:com.google.android.gms:merged',
  weight: 'derived:com.google.weight:com.google.android.gms:merge_weight',
  heartRate: 'derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm',
}

function todayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return {
    startTimeMillis: start.getTime().toString(),
    endTimeMillis: now.getTime().toString(),
  }
}

function weekRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
  return {
    startTimeMillis: start.getTime().toString(),
    endTimeMillis: now.getTime().toString(),
  }
}

async function refreshToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret || !refreshToken) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null
  const data = await res.json()
  return data.access_token || null
}

async function fetchWithRefresh(url: string, body: object | null, cookieStore: any) {
  let token = cookieStore.get('gfit_token')?.value
  const refresh = cookieStore.get('gfit_refresh')?.value

  const doFetch = async (t: string) => {
    const opts: RequestInit = {
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    }
    if (body) {
      opts.method = 'POST'
      opts.body = JSON.stringify(body)
    }
    return fetch(url, opts)
  }

  if (token) {
    const res = await doFetch(token)
    if (res.ok) return { res, newToken: null }
    if (res.status === 401 && refresh) {
      const newToken = await refreshToken(refresh)
      if (newToken) {
        const res2 = await doFetch(newToken)
        if (res2.ok) return { res: res2, newToken }
      }
    }
    return { res, newToken: null }
  }

  if (refresh) {
    const newToken = await refreshToken(refresh)
    if (newToken) {
      const res = await doFetch(newToken)
      return { res, newToken }
    }
  }

  return { res: null, newToken: null }
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'today'

  try {
    const range = type === 'week' ? weekRange() : todayRange()

    // 걸음수 + 체중을 aggregate로 가져오기
    const aggregateBody = {
      aggregateBy: [
        { dataTypeName: 'com.google.step_count.delta' },
        { dataTypeName: 'com.google.weight' },
        { dataTypeName: 'com.google.heart_rate.bpm' },
      ],
      bucketByTime: { durationMillis: 86400000 }, // 1일 단위
      ...range,
    }

    const { res: aggRes, newToken } = await fetchWithRefresh(
      `${GOOGLE_FIT_BASE}/dataset:aggregate`,
      aggregateBody,
      cookieStore,
    )

    if (!aggRes || !aggRes.ok) {
      const status = aggRes?.status || 401
      if (status === 401) {
        return NextResponse.json({ error: 'token_expired', connected: false }, { status: 401 })
      }
      return NextResponse.json({ error: 'google_fit_error', connected: false }, { status })
    }

    const aggData = await aggRes.json()

    // 수면 데이터 별도 조회 (세션 기반)
    const { res: sleepRes } = await fetchWithRefresh(
      `${GOOGLE_FIT_BASE}/sessions?startTime=${new Date(Number(range.startTimeMillis)).toISOString()}&endTime=${new Date(Number(range.endTimeMillis)).toISOString()}&activityType=72`,
      null,
      cookieStore,
    )

    let sleepData = null
    if (sleepRes?.ok) {
      sleepData = await sleepRes.json()
    }

    // 파싱
    const result = parseGoogleFitData(aggData, sleepData, type)

    const response = NextResponse.json({ connected: true, ...result })

    // 토큰 갱신됐으면 쿠키 업데이트
    if (newToken) {
      response.cookies.set('gfit_token', newToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 3600,
        path: '/',
      })
    }

    return response
  } catch (e) {
    console.error('Google Fit API error:', e)
    return NextResponse.json({ error: 'server_error', connected: false }, { status: 500 })
  }
}

function parseGoogleFitData(aggData: any, sleepData: any, type: string) {
  const days: Record<string, { steps: number; weight: number; heartRate: number; sleep: number }> = {}

  // 집계 데이터 파싱
  for (const bucket of aggData.bucket || []) {
    const date = new Date(Number(bucket.startTimeMillis)).toISOString().split('T')[0]
    if (!days[date]) days[date] = { steps: 0, weight: 0, heartRate: 0, sleep: 0 }

    for (const ds of bucket.dataset || []) {
      for (const point of ds.point || []) {
        const typeName = point.dataTypeName
        const val = point.value?.[0]

        if (typeName === 'com.google.step_count.delta') {
          days[date].steps += val?.intVal || 0
        } else if (typeName === 'com.google.weight.summary') {
          // average weight
          days[date].weight = val?.fpVal || point.value?.[1]?.fpVal || 0
        } else if (typeName === 'com.google.heart_rate.summary') {
          days[date].heartRate = point.value?.[1]?.fpVal || val?.fpVal || 0 // average
        }
      }
    }
  }

  // 수면 세션 파싱
  if (sleepData?.session) {
    for (const session of sleepData.session) {
      const start = Number(session.startTimeMillis)
      const end = Number(session.endTimeMillis)
      const date = new Date(end).toISOString().split('T')[0]
      const hours = (end - start) / (1000 * 60 * 60)
      if (!days[date]) days[date] = { steps: 0, weight: 0, heartRate: 0, sleep: 0 }
      days[date].sleep += hours
    }
  }

  // 오늘 데이터
  const today = new Date().toISOString().split('T')[0]
  const todayData = days[today] || { steps: 0, weight: 0, heartRate: 0, sleep: 0 }

  return {
    today: {
      ...todayData,
      sleep: Math.round(todayData.sleep * 10) / 10,
      weight: Math.round(todayData.weight * 10) / 10,
    },
    days,
  }
}
