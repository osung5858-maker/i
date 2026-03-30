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

const TYPE_STYLES: Record<string, { bg: string; border: string; icon: typeof AlertIcon; iconColor: string }> = {
  alert: { bg: 'bg-red-50', border: 'border-red-200', icon: AlertIcon, iconColor: 'text-red-600' },
  suggest: { bg: 'bg-[#FFF8F0]', border: 'border-[#FFDDC8]', icon: SparkleIcon, iconColor: 'text-[#C4913E]' },
  remind: { bg: 'bg-[#F0F5FF]', border: 'border-[#C8D8F0]', icon: BellIcon, iconColor: 'text-[#5B9FD6]' },
  info: { bg: 'bg-[var(--color-page-bg)]', border: 'border-[#E8E4DF]', icon: SparkleIcon, iconColor: 'text-[#6B6966]' },
}

export default function CareFlowCard({ actions, onDismiss, onRecord }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  if (actions.length === 0) return null

  const visible = actions.filter(a => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-2">
      {visible.slice(0, 3).map(action => {
        const style = TYPE_STYLES[action.type] || TYPE_STYLES.info
        const Icon = style.icon

        return (
          <div
            key={action.id}
            className={`${style.bg} border ${style.border} rounded-xl p-3.5 animate-[fadeIn_0.3s_ease-out]`}
          >
            <div className="flex items-start gap-2.5">
              <Icon className={`w-4.5 h-4.5 ${style.iconColor} mt-0.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#1A1918]">{action.title}</p>
                <p className="text-[13px] text-[#6B6966] mt-0.5 leading-relaxed">{action.desc}</p>

                {action.actionLabel && (
                  <div className="mt-2">
                    {action.actionType === 'navigate' && action.actionHref ? (
                      <Link
                        href={action.actionHref}
                        className="inline-flex items-center text-[13px] font-semibold text-[var(--color-primary)] active:opacity-70"
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
                        className="inline-flex items-center text-[13px] font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1.5 rounded-lg active:opacity-70"
                      >
                        {action.actionLabel}
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setDismissed(prev => new Set([...prev, action.id]))
                  onDismiss(action.id)
                }}
                className="text-[#D0CCC7] p-0.5 active:opacity-50"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
