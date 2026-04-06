'use client'

import { useEffect, useState, useCallback } from 'react'

interface AdSlot {
  id: string
  enabled: boolean
  provider: 'kakao' | 'google'
  unit_id: string | null
  width: number
  height: number
  page_path: string
  updated_at: string | null
  updated_by: string | null
}

const PROVIDER_LABELS: Record<string, string> = {
  kakao: '카카오 AdFit',
  google: 'Google AdSense',
}

export default function AdsClient() {
  const [slots, setSlots] = useState<AdSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingUnit, setEditingUnit] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/ads')
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setSlots(data.slots || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  const handleToggle = async (slot: AdSlot) => {
    setSaving(slot.id)
    try {
      const res = await fetch('/api/admin/ads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: slot.id, enabled: !slot.enabled }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || '업데이트 실패')
      }
      await fetchSlots()
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setSaving(null)
    }
  }

  const handleSaveUnit = async (slot: AdSlot) => {
    const newUnit = editingUnit[slot.id]
    if (newUnit === undefined || newUnit === (slot.unit_id || '')) return
    setSaving(slot.id)
    try {
      const res = await fetch('/api/admin/ads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: slot.id, unit_id: newUnit }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || '업데이트 실패')
      }
      setEditingUnit((prev) => {
        const n = { ...prev }
        delete n[slot.id]
        return n
      })
      await fetchSlots()
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setSaving(null)
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '-'
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  if (loading) return <LoadingSkeleton />
  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>
  }
  if (slots.length === 0) {
    return <div className="p-8 text-center text-gray-400">등록된 광고 슬롯이 없습니다</div>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {slots.map((slot) => {
        const isEditing = editingUnit[slot.id] !== undefined
        const unitValue = isEditing ? editingUnit[slot.id] : (slot.unit_id || '')
        const isSaving = saving === slot.id

        return (
          <div key={slot.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${slot.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                />
                <h3 className="font-semibold text-gray-900">{slot.id}</h3>
              </div>
              <button
                onClick={() => handleToggle(slot)}
                disabled={isSaving}
                aria-label={slot.enabled ? '비활성화' : '활성화'}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                  slot.enabled ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    slot.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Info grid */}
            <div className="space-y-2.5 text-sm">
              <InfoRow label="광고 제공자" value={PROVIDER_LABELS[slot.provider] || slot.provider} />
              <div className="flex justify-between">
                <span className="text-gray-500">표시 페이지</span>
                <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">{slot.page_path}</code>
              </div>
              <InfoRow label="크기" value={`${slot.width} x ${slot.height}px`} />
              <div className="flex justify-between">
                <span className="text-gray-500">상태</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    slot.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {slot.enabled ? '활성' : '비활성'}
                </span>
              </div>
            </div>

            {/* Unit ID editor */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="text-xs font-medium text-gray-500 block mb-1.5">
                광고 단위 ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={unitValue}
                  onChange={(e) =>
                    setEditingUnit((prev) => ({ ...prev, [slot.id]: e.target.value }))
                  }
                  placeholder="DAN-xxxxxxxxxx"
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {isEditing && unitValue !== (slot.unit_id || '') && (
                  <button
                    onClick={() => handleSaveUnit(slot)}
                    disabled={isSaving}
                    className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? '...' : '저장'}
                  </button>
                )}
              </div>
            </div>

            {/* Last updated */}
            <div className="mt-3 text-xs text-gray-400">
              마지막 수정: {formatDate(slot.updated_at)}
              {slot.updated_by && (
                <span className="ml-1">({slot.updated_by.slice(0, 8)}...)</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <div className="flex justify-between">
            <div className="h-5 bg-gray-200 rounded w-32" />
            <div className="h-6 bg-gray-200 rounded-full w-11" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-8 bg-gray-200 rounded w-full mt-3" />
        </div>
      ))}
    </div>
  )
}
