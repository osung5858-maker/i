'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface UserProfile {
  user_id: string
  email: string
  mode: string | null
  chosen_nickname: string | null
  region: string | null
  my_role: string | null
  mother_birth: string | null
  father_birth: string | null
  created_at: string
  updated_at: string
  last_sign_in_at: string | null
  is_banned: boolean
  banned_until: string | null
}

interface AuditLogEntry {
  id: string
  admin_user_id: string
  action: string
  target_type: string
  target_id: string
  details: Record<string, unknown>
  created_at: string
}

interface UserDetailData {
  profile: UserProfile
  posts_count: number
  comments_count: number
  audit_log: AuditLogEntry[]
}

const MODE_LABELS: Record<string, string> = {
  preparing: '준비중',
  pregnant: '임신중',
  parenting: '육아중',
}

const MODE_COLORS: Record<string, string> = {
  preparing: 'bg-amber-100 text-amber-700',
  pregnant: 'bg-purple-100 text-purple-700',
  parenting: 'bg-green-100 text-green-700',
}

const ACTION_LABELS: Record<string, string> = {
  user_suspend: '계정 정지',
  user_activate: '계정 활성화',
}

export default function UserDetailClient({ userId }: { userId: string }) {
  const router = useRouter()
  const [data, setData] = useState<UserDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState<'suspend' | 'activate' | null>(null)

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || `HTTP ${res.status}`)
      }
      const json: UserDetailData = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const handleStatusChange = async (action: 'suspend' | 'activate') => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || `HTTP ${res.status}`)
      }
      setShowConfirm(null)
      await fetchDetail()
    } catch (err) {
      alert(err instanceof Error ? err.message : '상태 변경에 실패했습니다')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <DetailSkeleton />

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">오류 발생</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button
          onClick={() => router.push('/admin/users')}
          className="mt-4 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
        >
          목록으로 돌아가기
        </button>
      </div>
    )
  }

  if (!data) return null

  const { profile, posts_count, comments_count, audit_log } = data

  return (
    <div className="space-y-6">
      {/* Back button + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/admin/users')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          aria-label="뒤로가기"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {profile.chosen_nickname || '닉네임 없음'}
          </h2>
          <p className="text-sm text-gray-500">{profile.email || '-'}</p>
        </div>
        {profile.is_banned && (
          <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            정지됨
          </span>
        )}
      </div>

      {/* Profile card + Activity summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">프로필 정보</h3>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="유저 ID" value={profile.user_id} mono />
            <InfoItem label="닉네임" value={profile.chosen_nickname || '-'} />
            <InfoItem label="이메일" value={profile.email || '-'} />
            <InfoItem
              label="모드"
              value={
                profile.mode ? (
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${MODE_COLORS[profile.mode] || 'bg-gray-100 text-gray-600'}`}
                  >
                    {MODE_LABELS[profile.mode] || profile.mode}
                  </span>
                ) : (
                  '-'
                )
              }
            />
            <InfoItem label="역할" value={profile.my_role || '-'} />
            <InfoItem label="지역" value={profile.region || '-'} />
            <InfoItem
              label="가입일"
              value={profile.created_at ? new Date(profile.created_at).toLocaleString('ko-KR') : '-'}
            />
            <InfoItem
              label="최근 로그인"
              value={
                profile.last_sign_in_at
                  ? new Date(profile.last_sign_in_at).toLocaleString('ko-KR')
                  : '-'
              }
            />
          </div>
        </div>

        {/* Activity + Actions */}
        <div className="space-y-6">
          {/* Activity summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">활동 요약</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">작성한 게시글</span>
                <span className="text-lg font-bold text-gray-900">{posts_count.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">작성한 댓글</span>
                <span className="text-lg font-bold text-gray-900">{comments_count.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Status actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">계정 관리</h3>
            {profile.is_banned ? (
              <button
                onClick={() => setShowConfirm('activate')}
                className="w-full px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
              >
                계정 활성화
              </button>
            ) : (
              <button
                onClick={() => setShowConfirm('suspend')}
                className="w-full px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
              >
                계정 정지
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audit log */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">관리 이력</h3>
        </div>
        {audit_log.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            관리 이력이 없습니다
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">일시</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">액션</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">관리자 ID</th>
                </tr>
              </thead>
              <tbody>
                {audit_log.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(entry.created_at).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.action === 'user_suspend'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {ACTION_LABELS[entry.action] || entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs">
                      {entry.admin_user_id.slice(0, 8)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h4 className="text-lg font-bold text-gray-900 mb-2">
              {showConfirm === 'suspend' ? '계정 정지 확인' : '계정 활성화 확인'}
            </h4>
            <p className="text-sm text-gray-600 mb-6">
              {showConfirm === 'suspend'
                ? `"${profile.chosen_nickname || profile.email}" 유저를 정지하시겠습니까? 정지된 유저는 서비스 이용이 불가합니다.`
                : `"${profile.chosen_nickname || profile.email}" 유저를 다시 활성화하시겠습니까?`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={() => handleStatusChange(showConfirm)}
                disabled={actionLoading}
                className={`flex-1 px-4 py-2.5 text-sm text-white font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                  showConfirm === 'suspend'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {actionLoading ? '처리중...' : showConfirm === 'suspend' ? '정지' : '활성화'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoItem({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className={`text-sm text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        <div>
          <div className="h-6 bg-gray-200 rounded w-40 mb-1" />
          <div className="h-4 bg-gray-200 rounded w-60" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="h-3 bg-gray-100 rounded w-16 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-36" />
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-28" />
        </div>
      </div>
    </div>
  )
}
