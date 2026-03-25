// API base URL: 앱(Capacitor)에서는 Vercel URL, 웹에서는 상대경로
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''

export function apiUrl(path: string): string {
  // path는 /api/xxx 형태
  return `${API_BASE}${path}`
}
