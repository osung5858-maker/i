'use client';

export default function ShareButton() {
  const handleShare = async () => {
    const shareData = {
      title: '오늘도, 맑음',
      text: '오늘 외출 점수를 확인해보세요!',
      url: window.location.href,
    };

    // Web Share API 지원 확인
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // 폴백: URL 복사
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('링크가 복사되었습니다!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
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
      aria-label="카카오톡으로 공유"
    >
      <span className="text-xl">💬</span>
      카카오톡 공유
    </button>
  );
}
