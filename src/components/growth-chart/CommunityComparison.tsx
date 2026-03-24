'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ComparisonData {
  myWeight: number | null
  myHeight: number | null
  communityAvgWeight: number | null
  communityAvgHeight: number | null
  communityCount: number
  whoPercentileWeight: number | null
  whoPercentileHeight: number | null
}

interface Props {
  childId: string
  ageMonths: number
  sex?: string
}

export default function CommunityComparison({ childId, ageMonths, sex }: Props) {
  const [data, setData] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      // 내 최신 기록
      const { data: myRecords } = await supabase
        .from('growth_records')
        .select('weight_kg, height_cm')
        .eq('child_id', childId)
        .order('measured_at', { ascending: false })
        .limit(1)

      const my = myRecords?.[0]

      // 커뮤니티 평균은 Phase 2에서 서버 집계로 구현
      // MVP에서는 30명 미만으로 표시 (활성화 조건 미달)
      const communityAvgWeight = null
      const communityAvgHeight = null
      const communityCount = 0

      setData({
        myWeight: my?.weight_kg ? Number(my.weight_kg) : null,
        myHeight: my?.height_cm ? Number(my.height_cm) : null,
        communityAvgWeight,
        communityAvgHeight,
        communityCount,
        whoPercentileWeight: null,
        whoPercentileHeight: null,
      })
      setLoading(false)
    }
    load()
  }, [childId, ageMonths]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null

  return (
    <div className="mx-4 mt-3 p-4 rounded-2xl bg-white border border-[#ECECEC]">
      <p className="text-[13px] font-bold text-[#212124] mb-3">또래 비교</p>

      {/* WHO 표준 */}
      <div className="space-y-3">
        {data?.myWeight && (
          <ComparisonBar
            label="몸무게"
            myValue={data.myWeight}
            unit="kg"
            color="bg-[#FF6F0F]"
          />
        )}
        {data?.myHeight && (
          <ComparisonBar
            label="키"
            myValue={data.myHeight}
            unit="cm"
            color="bg-[#5B6DFF]"
          />
        )}
      </div>

      {/* 커뮤니티 평균 */}
      {data && data.communityCount >= 30 ? (
        <div className="mt-3 p-3 rounded-xl bg-[#F0EDE8]">
          <p className="text-[11px] text-[#6B6966] mb-1">도담 사용자 평균 (동일 개월 수 {data.communityCount}명)</p>
          <div className="flex gap-4">
            {data.communityAvgWeight && (
              <p className="text-[13px] text-[#212124]">
                몸무게 <span className="font-bold">{data.communityAvgWeight.toFixed(1)}kg</span>
              </p>
            )}
            {data.communityAvgHeight && (
              <p className="text-[13px] text-[#212124]">
                키 <span className="font-bold">{data.communityAvgHeight.toFixed(1)}cm</span>
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 p-3 rounded-xl bg-[#F0EDE8] text-center">
          <p className="text-[11px] text-[#9E9A95]">
            도담 사용자 30명 이상 시 또래 평균 비교가 활성화돼요
          </p>
        </div>
      )}

      <p className="text-[10px] text-[#9E9A95] mt-3 text-center">
        ⚠️ 통계적 참고치이며, 의학적 판단의 근거가 아닙니다.
      </p>
    </div>
  )
}

function ComparisonBar({ label, myValue, unit, color }: {
  label: string; myValue: number; unit: string; color: string
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[12px] text-[#6B6966]">{label}</span>
        <span className="text-[12px] font-bold text-[#212124]">{myValue}{unit}</span>
      </div>
      <div className="h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(Math.max((myValue / (unit === 'kg' ? 15 : 100)) * 100, 10), 95)}%` }}
        />
      </div>
    </div>
  )
}
