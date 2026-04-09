import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '오늘도, 맑음',
  description: '오늘 아이와 외출해도 될까요? 날씨, 미세먼지, 자외선, 감염병을 종합한 외출 점수를 3초만에 확인하세요.',
  keywords: ['외출 점수', '미세먼지', '날씨', '감염병', '옷차림 추천', '육아', '어린이집'],
  openGraph: {
    title: '오늘도, 맑음 - 외출 점수 한눈에',
    description: '날씨 + 미세먼지 + 자외선 + 감염병 → 100점 외출 점수 + 옷차림 추천',
    url: 'https://today.dodam.life',
    siteName: '오늘도, 맑음',
    locale: 'ko_KR',
    type: 'website',
  },
};

export default function TodayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
