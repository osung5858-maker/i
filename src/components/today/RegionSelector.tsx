'use client';

import { useEffect, useState, useMemo } from 'react';
import { REGIONS as REGION_DATA } from '@/lib/today/regions';

interface RegionSelectorProps {
  currentRegion: string;
  onRegionChange: (region: string) => void;
}

/** regions.ts name → underscore 형식 변환 (API 쿼리 파라미터용) */
const toRegionParam = (name: string) => name.replace(/ /g, '_');

/** underscore 형식 → display name */
const formatRegionName = (region: string) => region.replace(/_/g, ' ');

export default function RegionSelector({
  currentRegion,
  onRegionChange,
}: RegionSelectorProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  /** regions.ts 데이터를 시도별로 그룹화 (select optgroup용) */
  const groupedRegions = useMemo(() => {
    const groups: Record<string, Array<{ param: string; display: string }>> = {};
    for (const r of REGION_DATA) {
      if (!groups[r.sidoName]) groups[r.sidoName] = [];
      groups[r.sidoName].push({
        param: toRegionParam(r.name),
        display: r.sigunguName,
      });
    }
    return groups;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRegion = e.target.value;
    onRegionChange(newRegion);
    if (typeof window !== 'undefined') {
      localStorage.setItem('today_region', newRegion);
    }
  };

  if (!isClient) {
    return (
      <div className="h-11 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700">
        {formatRegionName(currentRegion)}
      </div>
    );
  }

  return (
    <select
      value={currentRegion}
      onChange={handleChange}
      className="
        h-11 px-4 py-2
        bg-white border border-gray-200 rounded-xl
        text-sm font-medium text-gray-700
        cursor-pointer
        hover:border-gray-300
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        transition-colors
      "
      aria-label="지역 선택"
    >
      {Object.entries(groupedRegions).map(([sido, items]) => (
        <optgroup key={sido} label={sido}>
          {items.map((item) => (
            <option key={item.param} value={item.param}>
              {item.display}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
