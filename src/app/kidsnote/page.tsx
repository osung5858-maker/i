'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageLayout'
import { encrypt, decrypt } from '@/lib/security/crypto'
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/safeStorage'
import Image from 'next/image'
import dynamic from 'next/dynamic'

// Lazy load ImageViewer - only shown when user clicks on images (modal)
const ImageViewerLazy = dynamic(() => Promise.resolve({ default: ImageViewer }), { ssr: false })

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
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        <span className="text-body text-white/70">{idx + 1} / {images.length}</span>
        <button onClick={onClose} className="text-white text-xl font-light"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
      </div>
      <div className="flex-1 flex items-center justify-center px-2"
        onClick={e => e.stopPropagation()} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="relative w-full" style={{ maxHeight: '80vh', aspectRatio: '1 / 1' }}>
          <Image src={images[idx].original} alt="" fill className="object-contain rounded-lg select-none" draggable={false} />
        </div>
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
  // API가 이미 /api/kidsnote/image?url=... 로 변환해서 내려줌 — 재가공 불필요
  const proxyImg = (url: string) => url

  const [error, setError] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(() => {
    if (typeof window !== 'undefined') return safeGetItem('kn_agreed') === 'true'
    return false
  })
  const [session, setSession] = useState<string | null>(null)
  const [info, setInfo] = useState<any>(null)
  const [children, setChildren] = useState<any[]>([])
  const [selectedChild, setSelectedChild] = useState<number | null>(null)
  const [albums, setAlbums] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [tab, setTab] = useState<'timeline' | 'albums' | 'reports'>('timeline')

  // 세션 + 저장된 계정 + 캐시 복원
  useEffect(() => {
    async function restoreCredentials() {
      const savedCreds = safeGetItem('kn_credentials_enc')
      // 마이그레이션: 평문 credential이 남아있으면 삭제
      const legacyCreds = safeGetItem('kn_credentials')
      if (legacyCreds) {
        safeRemoveItem('kn_credentials')
        // 레거시 데이터로 암호화 재저장 시도
        try {
          const { u, p } = JSON.parse(legacyCreds)
          setUsername(u); setPassword(p); setSaveCredentials(true)
          const payload = JSON.stringify({ u, p })
          const encrypted = await encrypt(payload, 'dodam-kn-local-key')
          safeSetItem('kn_credentials_enc', encrypted)
        } catch { /* */ }
      } else if (savedCreds) {
        try {
          const decrypted = await decrypt(savedCreds, 'dodam-kn-local-key')
          if (decrypted) {
            const { u, p } = JSON.parse(decrypted)
            setUsername(u); setPassword(p); setSaveCredentials(true)
          }
        } catch { /* */ }
      }
    }
    restoreCredentials()

    // 캐시된 데이터 복원
    const cachedAlbums = safeGetItem('kn_cache_albums')
    const cachedReports = safeGetItem('kn_cache_reports')
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
      // 계정 저장 체크 시 암호화하여 localStorage에 보관
      if (saveCredentials) {
        try {
          const payload = JSON.stringify({ u: username, p: password })
          const encrypted = await encrypt(payload, 'dodam-kn-local-key')
          safeSetItem('kn_credentials_enc', encrypted)
        } catch { /* 암호화 실패 시 저장하지 않음 */ }
      } else {
        safeRemoveItem('kn_credentials_enc')
        safeRemoveItem('kn_credentials') // 레거시 정리
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
    } catch (e) { setError('연결에 실패했어요. 네트워크를 확인해주세요.') }
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
      const seenIds = new Set<string>()
      let all: any[] = []; let nextCursor: string | null = null; let hasMore = true
      while (hasMore) {
        const r: Response = await fetch('/api/kidsnote', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'albums', sessionCookie: cookie, childId, cursor: nextCursor }),
        })
        const d: { results?: any[]; count?: number; next?: string | null } = await r.json()
        const items = (d.results || []).filter((item: any) => {
          if (seenIds.has(String(item.id))) return false
          seenIds.add(String(item.id)); return true
        })
        const total = d.count || 0
        all = [...all, ...items]
        setAlbums([...all]); setAlbumTotal(total || all.length)
        setAlbumProgress(total ? Math.min(100, Math.round((all.length / total) * 100)) : 100)
        const newCursor = d.next || null
        // 커서가 변하지 않으면 무한루프 방지
        hasMore = !!newCursor && newCursor !== nextCursor && items.length > 0
        nextCursor = newCursor
      }
      setAlbumProgress(100)
      safeSetItem('kn_cache_albums', JSON.stringify(all))
    } catch { /* */ }
    setLoadingAlbums(false)
  }

  const loadReports = async (cookie: string, childId: number) => {
    setLoadingReports(true); setReportProgress(0); setReportTotal(0); setReports([])
    try {
      const seenIds = new Set<string>()
      let all: any[] = []; let nextCursor: string | null = null; let hasMore = true
      while (hasMore) {
        const r: Response = await fetch('/api/kidsnote', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reports', sessionCookie: cookie, childId, cursor: nextCursor }),
        })
        const d: { results?: any[]; count?: number; next?: string | null } = await r.json()
        const items = (d.results || []).filter((item: any) => {
          if (seenIds.has(String(item.id))) return false
          seenIds.add(String(item.id)); return true
        })
        const total = d.count || 0
        all = [...all, ...items]
        setReports([...all]); setReportTotal(total || all.length)
        setReportProgress(total ? Math.min(100, Math.round((all.length / total) * 100)) : 100)
        const newCursor = d.next || null
        hasMore = !!newCursor && newCursor !== nextCursor && items.length > 0
        nextCursor = newCursor
      }
      setReportProgress(100)
      safeSetItem('kn_cache_reports', JSON.stringify(all))
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

  // 사진 다운로드 (로컬)
  const [downloadProgress, setDownloadProgress] = useState<{ total: number; done: number } | null>(null)
  const [showDownloadMenu, setShowDownloadMenu] = useState<string | null>(null) // item.id

  const downloadToLocal = async (item: any) => {
    const images = item.images || []
    if (images.length === 0) { window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '다운로드할 사진이 없어요' } })); return }
    setDownloadProgress({ total: images.length, done: 0 })
    setShowDownloadMenu(null)
    for (let i = 0; i < images.length; i++) {
      try {
        const url = images[i].original || images[i].thumbnail
        if (!url) continue
        // 프록시 API 시도, 실패 시 직접 다운로드
        let blob: Blob | null = null
        const proxyRes = await fetch(`/api/kidsnote/image?url=${encodeURIComponent(url)}`)
        if (proxyRes.ok && proxyRes.headers.get('content-type')?.startsWith('image')) {
          blob = await proxyRes.blob()
        } else {
          // 프록시 실패 시 직접 fetch
          try {
            const directRes = await fetch(url)
            if (directRes.ok) blob = await directRes.blob()
          } catch { /* CORS 차단 시 무시 */ }
        }
        if (!blob || blob.size < 100) continue // 에러 응답 필터
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `kidsnote_${item.id}_${i + 1}.jpg`
        a.click()
        URL.revokeObjectURL(a.href)
      } catch { /* */ }
      setDownloadProgress(prev => prev ? { ...prev, done: prev.done + 1 } : null)
    }
    window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: `${images.length}장 다운로드 완료!` } }))
    setDownloadProgress(null)
  }

  // 구글 드라이브 업로드
  const uploadToGoogleDrive = async (item: any) => {
    const images = item.images || []
    if (images.length === 0) { window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '업로드할 사진이 없어요' } })); return }

    // Google 토큰 존재 확인
    try {
      const statusRes = await fetch('/api/google-fit/status')
      const status = await statusRes.json()
      if (!status.hasToken && !status.hasRefresh) {
        window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: 'Google 로그인이 필요해요. 온보딩에서 Google 계정으로 로그인해주세요.' } }))
        return
      }
    } catch { /* proceed anyway */ }

    setDownloadProgress({ total: images.length, done: 0 })
    setShowDownloadMenu(null)

    // Dodam 폴더 확보
    let folderId: string | undefined
    try {
      const folderRes = await fetch('/api/google-drive/folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const folderData = await folderRes.json()
      if (folderData.folderId) folderId = folderData.folderId
    } catch { /* root에 업로드 */ }

    let successCount = 0
    for (let i = 0; i < images.length; i++) {
      try {
        const url = images[i].original || images[i].thumbnail
        if (!url) continue

        const res = await fetch('/api/google-drive/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: url, fileName: `kidsnote_${item.id}_${i + 1}.jpg`, folderId }),
        })
        const data = await res.json()

        if (data.error === 'no_google_token' || data.error === 'insufficient_scope') {
          window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: 'Google 인증이 필요해요. 온보딩에서 다시 Google 로그인해주세요.' } }))
          break
        }
        if (data.success) successCount++
      } catch { /* */ }
      setDownloadProgress(prev => prev ? { ...prev, done: prev.done + 1 } : null)
    }
    window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: `${successCount}장 Google Drive 업로드 완료!` } }))
    setDownloadProgress(null)
  }

  // 전체 사진 일괄 저장
  const downloadAll = async (target: 'local' | 'gdrive') => {
    const allImages: { url: string; albumId: string; index: number }[] = []
    // 앨범 사진 수집
    albums.forEach((album: any) => {
      (album.images || []).forEach((img: any, i: number) => {
        const url = img.original || img.thumbnail
        if (url) allImages.push({ url, albumId: album.id, index: i + 1 })
      })
    })
    // 알림장 사진 수집
    reports.forEach((report: any) => {
      (report.images || []).forEach((img: any, i: number) => {
        const url = img.original || img.thumbnail
        if (url) allImages.push({ url, albumId: report.id, index: i + 1 })
      })
    })

    if (allImages.length === 0) {
      window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: '저장할 사진이 없어요' } }))
      return
    }

    setDownloadProgress({ total: allImages.length, done: 0 })

    if (target === 'local') {
      for (let i = 0; i < allImages.length; i++) {
        try {
          let blob: Blob | null = null
          const proxyRes = await fetch(`/api/kidsnote/image?url=${encodeURIComponent(allImages[i].url)}`)
          if (proxyRes.ok && proxyRes.headers.get('content-type')?.startsWith('image')) {
            blob = await proxyRes.blob()
          } else {
            try { const d = await fetch(allImages[i].url); if (d.ok) blob = await d.blob() } catch { /* */ }
          }
          if (blob && blob.size > 100) {
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = `kidsnote_${allImages[i].albumId}_${allImages[i].index}.jpg`
            a.click()
            URL.revokeObjectURL(a.href)
          }
        } catch { /* */ }
        setDownloadProgress(prev => prev ? { ...prev, done: prev.done + 1 } : null)
        // 브라우저 부담 줄이기
        if (i % 5 === 4) await new Promise(r => setTimeout(r, 300))
      }
      window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: `전체 ${allImages.length}장 다운로드 완료!` } }))
    } else {
      // Google 토큰 확인
      try {
        const statusRes = await fetch('/api/google-fit/status')
        const status = await statusRes.json()
        if (!status.hasToken && !status.hasRefresh) {
          window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: 'Google 로그인이 필요해요' } }))
          setDownloadProgress(null)
          return
        }
      } catch { /* proceed */ }

      // Dodam 폴더 확보
      let folderId: string | undefined
      try {
        const folderRes = await fetch('/api/google-drive/folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        const folderData = await folderRes.json()
        if (folderData.folderId) folderId = folderData.folderId
      } catch { /* */ }

      let ok = 0
      for (let i = 0; i < allImages.length; i++) {
        try {
          const res = await fetch('/api/google-drive/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: allImages[i].url, fileName: `kidsnote_${allImages[i].albumId}_${allImages[i].index}.jpg`, folderId }),
          })
          const data = await res.json()
          if (data.error === 'no_google_token' || data.error === 'insufficient_scope') {
            window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: 'Google 인증 필요' } }))
            break
          }
          if (data.success) ok++
        } catch { /* */ }
        setDownloadProgress(prev => prev ? { ...prev, done: prev.done + 1 } : null)
        if (i % 5 === 4) await new Promise(r => setTimeout(r, 300))
      }
      window.dispatchEvent(new CustomEvent('dodam-toast', { detail: { message: `전체 ${ok}장 Google Drive 업로드 완료!` } }))
    }
    setDownloadProgress(null)
  }

  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)] flex flex-col">
      <PageHeader title="키즈노트" showBack
        rightAction={session ? <button onClick={logout} className="text-body text-secondary whitespace-nowrap">로그아웃</button> : undefined} />

      {/* 다운로드 프로그레스 */}
      {downloadProgress && (
        <div className="fixed top-[72px] left-1/2 -translate-x-1/2 z-[100] w-72">
          <div className="bg-[#212124]/90 text-white px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-body font-medium">다운로드 중...</p>
              <p className="text-caption text-white/70">{downloadProgress.done}/{downloadProgress.total}</p>
            </div>
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
                style={{ width: `${(downloadProgress.done / downloadProgress.total) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-28 space-y-3">

        {/* 동의 화면 */}
        {step === 'login' && !agreed && (
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-5">
            <div className="text-center mb-4">
              <svg className="w-8 h-8 text-[var(--color-primary)] mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
              <p className="text-subtitle text-primary">키즈노트 연동</p>
              <p className="text-body text-secondary mt-1">어린이집 알림장 · 사진을 도담으로 가져와요</p>
            </div>

            <div className="bg-[var(--color-page-bg)] rounded-xl p-4 space-y-3 text-body text-[#555] leading-relaxed">
              <p className="text-body font-bold text-primary">연동 전 확인사항</p>
              <div className="space-y-2">
                <p>1. 도담은 키즈노트와 제휴된 서비스가 아닙니다. 키즈노트 계정 정보를 사용자의 동의 하에 직접 입력받아 데이터를 가져옵니다.</p>
                <p>2. 입력하신 계정 정보는 <span className="font-semibold text-primary">도담 서버에 저장되지 않으며</span>, 연결 확인 후 즉시 폐기됩니다. (저장 선택 시 사용자 기기에만 보관)</p>
                <p>3. 가져온 데이터(알림장, 사진)는 사용자 기기 내에만 저장되며, 외부로 전송되지 않습니다.</p>
                <p>4. 키즈노트 서비스 정책 변경 시 연동이 중단될 수 있으며, 이에 대해 도담은 책임지지 않습니다.</p>
                <p>5. 본 기능 사용으로 발생하는 키즈노트 계정 관련 문제에 대한 책임은 사용자에게 있습니다.</p>
              </div>
            </div>

            <button onClick={() => { setAgreed(true); safeSetItem('kn_agreed', 'true') }}
              className="w-full mt-4 py-3 bg-[var(--color-primary)] text-white font-semibold rounded-xl active:opacity-80">
              위 내용을 확인했으며 동의합니다
            </button>

            <button onClick={() => history.back()}
              className="w-full mt-2 py-2.5 text-body text-secondary active:opacity-60">
              돌아가기
            </button>
          </div>
        )}

        {/* 로그인 */}
        {step === 'login' && agreed && (
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-5">
            <div className="text-center mb-4">
              <svg className="w-8 h-8 text-[var(--color-primary)] mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
              <p className="text-subtitle text-primary">키즈노트 로그인</p>
              <p className="text-body text-secondary mt-1">키즈노트 계정으로 로그인해주세요</p>
            </div>

            {error && <div className="bg-[#FFF0E6] rounded-lg p-2 mb-3"><p className="text-body text-[#D08068]">{error}</p></div>}

            <div className="space-y-3">
              <div>
                <p className="text-body text-secondary mb-1">키즈노트 아이디 (이메일/전화번호)</p>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="kidsnote@example.com" maxLength={100} className="w-full h-11 rounded-xl border border-[#E8E4DF] px-3 text-body" />
              </div>
              <div>
                <p className="text-body text-secondary mb-1">비밀번호</p>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" className="w-full h-11 rounded-xl border border-[#E8E4DF] px-3 text-body" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={saveCredentials} onChange={e => setSaveCredentials(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--color-primary)]" />
                <span className="text-body-emphasis text-secondary">아이디/비밀번호 이 기기에 저장하기</span>
              </label>
              <button onClick={handleLogin} disabled={loading}
                className="w-full py-3 bg-[var(--color-primary)] text-white font-semibold rounded-xl active:opacity-80 disabled:opacity-50">
                {loading ? '연결 중...' : '키즈노트 연결하기'}
              </button>
            </div>

            <div className="mt-4 bg-[var(--color-page-bg)] rounded-lg p-3">
              <p className="text-body-emphasis text-secondary leading-relaxed">
{saveCredentials ? '계정 정보가 이 기기에만 저장돼요. 서버에는 저장되지 않습니다.' : '비밀번호는 서버에 저장되지 않아요. 로그인 후 즉시 삭제됩니다.'}
              </p>
            </div>
          </div>
        )}

        {/* 아이 선택 (여러 명일 때) */}
        {step === 'children' && children.length > 1 && (
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
            <p className="text-body-emphasis font-bold text-primary mb-3">아이를 선택해주세요</p>
            {children.map((child: any) => (
              <button key={child.id || child.child_id} onClick={() => selectChild(child.id || child.child_id)}
                className="w-full p-3 bg-[var(--color-page-bg)] rounded-xl mb-2 text-left active:bg-[#ECECEC]">
                <p className="text-body font-semibold text-primary">{child.name || child.nickname || '아이'}</p>
              </button>
            ))}
          </div>
        )}

        {/* 데이터 표시 */}
        {step === 'data' && (
          <>
            {/* 연결 상태 */}
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                <span className="text-body font-semibold text-primary">키즈노트 연결됨</span>
              </div>
              <div className="space-y-2">
                <div>
                  <button onClick={() => { if (session && selectedChild) loadAlbums(session, selectedChild) }}
                    disabled={loadingAlbums}
                    className="w-full py-2.5 bg-[var(--color-page-bg)] rounded-xl text-body font-semibold text-primary active:bg-[#ECECEC] disabled:opacity-50">
                    {loadingAlbums
                      ? `앨범 가져오는 중... (${albums.length}${albumTotal ? `/${albumTotal}` : ''}건)`
                      : albums.length
                        ? `앨범 (${albums.length}건) — 새로고침`
                        : '앨범 가져오기'}
                  </button>
                  {loadingAlbums && (
                    <div className="mt-1.5 h-1.5 bg-[#E8E8E8] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300" style={{ width: `${albumProgress}%` }} />
                    </div>
                  )}
                </div>
                <div>
                  <button onClick={() => { if (session && selectedChild) loadReports(session, selectedChild) }}
                    disabled={loadingReports}
                    className="w-full py-2.5 bg-[var(--color-page-bg)] rounded-xl text-body font-semibold text-primary active:bg-[#ECECEC] disabled:opacity-50">
                    {loadingReports
                      ? `알림장 가져오는 중... (${reports.length}${reportTotal ? `/${reportTotal}` : ''}건)`
                      : reports.length
                        ? `알림장 (${reports.length}건) — 새로고침`
                        : '알림장 가져오기'}
                  </button>
                  {loadingReports && (
                    <div className="mt-1.5 h-1.5 bg-[#E8E8E8] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300" style={{ width: `${reportProgress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 탭 (데이터 있을 때만) */}
            {(albums.length > 0 || reports.length > 0) && (
              <div className="flex gap-1.5">
                <button onClick={() => setTab('timeline')}
                  className={`flex-1 py-2 rounded-xl font-semibold ${tab === 'timeline' ? 'bg-[var(--color-primary)] font-bold' : 'bg-white text-secondary'}`}
                  style={tab === 'timeline' ? { fontSize: 14, color: '#FFFFFF', fontWeight: 700 } : { fontSize: 14 }}>
                  통합
                </button>
                <button onClick={() => setTab('albums')}
                  className={`flex-1 py-2 rounded-xl font-semibold ${tab === 'albums' ? 'bg-[var(--color-primary)] font-bold' : 'bg-white text-secondary'}`}
                  style={tab === 'albums' ? { fontSize: 14, color: '#FFFFFF', fontWeight: 700 } : { fontSize: 14 }}>
                  앨범 {albums.length > 0 && `(${albums.length})`}
                </button>
                <button onClick={() => setTab('reports')}
                  className={`flex-1 py-2 rounded-xl font-semibold ${tab === 'reports' ? 'bg-[var(--color-primary)] font-bold' : 'bg-white text-secondary'}`}
                  style={tab === 'reports' ? { fontSize: 14, color: '#FFFFFF', fontWeight: 700 } : { fontSize: 14 }}>
                  알림장 {reports.length > 0 && `(${reports.length})`}
                </button>
              </div>
            )}

            {/* 전체 저장 */}
            {(albums.length > 0 || reports.length > 0) && (() => {
              const totalPhotos = albums.reduce((s: number, a: any) => s + (a.images?.length || 0), 0) + reports.reduce((s: number, r: any) => s + (r.images?.length || 0), 0)
              return (
                <div className="bg-gradient-to-r from-[#FFF8F3] to-[#F0F4FF] rounded-2xl border border-[#E8DFD5] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-body font-bold text-primary">전체 사진 백업</p>
                      <p className="text-label text-secondary">앨범 + 알림장 총 {totalPhotos}장</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => downloadAll('local')}
                      className="py-2.5 rounded-xl bg-white border border-[#E8E4DF] text-caption font-semibold text-primary active:bg-[#F5F1EC] flex items-center justify-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      내 기기에 저장
                    </button>
                    <button onClick={() => downloadAll('gdrive')}
                      className="py-2.5 rounded-xl bg-white border border-[#D5DFEF] text-caption font-semibold text-[#4A6FA5] active:bg-[#E0EAFF] flex items-center justify-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>
                      클라우드 저장
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* 통합 타임라인 */}
            {tab === 'timeline' && (albums.length > 0 || reports.length > 0) && (
              <div className="space-y-2">
                {[
                  ...albums.map((a: any) => ({ ...a, _type: 'album', _date: a.created })),
                  ...reports.map((r: any) => ({ ...r, _type: 'report', _date: r.created })),
                ]
                  .sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime())
                  .slice(0, 30)
                  .map((item: any) => (
                    <div key={`${item._type}-${item.id}`} className="bg-white rounded-xl border border-[#E8E4DF] p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-caption px-1.5 py-0.5 rounded font-medium" style={{
                          backgroundColor: item._type === 'album' ? '#E8F5EE' : '#FEF0E8',
                          color: item._type === 'album' ? '#2D7A4A' : '#C06020',
                        }}>
                          {item._type === 'album' ? '앨범' : '알림장'}
                        </span>
                        <span className="text-caption text-tertiary">
                          {item._date ? new Date(item._date).toLocaleDateString('ko-KR') : ''}
                        </span>
                      </div>
                      {item.title && <p className="text-body font-semibold text-primary mb-1">{item.title}</p>}
                      {item.content && <p className="text-body text-secondary line-clamp-2 whitespace-pre-line">{item.content}</p>}
                      {/* 구조화된 콘텐츠 파싱 (식사/활동/건강 추출) */}
                      {item._type === 'report' && item.content && (() => {
                        const tags: { label: string; color: string }[] = []
                        const c = item.content as string
                        if (/식사|급식|간식|우유|밥|이유식/.test(c)) tags.push({ label: '식사', color: 'var(--color-primary)' })
                        if (/낮잠|수면|잠/.test(c)) tags.push({ label: '수면', color: '#5B6DFF' })
                        if (/놀이|활동|산책|체육/.test(c)) tags.push({ label: '활동', color: 'var(--color-primary)' })
                        if (/체온|열|건강|약|투약/.test(c)) tags.push({ label: '건강', color: '#E85D4A' })
                        if (/배변|기저귀/.test(c)) tags.push({ label: '배변', color: '#A87420' })
                        if (tags.length === 0) return null
                        return (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {tags.map((t) => (
                              <span key={t.label} className="text-label font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: `${t.color}15`, color: t.color }}>
                                {t.label}
                              </span>
                            ))}
                          </div>
                        )
                      })()}
                      {item.images && item.images.length > 0 && (
                        <div className="flex gap-1 mt-2 overflow-x-auto">
                          {item.images.slice(0, 3).map((img: any, j: number) => (
                            <div key={img.thumbnail || img.original || j} className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 cursor-pointer"
                              onClick={() => { setViewerImages(item.images); setViewerStart(j) }}>
                              <Image src={proxyImg(img.thumbnail || img.original)} alt="" fill className="object-cover" />
                            </div>
                          ))}
                          {item.images.length > 3 && (
                            <span className="w-14 h-14 rounded-lg bg-[var(--color-page-bg)] flex items-center justify-center shrink-0 text-caption text-secondary">
                              +{item.images.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* 앨범 */}
            {tab === 'albums' && albums.length > 0 && (
              <div className="space-y-2">
                {albums.map((album: any) => (
                  <div key={album.id} className="bg-white rounded-xl border border-[#E8E4DF] p-3">
                    {/* 사진 */}
                    {album.images && album.images.length > 0 && (
                      <div className="flex gap-1.5 mb-2 overflow-x-auto hide-scrollbar">
                        {album.images.slice(0, 4).map((img: any, j: number) => (
                          <div key={img.thumbnail || img.original || j} className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 cursor-pointer active:opacity-80"
                            onClick={() => { setViewerImages(album.images); setViewerStart(j) }}>
                            <Image src={proxyImg(img.thumbnail || img.original)} alt="" fill className="object-cover" />
                          </div>
                        ))}
                        {album.images.length > 4 && (
                          <button onClick={() => { setViewerImages(album.images); setViewerStart(4) }}
                            className="w-20 h-20 rounded-lg bg-[var(--color-page-bg)] flex items-center justify-center shrink-0">
                            <span className="text-body text-secondary">+{album.images.length - 4}</span>
                          </button>
                        )}
                      </div>
                    )}
                    {album.content && <p className="text-body-emphasis text-primary line-clamp-3">{album.content}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-body text-tertiary">{album.created ? new Date(album.created).toLocaleDateString('ko-KR') : ''}</span>
                      <div className="relative">
                        <button onClick={() => setShowDownloadMenu(showDownloadMenu === album.id ? null : album.id)} className="text-body text-[var(--color-primary)] font-semibold active:opacity-60">저장하기</button>
                        {showDownloadMenu === album.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowDownloadMenu(null)} />
                            <div className="absolute right-0 bottom-8 z-50 w-40 bg-white rounded-xl shadow-lg border border-[#E8E4DF] py-1 overflow-hidden">
                              <button onClick={() => downloadToLocal(album)} className="w-full px-3.5 py-2.5 text-left text-body text-primary active:bg-[#F5F1EC]">로컬 다운로드</button>
                              <button onClick={() => uploadToGoogleDrive(album)} className="w-full px-3.5 py-2.5 text-left text-body text-primary active:bg-[#F5F1EC]">Google Drive</button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 알림장 */}
            {tab === 'reports' && reports.length > 0 && (
              <div className="space-y-2">
                {reports.map((report: any) => (
                  <div key={report.id} className="bg-white rounded-xl border border-[#E8E4DF] p-3">
                    {report.title && <p className="text-body font-semibold text-primary mb-1">{report.title}</p>}
                    {report.content && <p className="text-body-emphasis text-secondary line-clamp-4 whitespace-pre-line">{report.content}</p>}
                    {report.images && report.images.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {report.images.slice(0, 4).map((img: any, j: number) => (
                          <div key={img.thumbnail || img.original || j} className="relative w-16 h-16 rounded-lg overflow-hidden cursor-pointer active:opacity-80"
                            onClick={() => { setViewerImages(report.images); setViewerStart(j) }}>
                            <Image src={proxyImg(img.thumbnail || img.original)} alt="" fill className="object-cover" />
                          </div>
                        ))}
                        {report.images.length > 4 && (
                          <button onClick={() => { setViewerImages(report.images); setViewerStart(4) }}
                            className="w-16 h-16 rounded-lg bg-[var(--color-page-bg)] flex items-center justify-center">
                            <span className="text-body-emphasis text-secondary">+{report.images.length - 4}</span>
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-body text-tertiary">{report.created ? new Date(report.created).toLocaleDateString('ko-KR') : ''}</span>
                      <div className="relative">
                        <button onClick={() => setShowDownloadMenu(showDownloadMenu === report.id ? null : report.id)} className="text-body text-[var(--color-primary)] font-semibold active:opacity-60">저장하기</button>
                        {showDownloadMenu === report.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowDownloadMenu(null)} />
                            <div className="absolute right-0 bottom-8 z-50 w-40 bg-white rounded-xl shadow-lg border border-[#E8E4DF] py-1 overflow-hidden">
                              <button onClick={() => downloadToLocal(report)} className="w-full px-3.5 py-2.5 text-left text-body text-primary active:bg-[#F5F1EC]">로컬 다운로드</button>
                              <button onClick={() => uploadToGoogleDrive(report)} className="w-full px-3.5 py-2.5 text-left text-body text-primary active:bg-[#F5F1EC]">Google Drive</button>
                            </div>
                          </>
                        )}
                      </div>
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
        <ImageViewerLazy images={viewerImages} startIndex={viewerStart} onClose={() => setViewerImages(null)} />
      )}
    </div>
  )
}
