'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CareAction } from '@/lib/care-flow/engine'
import { AlertIcon, SparkleIcon, BellIcon, XIcon } from '@/components/ui/Icons'

interface Props {
  actions: CareAction[]
  onDismiss: (id: string) => void
  onRecord: (type: string) => void
}

const TYPE_STYLES: Record<string, { gradient: string; iconBg: string; icon: typeof AlertIcon; iconColor: string; badgeBg: string; badgeText: string; badge: string }> = {
  alert: { gradient: 'from-red-50 to-white', iconBg: 'bg-red-50 shadow-[0_2px_8px_rgba(239,68,68,0.15)]', icon: AlertIcon, iconColor: 'text-red-600', badgeBg: 'bg-red-100', badgeText: 'text-red-700', badge: '긴급' },
  suggest: { gradient: 'from-[var(--color-primary-bg)] to-white', iconBg: 'bg-[var(--color-primary-bg)] shadow-[0_2px_8px_var(--color-card-shadow)]', icon: SparkleIcon, iconColor: 'text-[var(--color-primary)]', badgeBg: 'bg-[var(--color-primary)]/10', badgeText: 'text-[var(--color-primary)]', badge: 'AI 제안' },
  remind: { gradient: 'from-blue-50 to-white', iconBg: 'bg-blue-50 shadow-[0_2px_8px_rgba(91,159,214,0.15)]', icon: BellIcon, iconColor: 'text-blue-600', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', badge: '리마인더' },
  info: { gradient: 'from-[var(--color-surface-alt)] to-white', iconBg: 'bg-[var(--color-surface-alt)] shadow-[0_2px_8px_rgba(107,105,102,0.1)]', icon: SparkleIcon, iconColor: 'text-secondary', badgeBg: 'bg-gray-100', badgeText: 'text-gray-700', badge: '정보' },
}

export default function CareFlowCard({ actions, onDismiss, onRecord }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  if (actions.length === 0) return null

  const visible = actions.filter(a => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-3">
      {visible.slice(0, 3).map((action, idx) => {
        const style = TYPE_STYLES[action.type] || TYPE_STYLES.info
        const Icon = style.icon

        return (
          <div
            key={action.id}
            className={`bg-gradient-to-b ${style.gradient} border border-[#E8E4DF] rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden`}
            style={{
              animation: `slideUp 0.3s ease-out ${idx * 0.1}s both`
            }}
          >
            <div className="px-5 pt-4 pb-4">
              <div className="flex items-start gap-3">
                {/* 아이콘 */}
                <div className={`w-12 h-12 rounded-2xl ${style.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${style.iconColor}`} />
                </div>

                {/* 텍스트 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label font-bold ${style.badgeBg} ${style.badgeText}`}>
                      {style.badge}
                    </span>
                  </div>
                  <p className="text-subtitle text-primary leading-snug">{action.title}</p>
                  <p className="text-body text-secondary mt-1 leading-relaxed">{action.desc}</p>

                  {action.actionLabel && (
                    <div className="mt-3">
                      {action.actionType === 'navigate' && action.actionHref ? (
                        <Link
                          href={action.actionHref}
                          className="inline-flex items-center px-4 py-2 rounded-xl bg-white border border-[#E8E4DF] text-body font-semibold text-[var(--color-primary)] active:bg-[#FAFAF8] transition-colors shadow-sm"
                        >
                          {action.actionLabel} →
                        </Link>
                      ) : action.actionType === 'record' ? (
                        <button
                          onClick={() => {
                            if (action.id.includes('temp')) onRecord('temp')
                            else if (action.id.includes('med')) onRecord('medication')
                            else onRecord('temp')
                            setDismissed(prev => new Set([...prev, action.id]))
                            onDismiss(action.id)
                          }}
                          className="inline-flex items-center px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-white font-bold active:opacity-90 shadow-[0_2px_8px_rgba(45,122,74,0.25)]"
                        >
                          {action.actionLabel}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* 닫기 버튼 */}
                <button
                  onClick={() => {
                    setDismissed(prev => new Set([...prev, action.id]))
                    onDismiss(action.id)
                  }}
                  className="text-muted hover:text-secondary shrink-0 p-1.5 rounded-lg hover:bg-white/50 transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )
      })}

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
