'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { PageHeader } from '@/components/layout/PageLayout'
import { createClient } from '@/lib/supabase/client'
import { upsertUserRecord, fetchUserRecords } from '@/lib/supabase/userRecord'
import Image from 'next/image'
import { shareMilestone } from '@/lib/share'
import { trackEvent } from '@/lib/analytics'

// ─── Types ───
interface Milestone {
  id: string
  type: string
  date: string
  note: string
  photoUrl?: string
  custom?: boolean
}

// ─── Predefined milestone types with inline SVG icons ───
const MILESTONE_TYPES: { type: string; icon: (cls: string) => ReactNode }[] = [
  { type: '첫 미소', icon: (c) => <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg> },
  { type: '첫 뒤집기', icon: (c) => <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 014-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 01-4 4H3"/></svg> },
  { type: '첫 이앓이', icon: (c) => <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 15h8"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg> },
  { type: '첫 옹알이', icon: (c) => <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
  { type: '첫 앉기', icon: (c) => <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><path d="M12 8v4"/><path d="M8 21v-5l4-4 4 4v5"/></svg> },
  { type: '첫 기기', icon: (c) => <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><path d="M5 20h14"/><path d="M8 20c0-3 1-5 4-7 3 2 4 4 4 7"/></svg> },
  { type: '첫 걸음', icon: (c) => <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16c1-2 3-3 5-3s4 1 5 3"/><path d="M10 20c1-2 3-3 5-3s4 1 5 3"/></svg> },
  { type: '첫 단어', icon: (c) => <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><path d="M8 9h8"/><path d="M8 13h4"/></svg> },
  { type: '첫 이유식', icon: (c) => <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c-4 4-7 6-7 10a7 7 0 0014 0c0-4-3-6-7-10z"/></svg> },
  { type: '첫 외출', icon: (c) => <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 10-16 0c0 3 2.7 7 8 11.7z"/></svg> },
  { type: '첫 목욕', icon: (c) => <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M4 12v4a4 4 0 004 4h8a4 4 0 004-4v-4"/><path d="M6 12V5a2 2 0 012-2h1"/></svg> },
  { type: '첫 이발', icon: (c) => <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg> },
  { type: '첫 통잠', icon: (c) => <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg> },
  { type: '첫 손뼉', icon: (c) => <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11l4-7"/><path d="M13 11l4-7"/><path d="M4 15c0 3.3 2.7 6 6 6h4c3.3 0 6-2.7 6-6v-4H4v4z"/></svg> },
  { type: '첫 "엄마"', icon: (c) => <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> },
  { type: '첫 "아빠"', icon: (c) => <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> },
]

function saveMilestonesToDB(items: Milestone[]) {
  const today = new Date().toISOString().split('T')[0]
  upsertUserRecord(today, 'milestones', { items } as Record<string, unknown>).catch(() => {})
}

export default function MilestonePage() {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [editing, setEditing] = useState<string | null>(null) // milestone type being edited
  const [editDate, setEditDate] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editPhoto, setEditPhoto] = useState('')
  const [uploading, setUploading] = useState(false)
  const [customName, setCustomName] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchUserRecords(['milestones']).then(rows => {
      if (rows.length > 0) {
        const val = rows[0].value as { items?: Milestone[] }
        if (val.items) setMilestones(val.items)
      }
    }).catch(() => {})
  }, [])

  const completed = milestones.reduce<Record<string, Milestone>>((acc, m) => {
    acc[m.type] = m
    return acc
  }, {})

  // All types: predefined + custom milestones that aren't predefined
  const allTypes = [
    ...MILESTONE_TYPES.map(t => t.type),
    ...milestones.filter(m => m.custom).map(m => m.type).filter(t => !MILESTONE_TYPES.some(p => p.type === t)),
  ]

  const getIcon = (type: string) => {
    const found = MILESTONE_TYPES.find(t => t.type === type)
    if (found) return found.icon('w-5 h-5')
    // Custom milestone icon — star
    return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  }

  const openEditor = (type: string) => {
    const existing = completed[type]
    setEditing(type)
    setEditDate(existing?.date || new Date().toISOString().split('T')[0])
    setEditNote(existing?.note || '')
    setEditPhoto(existing?.photoUrl || '')
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setUploading(false); return }
      const ext = file.name.split('.').pop()
      const path = `milestones/${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('photos').upload(path, file)
      if (!error) {
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
        setEditPhoto(urlData.publicUrl)
      }
    } catch { /* 오프라인 시 무시 */ }
    setUploading(false)
  }

  const handleSave = useCallback(() => {
    if (!editing || !editDate) return
    const isCustom = !MILESTONE_TYPES.some(t => t.type === editing)
    const updated = milestones.filter(m => m.type !== editing)
    updated.push({ id: `ms-${Date.now()}`, type: editing, date: editDate, note: editNote, photoUrl: editPhoto || undefined, custom: isCustom || undefined })
    setMilestones(updated)
    saveMilestonesToDB(updated)
    trackEvent('milestone_recorded', { type: editing })
    setEditing(null)
  }, [editing, editDate, editNote, editPhoto, milestones])

  const handleDelete = useCallback(() => {
    if (!editing) return
    const updated = milestones.filter(m => m.type !== editing)
    setMilestones(updated)
    saveMilestonesToDB(updated)
    setEditing(null)
  }, [editing, milestones])

  const handleAddCustom = () => {
    const name = customName.trim()
    if (!name) return
    setCustomName('')
    setShowCustom(false)
    // Open editor for the new custom type
    openEditor(name)
  }

  const completedCount = allTypes.filter(t => completed[t]).length
  const sortedCompleted = [...milestones].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="min-h-[calc(100dvh-144px)] bg-[var(--color-page-bg)] pb-[env(safe-area-inset-bottom)]">
      <PageHeader title="첫 순간들" showBack />
      <div className="max-w-lg mx-auto w-full px-5 pt-4 pb-4">
        <p className="text-body text-tertiary text-center mb-5">
          {completedCount}/{allTypes.length}개 기록됨
        </p>

        {/* Timeline */}
        <div className="relative pl-8">
          {/* Vertical line */}
          <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-[#E8E4DF]" />

          {allTypes.map((type, idx) => {
            const done = completed[type]
            return (
              <div key={type} className="relative mb-4 last:mb-0">
                {/* Circle on timeline */}
                <div className={`absolute -left-8 top-1 w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center ${
                  done
                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                    : 'bg-white border-[#D0CCC7]'
                }`}>
                  <span className={done ? 'text-white' : 'text-tertiary'} style={{ fontSize: 12 }}>
                    {done ? '✓' : idx + 1}
                  </span>
                </div>

                {/* Card */}
                <button
                  onClick={() => openEditor(type)}
                  className={`w-full text-left p-3 rounded-xl transition-colors ${
                    done
                      ? 'bg-white border border-[var(--color-primary)]/20'
                      : 'bg-white/60 border border-[#E8E4DF]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={done ? 'text-[var(--color-primary)]' : 'text-tertiary'}>
                      {getIcon(type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-body-emphasis ${done ? 'text-primary' : 'text-tertiary'}`}>
                        {type}
                      </p>
                      {done && (
                        <p className="text-caption text-secondary mt-0.5">
                          {done.date.replace(/-/g, '.')}
                          {done.note && ` — ${done.note}`}
                        </p>
                      )}
                      {!done && (
                        <p className="text-caption text-tertiary">탭하여 기록하기</p>
                      )}
                    </div>
                    {done && (
                      <span className="text-label text-[var(--color-primary)] font-bold shrink-0">기록됨</span>
                    )}
                  </div>
                </button>
              </div>
            )
          })}
        </div>

        {/* Add custom milestone */}
        <div className="mt-6">
          {showCustom ? (
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-4">
              <p className="text-body font-semibold text-primary mb-2">직접 추가</p>
              <input
                type="text"
                placeholder="예: 첫 생일 파티, 첫 동물원"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                maxLength={50}
                className="w-full px-3 py-2 rounded-lg border border-[#E8E4DF] text-body-emphasis text-primary placeholder:text-tertiary focus:outline-none focus:border-[var(--color-primary)]"
              />
              <div className="flex gap-2 mt-3">
                <button onClick={() => setShowCustom(false)} className="flex-1 py-2 rounded-lg text-body font-semibold text-secondary bg-[#F0EDE8]">취소</button>
                <button onClick={handleAddCustom} className="flex-1 py-2 rounded-lg text-body font-semibold text-white bg-[var(--color-primary)]">추가</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCustom(true)}
              className="w-full py-3 rounded-xl border-2 border-dashed border-[#D0CCC7] text-body-emphasis text-tertiary active:bg-[#F0EDE8] transition-colors"
            >
              + 직접 추가
            </button>
          )}
        </div>

        {/* Completed timeline summary */}
        {sortedCompleted.length > 0 && (
          <div className="mt-8">
            <p className="text-body font-bold text-secondary mb-3">기록 타임라인</p>
            <div className="space-y-2">
              {sortedCompleted.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-[#E8E4DF]">
                  <span className="text-[var(--color-primary)]">{getIcon(m.type)}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-body font-semibold text-primary">{m.type}</span>
                    {m.note && <span className="text-caption text-secondary ml-1.5">{m.note}</span>}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); shareMilestone(m.type, m.date.replace(/-/g, '.')) }}
                    className="text-caption text-[var(--color-primary)] font-medium shrink-0 px-1.5 active:opacity-60"
                    aria-label="공유"
                  >
                    공유
                  </button>
                  <span className="text-caption text-tertiary shrink-0">{m.date.replace(/-/g, '.')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sheet Editor */}
      {editing && (
        <div className="fixed inset-0 z-[80] bg-black/40" onClick={() => setEditing(null)}>
          <div
            className="absolute bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-2xl animate-slideUp pb-[env(safe-area-inset-bottom)]"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-[#E0E0E0] rounded-full" />
            </div>

            <div className="px-5 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[var(--color-primary)]">{getIcon(editing)}</span>
                <h2 className="text-subtitle font-bold text-primary">{editing}</h2>
              </div>

              {/* Date picker */}
              <label className="block mb-3">
                <span className="text-body font-semibold text-secondary mb-1 block">날짜</span>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E4DF] text-body-emphasis text-primary focus:outline-none focus:border-[var(--color-primary)]"
                />
              </label>

              {/* Note */}
              <label className="block mb-4">
                <span className="text-body font-semibold text-secondary mb-1 block">메모 (선택)</span>
                <textarea
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  placeholder="그 순간을 기록해보세요..."
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E4DF] text-body-emphasis text-primary placeholder:text-tertiary resize-none focus:outline-none focus:border-[var(--color-primary)]"
                />
              </label>

              {/* Photo/Video upload */}
              <div className="mb-4">
                <span className="text-body font-semibold text-secondary mb-1 block">사진 · 영상 (선택)</span>
                {editPhoto ? (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden bg-[var(--color-page-bg)]">
                    {editPhoto.match(/\.(mp4|webm|mov)$/i) ? (
                      <video src={editPhoto} className="w-full h-full object-cover" controls />
                    ) : (
                      <Image src={editPhoto} alt="" fill className="object-cover" />
                    )}
                    <button onClick={() => setEditPhoto('')} className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full text-white text-caption flex items-center justify-center">x</button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center h-20 rounded-lg border-2 border-dashed border-[#D5D0CA] cursor-pointer active:bg-[var(--color-page-bg)]">
                    <div className="text-center">
                      <p className="text-body text-tertiary">{uploading ? '업로드 중...' : '탭해서 추가'}</p>
                    </div>
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                  </label>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {completed[editing] && (
                  <button onClick={handleDelete} className="px-4 py-3 rounded-xl text-body-emphasis text-[#D05050] bg-[#FFF0F0]">
                    삭제
                  </button>
                )}
                <button onClick={handleSave} className="flex-1 py-3 rounded-xl text-body-emphasis text-white bg-[var(--color-primary)] active:opacity-80">
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
