'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageLayout'

// 사진 확대 뷰어
function ImageViewer({ images, startIndex, onClose }: { images: { original: string; thumbnail: string }[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex)
  const touchStart = { current: 0 }

  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStart.current
    if (Math.abs(diff) > 50) {
      if (diff < 0 && idx < images.length - 1) setIdx(p => p + 1)  // 왼쪽 스와이프 → 다음
      if (diff > 0 && idx > 0) setIdx(p => p - 1)                   // 오른쪽 스와이프 → 이전
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-[13px] text-white/70">{idx + 1} / {images.length}</span>
        <button onClick={onClose} className="text-white text-xl font-light">✕</button>
      </div>
      <div className="flex-1 flex items-center justify-center px-2"
        onClick={e => e.stopPropagation()} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <img src={images[idx].original} alt="" className="max-w-full max-h-[80vh] object-contain rounded-lg select-none" draggable={false} />
      </div>
      {images.length > 1 && (
        <>
          <div className="flex justify-center gap-1 py-2">
            {images.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 pb-4">
            <button onClick={(e) => { e.stopPropagation(); setIdx(p => Math.max(0, p - 1)) }}
              disabled={idx === 0} className="w-10 h-10 rounded-full bg-white/20 text-white disabled:opacity-30 text-lg">←</button>
            <button onClick={(e) => { e.stopPropagation(); setIdx(p => Math.min(images.length - 1, p + 1)) }}
              disabled={idx === images.length - 1} className="w-10 h-10 rounded-full bg-white/20 text-white disabled:opacity-30 text-lg">→</button>
          </div>
        </>
      )}
    </div>
  )
}

export default function KidsnotePage() {
  const [step, setStep] = useState<'login' | 'children' | 'data'>('login')
  const [viewerImages, setViewerImages] = useState<{ original: string; thumbnail: string }[] | null>(null)
  const [viewerStart, setViewerStart] = useState(0)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saveCredentials, setSaveCredentials] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingAlbums, setLoadingAlbums] = useState(false)
  const [loadingReports, setLoadingReports] = useState(false)
  const [albumProgress, setAlbumProgress] = useState(0)
  const [reportProgress, setReportProgress] = useState(0)
  const [albumTotal, setAlbumTotal] = useState(0)
  const [reportTotal, setReportTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('kn_agreed') === 'true'
    return false
  })
  const [session, setSession] = useState<string | null>(null)
  const [info, setInfo] = useState<any>(null)
  const [children, setChildren] = useState<any[]>([])
  const [selectedChild, setSelectedChild] = useState<number | null>(null)
  const [albums, setAlbums] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [tab, setTab] = useState<'albums' | 'reports'>('albums')

  // 세션 + 저장된 계정 + 캐시 복원
  useEffect(() => {
    const savedCreds = localStorage.getItem('kn_credentials')
    if (savedCreds) {
      try {
        const { u, p } = JSON.parse(savedCreds)
        setUsername(u); setPassword(p); setSaveCredentials(true)
      } catch { /* */ }
    }
    // 캐시된 데이터 복원
    const cachedAlbums = localStorage.getItem('kn_cache_albums')
    const cachedReports = localStorage.getItem('kn_cache_reports')
    if (cachedAlbums) try { setAlbums(JSON.parse(cachedAlbums)) } catch { /* */ }
    if (cachedReports) try { setReports(JSON.parse(cachedReports)) } catch { /* */ }

    const saved = sessionStorage.getItem('kn_session')
    if (saved) {
      setSession(saved)
      setStep('children')
      loadChildren(saved)
    }
  }, [])

  const handleLogin = async () => {
    if (!username || !password) { setError('아이디와 비밀번호를 입력해주세요'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/kidsnote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }

      setSession(data.sessionCookie)
      setInfo(data.info)
      sessionStorage.setItem('kn_session', data.sessionCookie)
      // 계정 저장 체크 시 localStorage에 보관
      if (saveCredentials) {
        localStorage.setItem('kn_credentials', JSON.stringify({ u: username, p: password }))
      } else {
        localStorage.removeItem('kn_credentials')
        setPassword('') // 비밀번호 즉시 삭제
      }
      // 로그인 응답에 children이 바로 포함됨
      const kids = data.children || []
      setChildren(kids)
      if (kids.length === 1) {
        setSelectedChild(kids[0].id)
        setStep('data')
      } else if (kids.length > 1) {
        setStep('children')
      } else {
        setStep('data')
      }
    } catch (e) { setError(`연결 실패: ${e}`) }
    setLoading(false)
  }

  const loadChildren = async (cookie: string) => {
    try {
      const res = await fetch('/api/kidsnote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'children', sessionCookie: cookie }),
      })
      const data = await res.json()
      const kids = data.children || data.results || []
      setChildren(Array.isArray(kids) ? kids : [])
      if (kids.length === 1) {
        setSelectedChild(kids[0].id || kids[0].child_id)
        setStep('data')
        // 캐시 있으면 바로 보여주고, 가져오기는 새로고침용
      } else if (kids.length > 1) {
        setStep('children')
      } else {
        setStep('data')
      }
    } catch { /* */ }
  }

  const loadAlbums = async (cookie: string, childId: number) => {
    setLoadingAlbums(true); setAlbumProgress(0); setAlbumTotal(0); setAlbums([])
    try {
      let all: any[] = []; let nextCursor: string | null = null; let hasMore = true
      while (hasMore) {
        const r: Response = await fetch('/api/kidsnote', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'albums', sessionCookie: cookie, childId, cursor: nextCursor }),
        })
        const d: { results?: any[]; count?: number; next?: string | null } = await r.json()
        const items = d.results || []
        const total = d.count || 0
        all = [...all, ...items]
        setAlbums([...all]); setAlbumTotal(total || all.length)
        setAlbumProgress(total ? Math.min(100, Math.round((all.length / total) * 100)) : 100)
        nextCursor = d.next || null
        hasMore = !!nextCursor && items.length > 0
      }
      setAlbumProgress(100)
      // 캐시 저장
      localStorage.setItem('kn_cache_albums', JSON.stringify(all))
    } catch { /* */ }
    setLoadingAlbums(false)
  }

  const loadReports = async (cookie: string, childId: number) => {
    setLoadingReports(true); setReportProgress(0); setReportTotal(0); setReports([])
    try {
      let all: any[] = []; let nextCursor: string | null = null; let hasMore = true
      while (hasMore) {
        const r: Response = await fetch('/api/kidsnote', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reports', sessionCookie: cookie, childId, cursor: nextCursor }),
        })
        const d: { results?: any[]; count?: number; next?: string | null } = await r.json()
        const items = d.results || []
        const total = d.count || 0
        all = [...all, ...items]
        setReports([...all]); setReportTotal(total || all.length)
        setReportProgress(total ? Math.min(100, Math.round((all.length / total) * 100)) : 100)
        nextCursor = d.next || null
        hasMore = !!nextCursor && items.length > 0
      }
      setReportProgress(100)
      // 캐시 저장
      localStorage.setItem('kn_cache_reports', JSON.stringify(all))
    } catch { /* */ }
    setLoadingReports(false)
  }

  const selectChild = (childId: number) => {
    setSelectedChild(childId)
    setStep('data')
    if (session) {
      loadAlbums(session, childId)
      loadReports(session, childId)
    }
  }

  const logout = () => {
    sessionStorage.removeItem('kn_session')
    setSession(null); setStep('login'); setInfo(null); setChildren([])
    setAlbums([]); setReports([])
  }

  // 사진 다운로드
  const downloadImages = async (item: any) => {
    const images = item.images || []
    if (images.length === 0) { alert('다운로드할 사진이 없어요'); return }
    for (let i = 0; i < images.length; i++) {
      try {
        const url = images[i].original || images[i].thumbnail
        if (!url) continue
        const res = await fetch(url)
        const blob = await res.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `kidsnote_${item.id}_${i + 1}.jpg`
        a.click()
        URL.revokeObjectURL(a.href)
      } catch { /* */ }
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#F5F4F1] flex flex-col">
      <PageHeader title="키즈노트" showBack
        rightAction={session ? <button onClick={logout} className="text-[10px] text-[#868B94]">로그아웃</button> : undefined} />

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28 w-full space-y-3">

        {/* 동의 화면 */}
        {step === 'login' && !agreed && (
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-5">
            <div className="text-center mb-4">
              <p className="text-2xl mb-2">🏫</p>
              <p className="text-[15px] font-bold text-[#1A1918]">키즈노트 연동</p>
              <p className="text-[11px] text-[#868B94] mt-1">어린이집 알림장 · 사진을 도담으로 가져와요</p>
            </div>

            <div className="bg-[#F5F4F1] rounded-xl p-4 space-y-3 text-[11px] text-[#555] leading-relaxed">
              <p className="text-[13px] font-bold text-[#1A1918]">연동 전 확인사항</p>
              <div className="space-y-2">
                <p>1. 도담은 키즈노트와 제휴된 서비스가 아닙니다. 키즈노트 계정 정보를 사용자의 동의 하에 직접 입력받아 데이터를 가져옵니다.</p>
                <p>2. 입력하신 계정 정보는 <span className="font-semibold text-[#1A1918]">도담 서버에 저장되지 않으며</span>, 연결 확인 후 즉시 폐기됩니다. (저장 선택 시 사용자 기기에만 보관)</p>
                <p>3. 가져온 데이터(알림장, 사진)는 사용자 기기 내에만 저장되며, 외부로 전송되지 않습니다.</p>
                <p>4. 키즈노트 서비스 정책 변경 시 연동이 중단될 수 있으며, 이에 대해 도담은 책임지지 않습니다.</p>
                <p>5. 본 기능 사용으로 발생하는 키즈노트 계정 관련 문제에 대한 책임은 사용자에게 있습니다.</p>
              </div>
            </div>

            <button onClick={() => { setAgreed(true); localStorage.setItem('kn_agreed', 'true') }}
              className="w-full mt-4 py-3 bg-[#3D8A5A] text-white text-[13px] font-semibold rounded-xl active:opacity-80">
              위 내용을 확인했으며 동의합니다
            </button>

            <button onClick={() => history.back()}
              className="w-full mt-2 py-2.5 text-[13px] text-[#868B94] active:opacity-60">
              돌아가기
            </button>
          </div>
        )}

        {/* 로그인 */}
        {step === 'login' && agreed && (
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-5">
            <div className="text-center mb-4">
              <p className="text-2xl mb-2">🏫</p>
              <p className="text-[15px] font-bold text-[#1A1918]">키즈노트 로그인</p>
              <p className="text-[11px] text-[#868B94] mt-1">키즈노트 계정으로 로그인해주세요</p>
            </div>

            {error && <div className="bg-[#FFF0E6] rounded-lg p-2 mb-3"><p className="text-[11px] text-[#D08068]">{error}</p></div>}

            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-[#868B94] mb-1">키즈노트 아이디 (이메일/전화번호)</p>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="kidsnote@example.com" className="w-full h-11 rounded-xl border border-[#f0f0f0] px-3 text-[13px]" />
              </div>
              <div>
                <p className="text-[11px] text-[#868B94] mb-1">비밀번호</p>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" className="w-full h-11 rounded-xl border border-[#f0f0f0] px-3 text-[13px]" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={saveCredentials} onChange={e => setSaveCredentials(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#3D8A5A]" />
                <span className="text-[12px] text-[#868B94]">아이디/비밀번호 이 기기에 저장하기</span>
              </label>
              <button onClick={handleLogin} disabled={loading}
                className="w-full py-3 bg-[#3D8A5A] text-white text-[13px] font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                {loading ? '연결 중...' : '키즈노트 연결하기'}
              </button>
            </div>

            <div className="mt-4 bg-[#F5F4F1] rounded-lg p-3">
              <p className="text-[10px] text-[#868B94] leading-relaxed">
                🔒 {saveCredentials ? '계정 정보가 이 기기에만 저장돼요. 서버에는 저장되지 않습니다.' : '비밀번호는 서버에 저장되지 않아요. 로그인 후 즉시 삭제됩니다.'}
              </p>
            </div>
          </div>
        )}

        {/* 아이 선택 (여러 명일 때) */}
        {step === 'children' && children.length > 1 && (
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
            <p className="text-[14px] font-bold text-[#1A1918] mb-3">아이를 선택해주세요</p>
            {children.map((child: any) => (
              <button key={child.id || child.child_id} onClick={() => selectChild(child.id || child.child_id)}
                className="w-full p-3 bg-[#F5F4F1] rounded-xl mb-2 text-left active:bg-[#ECECEC]">
                <p className="text-[13px] font-semibold text-[#1A1918]">{child.name || child.nickname || '아이'}</p>
              </button>
            ))}
          </div>
        )}

        {/* 데이터 표시 */}
        {step === 'data' && (
          <>
            {/* 연결 상태 */}
            <div className="bg-white rounded-xl border border-[#f0f0f0] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#3D8A5A]" />
                <span className="text-[13px] font-semibold text-[#1A1918]">키즈노트 연결됨</span>
              </div>
              <div className="space-y-2">
                <div>
                  <button onClick={() => { if (session && selectedChild) loadAlbums(session, selectedChild) }}
                    disabled={loadingAlbums}
                    className="w-full py-2.5 bg-[#F5F4F1] rounded-xl text-[13px] font-semibold text-[#1A1918] active:bg-[#ECECEC] disabled:opacity-50">
                    {loadingAlbums
                      ? `📸 앨범 가져오는 중... (${albums.length}${albumTotal ? `/${albumTotal}` : ''}건)`
                      : albums.length
                        ? `📸 앨범 (${albums.length}건) — 새로고침 🔄`
                        : '📸 앨범 가져오기'}
                  </button>
                  {loadingAlbums && (
                    <div className="mt-1.5 h-1.5 bg-[#E8E8E8] rounded-full overflow-hidden">
                      <div className="h-full bg-[#3D8A5A] rounded-full transition-all duration-300" style={{ width: `${albumProgress}%` }} />
                    </div>
                  )}
                </div>
                <div>
                  <button onClick={() => { if (session && selectedChild) loadReports(session, selectedChild) }}
                    disabled={loadingReports}
                    className="w-full py-2.5 bg-[#F5F4F1] rounded-xl text-[13px] font-semibold text-[#1A1918] active:bg-[#ECECEC] disabled:opacity-50">
                    {loadingReports
                      ? `📋 알림장 가져오는 중... (${reports.length}${reportTotal ? `/${reportTotal}` : ''}건)`
                      : reports.length
                        ? `📋 알림장 (${reports.length}건) — 새로고침 🔄`
                        : '📋 알림장 가져오기'}
                  </button>
                  {loadingReports && (
                    <div className="mt-1.5 h-1.5 bg-[#E8E8E8] rounded-full overflow-hidden">
                      <div className="h-full bg-[#3D8A5A] rounded-full transition-all duration-300" style={{ width: `${reportProgress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 탭 (데이터 있을 때만) */}
            {(albums.length > 0 || reports.length > 0) && (
              <div className="flex gap-1.5">
                <button onClick={() => setTab('albums')}
                  className={`flex-1 py-2 rounded-xl text-[13px] font-semibold ${tab === 'albums' ? 'bg-[#3D8A5A] text-white' : 'bg-white text-[#868B94]'}`}>
                  📸 앨범 {albums.length > 0 && `(${albums.length})`}
                </button>
                <button onClick={() => setTab('reports')}
                  className={`flex-1 py-2 rounded-xl text-[13px] font-semibold ${tab === 'reports' ? 'bg-[#3D8A5A] text-white' : 'bg-white text-[#868B94]'}`}>
                  📋 알림장 {reports.length > 0 && `(${reports.length})`}
                </button>
              </div>
            )}

            {/* 앨범 */}
            {tab === 'albums' && albums.length > 0 && (
              <div className="space-y-2">
                {albums.map((album: any) => (
                  <div key={album.id} className="bg-white rounded-xl border border-[#f0f0f0] p-3">
                    {/* 사진 */}
                    {album.images && album.images.length > 0 && (
                      <div className="flex gap-1.5 mb-2 overflow-x-auto hide-scrollbar">
                        {album.images.slice(0, 4).map((img: any, j: number) => (
                          <img key={j} src={img.thumbnail || img.original} alt=""
                            onClick={() => { setViewerImages(album.images); setViewerStart(j) }}
                            className="w-20 h-20 rounded-lg object-cover shrink-0 cursor-pointer active:opacity-80" />
                        ))}
                        {album.images.length > 4 && (
                          <button onClick={() => { setViewerImages(album.images); setViewerStart(4) }}
                            className="w-20 h-20 rounded-lg bg-[#F5F4F1] flex items-center justify-center shrink-0">
                            <span className="text-[11px] text-[#868B94]">+{album.images.length - 4}</span>
                          </button>
                        )}
                      </div>
                    )}
                    {album.content && <p className="text-[12px] text-[#1A1918] line-clamp-3">{album.content}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9px] text-[#AEB1B9]">{album.created ? new Date(album.created).toLocaleDateString('ko-KR') : ''}</span>
                      <button onClick={() => downloadImages(album)} className="text-[10px] text-[#3D8A5A] font-semibold active:opacity-60">사진 다운로드 📥</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 알림장 */}
            {tab === 'reports' && reports.length > 0 && (
              <div className="space-y-2">
                {reports.map((report: any) => (
                  <div key={report.id} className="bg-white rounded-xl border border-[#f0f0f0] p-3">
                    {report.title && <p className="text-[13px] font-semibold text-[#1A1918] mb-1">{report.title}</p>}
                    {report.content && <p className="text-[12px] text-[#868B94] line-clamp-4 whitespace-pre-line">{report.content}</p>}
                    {report.images && report.images.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {report.images.slice(0, 4).map((img: any, j: number) => (
                          <img key={j} src={img.thumbnail || img.original} alt=""
                            onClick={() => { setViewerImages(report.images); setViewerStart(j) }}
                            className="w-16 h-16 rounded-lg object-cover cursor-pointer active:opacity-80" />
                        ))}
                        {report.images.length > 4 && (
                          <button onClick={() => { setViewerImages(report.images); setViewerStart(4) }}
                            className="w-16 h-16 rounded-lg bg-[#F5F4F1] flex items-center justify-center">
                            <span className="text-[10px] text-[#868B94]">+{report.images.length - 4}</span>
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9px] text-[#AEB1B9]">{report.created ? new Date(report.created).toLocaleDateString('ko-KR') : ''}</span>
                      <button onClick={() => downloadImages(report)} className="text-[10px] text-[#3D8A5A] font-semibold active:opacity-60">사진 다운로드 📥</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 사진 확대 뷰어 */}
      {viewerImages && (
        <ImageViewer images={viewerImages} startIndex={viewerStart} onClose={() => setViewerImages(null)} />
      )}
    </div>
  )
}
