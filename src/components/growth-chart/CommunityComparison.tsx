'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// WHO Child Growth Standards (월별 50th percentile 기준, 남아/여아)
// 출처: WHO Weight-for-age, Length/height-for-age tables
const WHO_WEIGHT_50: Record<string, Record<number, number>> = {
  male: { 0:3.3,1:4.5,2:5.6,3:6.4,4:7.0,5:7.5,6:7.9,7:8.3,8:8.6,9:8.9,10:9.2,11:9.4,12:9.6,15:10.3,18:10.9,24:12.2,30:13.3,36:14.3 },
  female: { 0:3.2,1:4.2,2:5.1,3:5.8,4:6.4,5:6.9,6:7.3,7:7.6,8:7.9,9:8.2,10:8.5,11:8.7,12:8.9,15:9.6,18:10.2,24:11.5,30:12.7,36:13.9 },
}
const WHO_HEIGHT_50: Record<string, Record<number, number>> = {
  male: { 0:49.9,1:54.7,2:58.4,3:61.4,4:63.9,5:65.9,6:67.6,7:69.2,8:70.6,9:72.0,10:73.3,11:74.5,12:75.7,15:79.1,18:82.3,24:87.8,30:92.4,36:96.1 },
  female: { 0:49.1,1:53.7,2:57.1,3:59.8,4:62.1,5:64.0,6:65.7,7:67.3,8:68.7,9:70.1,10:71.5,11:72.8,12:74.0,15:77.5,18:80.7,24:86.4,30:91.1,36:95.1 },
}
// SD (표준편차 근사치: WHO tables에서 50th-3rd 차이의 ~1/2)
const WHO_WEIGHT_SD: Record<string, Record<number, number>> = {
  male: { 0:0.5,1:0.6,2:0.7,3:0.7,4:0.8,5:0.8,6:0.9,7:0.9,8:0.9,9:1.0,10:1.0,11:1.0,12:1.0,15:1.1,18:1.2,24:1.3,30:1.4,36:1.5 },
  female: { 0:0.5,1:0.5,2:0.6,3:0.7,4:0.7,5:0.8,6:0.8,7:0.8,8:0.9,9:0.9,10:0.9,11:0.9,12:1.0,15:1.0,18:1.1,24:1.2,30:1.3,36:1.4 },
}
const WHO_HEIGHT_SD: Record<string, Record<number, number>> = {
  male: { 0:1.9,1:2.0,2:2.0,3:2.1,4:2.1,5:2.1,6:2.1,7:2.2,8:2.2,9:2.2,10:2.2,11:2.3,12:2.3,15:2.4,18:2.5,24:2.7,30:2.9,36:3.0 },
  female: { 0:1.8,1:1.9,2:2.0,3:2.0,4:2.0,5:2.1,6:2.1,7:2.1,8:2.1,9:2.2,10:2.2,11:2.3,12:2.3,15:2.4,18:2.5,24:2.7,30:2.9,36:3.0 },
}

function getWHOValue(table: Record<string, Record<number, number>>, sex: string, ageMonths: number): number {
  const s = sex === 'female' ? 'female' : 'male'
  const months = Object.keys(table[s]).map(Number).sort((a, b) => a - b)
  const exact = table[s][ageMonths]
  if (exact !== undefined) return exact
  // 보간
  const lower = months.filter((m) => m <= ageMonths).pop() || months[0]
  const upper = months.find((m) => m > ageMonths) || months[months.length - 1]
  if (lower === upper) return table[s][lower]
  const ratio = (ageMonths - lower) / (upper - lower)
  return table[s][lower] + (table[s][upper] - table[s][lower]) * ratio
}

// Z-score → 백분위 근사 (표준정규분포 CDF)
function zToPercentile(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989422804014327
  const p = d * Math.exp(-z * z / 2) * (t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429)))))
  return Math.round((z > 0 ? 1 - p : p) * 100)
}

function calcPercentile(value: number, mean: number, sd: number): number {
  if (sd <= 0) return 50
  const z = (value - mean) / sd
  return zToPercentile(z)
}

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
  const [percentileInfoOpen, setPercentileInfoOpen] = useState(false)
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
      const myW = my?.weight_kg ? Number(my.weight_kg) : null
      const myH = my?.height_cm ? Number(my.height_cm) : null

      // WHO 백분위 계산
      const s = sex || 'male'
      const whoW = myW ? calcPercentile(
        myW,
        getWHOValue(WHO_WEIGHT_50, s, ageMonths),
        getWHOValue(WHO_WEIGHT_SD, s, ageMonths)
      ) : null
      const whoH = myH ? calcPercentile(
        myH,
        getWHOValue(WHO_HEIGHT_50, s, ageMonths),
        getWHOValue(WHO_HEIGHT_SD, s, ageMonths)
      ) : null

      // 커뮤니티 평균 (30명 미만은 비활성)
      const communityAvgWeight = null
      const communityAvgHeight = null
      const communityCount = 0

      setData({
        myWeight: myW,
        myHeight: myH,
        communityAvgWeight,
        communityAvgHeight,
        communityCount,
        whoPercentileWeight: whoW,
        whoPercentileHeight: whoH,
      })
      setLoading(false)
    }
    load()
  }, [childId, ageMonths]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null

  return (
    <div className="mx-4 mt-3 p-4 rounded-2xl bg-white border border-[#ECECEC]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-body font-bold text-primary">또래 비교</p>
        <button
          onClick={() => setPercentileInfoOpen(!percentileInfoOpen)}
          className="text-caption text-[var(--color-primary)] font-semibold flex items-center gap-0.5"
        >
          백분위수란? {percentileInfoOpen ? '▲' : '▼'}
        </button>
      </div>

      {percentileInfoOpen && (
        <div className="mb-3 p-3 rounded-xl bg-[#F0F9F4] border border-[#D5E8DD] space-y-1.5">
          <p className="text-body font-semibold text-primary">백분위수 읽는 법</p>
          <p className="text-caption text-secondary leading-relaxed">
            백분위수는 같은 월령의 아이 100명 중 우리 아이의 위치를 나타냅니다.
          </p>
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <span className="text-caption font-bold text-[var(--color-primary)] shrink-0 w-10">50%</span>
              <p className="text-caption text-secondary">또래 평균과 같아요</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-caption font-bold text-[var(--color-primary)] shrink-0 w-10">75%</span>
              <p className="text-caption text-secondary">또래 100명 중 75번째 — 평균보다 큰 편</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-caption font-bold text-[var(--color-primary)] shrink-0 w-10">25%</span>
              <p className="text-caption text-secondary">또래 100명 중 25번째 — 평균보다 작은 편</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-caption font-bold text-[#D08068] shrink-0 w-10">&lt;3%</span>
              <p className="text-caption text-[#D08068]">소아과 상담을 권장합니다</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-caption font-bold text-[#D08068] shrink-0 w-10">&gt;97%</span>
              <p className="text-caption text-[#D08068]">소아과 상담을 권장합니다</p>
            </div>
          </div>
          <p className="text-label text-tertiary mt-1">
            WHO 국제 성장 기준표(2006) 기반. 개인차가 있으므로 추이 변화가 더 중요합니다.
          </p>
        </div>
      )}

      {/* WHO 표준 */}
      <div className="space-y-3">
        {data?.myWeight && (
          <ComparisonBar
            label="몸무게"
            myValue={data.myWeight}
            unit="kg"
            color="bg-[var(--color-primary)]"
            percentile={data.whoPercentileWeight}
          />
        )}
        {data?.myHeight && (
          <ComparisonBar
            label="키"
            myValue={data.myHeight}
            unit="cm"
            color="bg-[#5B6DFF]"
            percentile={data.whoPercentileHeight}
          />
        )}
      </div>

      {/* 커뮤니티 평균 */}
      {data && data.communityCount >= 30 ? (
        <div className="mt-3 p-3 rounded-xl bg-[#F0EDE8]">
          <p className="text-body text-secondary mb-1">도담 사용자 평균 (동일 개월 수 {data.communityCount}명)</p>
          <div className="flex gap-4">
            {data.communityAvgWeight && (
              <p className="text-body text-primary">
                몸무게 <span className="font-bold">{data.communityAvgWeight.toFixed(1)}kg</span>
              </p>
            )}
            {data.communityAvgHeight && (
              <p className="text-body text-primary">
                키 <span className="font-bold">{data.communityAvgHeight.toFixed(1)}cm</span>
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 p-3 rounded-xl bg-[#F0EDE8] text-center">
          <p className="text-body text-tertiary">
            도담 사용자 30명 이상 시 또래 평균 비교가 활성화돼요
          </p>
        </div>
      )}

      <p className="text-body-emphasis text-tertiary mt-3 text-center">
        통계적 참고치이며, 의학적 판단의 근거가 아닙니다.
      </p>
    </div>
  )
}

function ComparisonBar({ label, myValue, unit, color, percentile }: {
  label: string; myValue: number; unit: string; color: string; percentile?: number | null
}) {
  const pct = percentile ?? 50
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-body-emphasis text-secondary">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-body-emphasis font-bold text-primary">{myValue}{unit}</span>
          {percentile != null && (
            <span className="text-caption font-semibold text-[var(--color-primary)] bg-[#E8F5EE] px-1.5 py-0.5 rounded">
              상위 {100 - percentile}%
            </span>
          )}
        </div>
      </div>
      <div className="h-2 bg-[#F0EDE8] rounded-full overflow-hidden relative">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(Math.max(pct, 5), 95)}%` }}
        />
      </div>
      {percentile != null && (
        <div className="flex justify-between mt-0.5">
          <span className="text-label text-tertiary">3rd</span>
          <span className="text-label text-tertiary">50th</span>
          <span className="text-label text-tertiary">97th</span>
        </div>
      )}
    </div>
  )
}
