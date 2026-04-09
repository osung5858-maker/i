'use client';

import { useState } from 'react';
import { trackEvent } from '@/lib/today/analytics';

interface ShareButtonProps {
  /** Current region param (e.g. "서울특별시_강남구") */
  region?: string;
  /** Current score for share text */
  score?: number;
  /** Grade message (e.g. "오늘도, 맑음") */
  message?: string;
}

export default function ShareButton({ region, score, message }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => {
    const base = typeof window !== 'undefined'
      ? `${window.location.origin}/today`
      : 'https://today.dodam.life';
    if (region) return `${base}?region=${encodeURIComponent(region)}`;
    return base;
  };

  const getShareText = () => {
    if (score !== undefined && message) {
      return `오늘 외출 점수 ${score}점 — ${message}! 확인해보세요`;
    }
    return '오늘 외출 점수를 확인해보세요!';
  };

  const handleShare = async () => {
    const url = getShareUrl();
    const text = getShareText();

    trackEvent('share_click', { region: region ?? 'unknown', method: 'auto' });

    const shareData = {
      title: '오늘도, 맑음',
      text,
      url,
    };

    // Web Share API
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        trackEvent('share_complete', { region: region ?? 'unknown', method: 'native' });
        return;
      } catch {
        // User cancelled or API failed — fall through to clipboard
      }
    }

    // Fallback: clipboard copy
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackEvent('share_complete', { region: region ?? 'unknown', method: 'clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Final fallback for older browsers
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="
        flex items-center justify-center gap-2
        h-12 px-6 w-full
        bg-[#FEE500] text-[#000000]
        rounded-xl
        font-semibold text-sm
        hover:bg-[#FDD835]
        active:scale-[0.98]
        transition-all duration-150
      "
      aria-label="공유하기"
    >
      <span className="text-xl">{copied ? '✅' : '💬'}</span>
      {copied ? '링크 복사 완료!' : '공유하기'}
    </button>
  );
}
