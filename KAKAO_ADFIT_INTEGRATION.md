# 카카오 AdFit 광고 통합 가이드

## 개요
카카오 AdFit을 활용한 모바일 앱 내 광고 수익화 시스템 구축 완료.

## 구현 내용

### 1. KakaoAdFit 컴포넌트 생성
**파일**: `src/components/ads/KakaoAdFit.tsx`

#### 주요 기능
- 카카오 AdFit SDK 동적 로딩
- 개발/프로덕션 환경 자동 감지
- 플레이스홀더 UI (개발 환경)
- 다양한 광고 사이즈 지원

#### Props
```typescript
interface KakaoAdFitProps {
  unit: string        // AdFit 광고 단위 ID (예: "DAN-xxxxxxxxxx")
  width: number       // 광고 너비 (px)
  height: number      // 광고 높이 (px)
  className?: string  // 커스텀 클래스
  style?: React.CSSProperties
}
```

#### 지원 광고 사이즈
| 크기 | 용도 |
|------|------|
| 320×50 | 모바일 배너 (상단/하단) |
| 320×100 | 모바일 큰 배너 |
| 300×250 | 중형 직사각형 (피드 내) |
| 250×250 | 정사각형 |
| 160×600 | 와이드 스카이스크래퍼 |

### 2. 적용 위치

#### 메인 페이지 (page.tsx)
**위치**: 키즈노트 카드와 심심풀이 섹션 사이
```tsx
<KakaoAdFit
  unit="DAN-main-mid-banner"
  width={320}
  height={100}
  className="mx-auto"
/>
```
**광고 타입**: 320×100 모바일 큰 배너

#### 알림 페이지 (notifications/page.tsx)
**위치 1**: 페이지 상단 (헤더 바로 아래)
```tsx
<KakaoAdFit
  unit="DAN-notif-top-banner"
  width={320}
  height={50}
  className="mx-auto my-4"
/>
```
**광고 타입**: 320×50 모바일 배너

**위치 2**: 알림 목록 중간 (5개 이상일 때)
```tsx
{notifications.length >= 5 && (
  <KakaoAdFit
    unit="DAN-notif-feed"
    width={300}
    height={250}
    className="mx-auto"
  />
)}
```
**광고 타입**: 300×250 피드 내 광고

## 환경별 동작

### 개발 환경
- 실제 광고 로드하지 않음
- 노란색 점선 테두리 플레이스홀더 표시
- 광고 사이즈와 단위 ID 표시

### 프로덕션 환경
- 카카오 AdFit SDK 자동 로드
- 실제 광고 표시
- `<ins class="kakao_ad_area">` 태그 생성

## 카카오 AdFit 연동 단계

### 1. AdFit 가입 및 매체 등록
1. [카카오 AdFit](https://adfit.kakao.com) 접속
2. 카카오 계정으로 로그인
3. 매체 관리 → 새 매체 등록
4. 앱 정보 입력 (이름, URL, 카테고리)

### 2. 광고 단위 생성
1. 매체 관리 → 광고 단위 관리
2. 새 광고 단위 생성
3. 광고 타입 선택 (배너, 네이티브 등)
4. 광고 사이즈 선택
5. **광고 단위 ID** 발급 받기 (`DAN-xxxxxxxxxx`)

### 3. 코드에 광고 단위 ID 적용
현재 코드의 플레이스홀더 ID를 실제 발급받은 ID로 교체:

```tsx
// Before (placeholder)
unit="DAN-main-mid-banner"

// After (실제 발급받은 ID)
unit="DAN-abc1234567"
```

#### 교체할 위치
| 파일 | 라인 | 플레이스홀더 ID | 용도 |
|------|------|----------------|------|
| `src/app/page.tsx` | ~723 | `DAN-main-mid-banner` | 메인 중간 배너 |
| `src/app/notifications/page.tsx` | ~145 | `DAN-notif-top-banner` | 알림 상단 배너 |
| `src/app/notifications/page.tsx` | ~186 | `DAN-notif-feed` | 알림 피드 광고 |

### 4. 검수 및 승인
1. 앱 배포 (TestFlight, 구글 플레이 등)
2. AdFit에서 광고 단위 검수 요청
3. 승인 완료 후 광고 노출 시작

## 수익 확인
- AdFit 대시보드 → 수익 리포트
- 일간/월간 수익, 노출 수, 클릭 수 확인

## 추가 권장 광고 위치

### 동네 페이지 (town/page.tsx)
- 소모임 리스트 중간 (5개마다)
- 300×250 피드 내 광고

### 추억 페이지 (record/page.tsx)
- 사진 갤러리 중간
- 320×100 배너

### 임신 준비/임신 중 페이지
- AI 케어 섹션 하단
- 320×50 배너

## 광고 최적화 팁

### 1. 광고 빈도
- 스크롤 5-7개 콘텐츠마다 광고 1개
- 너무 빈번하면 사용자 경험 저하

### 2. 광고 위치
- 자연스러운 콘텐츠 흐름 사이
- 중요한 액션 버튼과 분리

### 3. 광고 사이즈
- 모바일: 320×50, 320×100 우선
- 피드형 콘텐츠: 300×250

## 빌드 결과
✅ **성공** (2.8s 컴파일, 4.1s TypeScript, 0 에러, 78 라우트)

## 파일 구조
```
src/
├── components/
│   └── ads/
│       ├── KakaoAdFit.tsx       (카카오 AdFit 컴포넌트)
│       ├── GoogleAdBanner.tsx   (Google AdSense, 비활성)
│       └── AdSlot.tsx           (레거시)
└── app/
    ├── page.tsx                 (메인 - AdFit 적용 ✅)
    └── notifications/page.tsx   (알림 - AdFit 적용 ✅)
```

## 주의사항
- AdFit SDK는 프로덕션에서만 로드
- 광고 단위 ID는 실제 발급받은 ID로 교체 필수
- 광고 검수 승인 전까지는 광고 미노출
- 과도한 광고 배치는 사용자 이탈 증가

## 다음 단계
1. 카카오 AdFit 가입 및 매체 등록
2. 광고 단위 ID 3개 발급 (메인, 알림 상단, 알림 피드)
3. 코드에 실제 ID 적용
4. 프로덕션 배포
5. AdFit 검수 요청
6. 수익 모니터링 및 최적화
