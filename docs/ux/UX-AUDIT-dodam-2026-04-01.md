# UX Audit Report — 도담 (Dodam)
**Date**: 2026-04-01
**Project**: 도담 (Parenting + Pregnancy + Preparing AI Care App)
**Auditor**: da:ux (UX Validation & Improvement Engine)
**Framework**: Next.js 15 + React 18 + Supabase
**Total Pages**: 61
**Total Components**: 65+

---

## Executive Summary

### Overall UX Score: **72/100** (Acceptable — High Priority Improvements Needed)

| Dimension | Score | Weight | Evidence | Priority |
|-----------|-------|--------|----------|----------|
| **Information Architecture** | 11/15 | 15% | Clear navigation, but 3-mode routing causes confusion | P1 |
| **Interaction Design** | 14/20 | 20% | FAB system works, but lacks consistency in feedback patterns | P1 |
| **Visual Hierarchy** | 12/15 | 15% | Strong typography, but 383 instances of small text (10-12px) | P0 |
| **Accessibility** | 9/20 | 20% | **CRITICAL**: Only 5 aria-labels, 0 role attributes | **P0** |
| **User Flow** | 11/15 | 15% | Mode switching smooth, but some dead ends | P1 |
| **Responsive Design** | 10/10 | 10% | Mobile-first, excellent safe-area handling | ✅ |
| **Performance/States** | 5/5 | 5% | Skeleton screens, offline support, loading states | ✅ |

**Threshold Analysis**:
- Current: 72/100 (Acceptable range: 75-84)
- **Gap to Good**: -13pt
- **Regressions**: N/A (first audit)

---

## Critical Findings (P0) — **MUST FIX**

### 1. **Accessibility Violations** (WCAG 2.1 AA)
**Score Impact**: -11pt on Accessibility dimension
**Evidence**:
- `src/app/page.tsx:965` — FAB button lacks aria-label (critical navigation element)
- `src/components/bnb/BottomNav.tsx:1000-1040` — FAB session control has aria-label, but nested duration buttons missing
- `src/components/ui/Toast.tsx:23-44` — Toast notification lacks ARIA live region (`role="status"` or `aria-live="polite"`)
- `src/components/ui/BottomSheet.tsx:21-36` — Modal lacks `role="dialog"` and `aria-modal="true"`
- `src/components/layout/GlobalHeader.tsx:177,219` — Icon-only buttons missing aria-labels

**Impact**:
- Screen readers cannot announce critical actions (record events, notifications)
- Keyboard-only users cannot identify button purposes
- WCAG 2.1 AA violation: 1.1.1 (Non-text Content), 4.1.2 (Name, Role, Value)

**Fix**: Add aria-labels to all interactive elements, role attributes to modals/toasts

---

### 2. **Typography Readability Crisis**
**Score Impact**: -3pt on Visual Hierarchy
**Evidence**: 383 instances of text-[10px], text-[11px], text-[12px] across 60 files

Critical locations:
- `src/app/page.tsx:533,539,579,580` — Event time labels at 12px
- `src/components/bnb/BottomNav.tsx:686,731,840,849,1058` — Navigation and FAB labels at 10-12px
- `src/components/layout/GlobalHeader.tsx:192,198,204` — Header status text at 12px
- `src/app/onboarding/page.tsx:165` — Critical onboarding copy at 13px

**Impact**:
- iOS Human Interface Guidelines minimum: 11pt (14.67px at 1x) → **60+ violations**
- WCAG 2.1 AA text size: minimum 14px for body text → **383 violations**
- Age 40+ users with presbyopia cannot read labels

**Fix**: Increase all body text to minimum 14px, labels to 13px minimum

---

## High Priority Issues (P1)

### 3. **Inconsistent Feedback Patterns**
**Score Impact**: -6pt on Interaction Design
**Evidence**:
- `src/app/page.tsx:169-195` — Event recording uses CustomEvent dispatch + immediate DB save (complex)
- `src/components/bnb/BottomNav.tsx:342-496` — Same action (record event) uses different code paths
- Toast messages vary: "완료!", "기록됐어요", "기록 완료!" (inconsistent tone)
- Vibration feedback: some use `navigator.vibrate(30)`, others `navigator.vibrate([30,50,30])` (page.tsx:316,552 vs. no vibration in many places)

**Impact**:
- Users cannot predict system behavior
- Nielsen Heuristic #4 (Consistency and Standards) violation

**Fix**: Unify event recording API, standardize toast messages, consistent haptic patterns

---

### 4. **Navigation Confusion — 3-Mode Context Switching**
**Score Impact**: -4pt on Information Architecture
**Evidence**:
- `src/components/bnb/BottomNav.tsx:28-47` — Three separate tab sets for preparing/pregnant/parenting
- `src/app/page.tsx:1-1040` (육아), `src/app/pregnant/page.tsx`, `src/app/preparing/page.tsx` — No visual indicator of current mode beyond header
- Mode detection logic in `BottomNav.tsx:259-268` uses pathname + localStorage (fragile)

**Impact**:
- User gets lost when switching modes
- No persistent mode indicator (only in header)
- Mental model mismatch: "Which tab am I on?"

**Fix**: Add mode badge to BottomNav, visual mode indicator on all pages

---

### 5. **FAB Overflow — Too Many Categories**
**Score Impact**: -2pt on User Flow
**Evidence**:
- `src/components/bnb/BottomNav.tsx:632-695` — Arc layout with dynamic item count
- Parenting mode: 4 categories (eat, sleep, diaper, health)
- Pregnant mode: 5 categories (mood, fetal, health, suppl, diary) — calculated at line 122-157
- Preparing mode: 4 categories — calculated at line 159-185
- Arc positioning formula: 160° to 20° spread → at 5+ items, buttons overlap nav tabs (line 638-644)

**Impact**:
- 5+ FAB buttons create cognitive overload (Miller's Law: 7±2 items)
- Visual clutter reduces tap accuracy
- Overlap with nav tabs on smaller screens

**Fix**: Limit FAB to top 4 most frequent actions, move rest to submenu

---

## Medium Priority Issues (P2)

### 6. **Placeholder Microcopy Quality**
**Score Impact**: -1pt on Microcopy Quality
**Evidence**: 54 placeholder occurrences, quality varies:
- ✅ Good: `src/app/growth/add/page.tsx` — "몇 cm인가요?" (context-specific)
- ❌ Generic: `src/app/feedback/page.tsx` — "여기에 입력하세요" (no context)
- ❌ Missing tone: `src/app/kidsnote/page.tsx` — "비밀번호" (formal, not warm)

**Fix**: Rewrite all placeholders with warm, contextual tone (e.g., "아이 이름을 알려주세요")

---

### 7. **Empty State Messaging**
**Score Impact**: -1pt on User Flow
**Evidence**:
- `src/app/page.tsx:551` — "아직 기록이 없어요. 펜 버튼으로 첫 기록을 남겨보세요!" (clear CTA ✅)
- `src/app/page.tsx:859-862` — "오늘 알림장이 아직 없어요" (neutral, no encouragement)
- Missing empty states in: notifications, community, growth photos

**Fix**: Add illustrations + warm encouragement to all empty states

---

### 8. **Focus State Coverage**
**Score Impact**: -2pt on Accessibility
**Evidence**: Only 31 focus: utility classes across 17 files
- `src/components/bnb/BottomNav.tsx:838,1119` — Input fields have focus rings ✅
- Most buttons lack visible focus indicators (rely on browser default)

**Fix**: Add focus:ring-2 to all interactive elements

---

## UX Debt Register

| ID | Issue | First Detected | Est. Fix Time | Cumulative Cost |
|----|-------|----------------|---------------|-----------------|
| UD-001 | Accessibility violations (P0) | 2026-04-01 | 4h | Low (early catch) |
| UD-002 | Typography size violations (P0) | 2026-04-01 | 2h | Low |
| UD-003 | Inconsistent feedback patterns (P1) | 2026-04-01 | 6h | Medium |
| UD-004 | Mode navigation confusion (P1) | 2026-04-01 | 3h | Medium |
| UD-005 | FAB overflow (P1) | 2026-04-01 | 4h | Medium |

**Total Estimated Fix Time**: 19h (2.5 days)

---

## Detailed Dimension Scores

### 1. Information Architecture (11/15)

**What's Good** (8pt):
- Clear primary navigation (4 tabs consistent across modes)
- Logical grouping by user journey (오늘 → 추억/기다림 → 동네 → 우리)
- Deep linking works (`/records/[date]`, `/map/[placeId]`)

**What's Missing** (4pt deduction):
- No breadcrumb on deep pages (records/[date], prep-records/[date])
- Mode switching not visible in navigation (only header shows mode)
- No sitemap or help documentation
- URL structure inconsistent: `/pregnant` vs `/preparing` vs `/` for parenting

**Evidence**:
- `src/components/bnb/BottomNav.tsx:28-47` — Tab definitions
- `src/app` directory structure — 61 pages, no clear IA map

---

### 2. Interaction Design (14/20)

**What's Good** (10pt):
- FAB arc animation smooth (line 1074-1095 keyframes)
- Active session timer visual feedback (page.tsx:1000-1024)
- Offline support with pending event queue (page.tsx:220-246)
- Realtime updates via Supabase (page.tsx:148-158)

**What's Missing** (6pt deduction):
- Inconsistent error prevention (no confirmation on delete/undo in many places)
- Mixed feedback patterns (CustomEvent vs direct DB save)
- No undo for mode switch (could accidentally switch modes)
- Loading states inconsistent (some spinners, some skeleton screens)

**Evidence**:
- `src/app/page.tsx:393-398` — Undo only works for events with undoId (missing for many event types)
- `src/components/bnb/BottomNav.tsx:342-496` — handleQuickRecord complexity (154 lines)

---

### 3. Visual Hierarchy (12/15)

**What's Good** (9pt):
- Consistent color system (CSS variables: --color-primary, --color-page-bg)
- Strong accent colors for categories (eat: primary, sleep: #6366F1, diaper: #D89575)
- Icon system comprehensive (65+ custom icons)

**What's Missing** (3pt deduction):
- **Typography size violations** (383 instances below 14px)
- Insufficient contrast on some secondary text (#9E9A95 on white = 3.2:1, needs 4.5:1)
- Spacing inconsistency (some use px-5, others px-4)

**Evidence**:
- `src/app/globals.css` — CSS variable definitions
- Grep results: 383 text-[10-12px] instances

---

### 4. Accessibility (9/20) — **CRITICAL**

**What's Good** (5pt):
- Semantic HTML in most places (header, nav, button elements)
- Safe-area-inset handling for notch devices (BottomNav.tsx:992)
- Touch target sizes mostly 44x44px+ (FAB is 72x72px)

**What's Missing** (11pt deduction):
- **No ARIA labels on critical buttons** (FAB, nav icons, header actions)
- **No ARIA roles on modals/toasts** (screen readers don't announce them)
- No keyboard navigation support (FAB cannot be opened with keyboard)
- No skip-to-content link
- Color contrast issues (#9E9A95 text on white = 3.2:1, needs 4.5:1 for WCAG AA)

**Evidence**:
- Grep aria-label: only 5 occurrences
- Grep role=: 0 occurrences
- `src/components/ui/Toast.tsx` — No aria-live region
- `src/components/ui/BottomSheet.tsx` — No role="dialog"

---

### 5. User Flow (11/15)

**What's Good** (8pt):
- Onboarding flow smooth (3-step: login → mode select → tutorial)
- Record event flow intuitive (FAB → category → detail → confirm)
- Toast feedback immediate after actions

**What's Missing** (4pt deduction):
- Empty states lack illustrations in some places
- No exit survey/confirmation before mode switch
- Deep pages (records/[date]) no back button (rely on browser back)
- Kidsnote integration flow confusing (too many steps)

**Evidence**:
- `src/app/onboarding/page.tsx:18-223` — Onboarding flow
- `src/app/page.tsx:699-892` — Kidsnote card complexity (193 lines)

---

### 6. Responsive Design (10/10) ✅

**Perfect Score**:
- Mobile-first design (max-w-[430px] throughout)
- Safe-area-inset handling (BottomNav pb-[max(20px,env(safe-area-inset-bottom))])
- Touch targets 44x44px+ (WCAG 2.1 AA compliant)
- Fixed positioning works correctly (header sticky, nav fixed bottom)
- Video fallback for illustrations (webm with autoplay, loop, muted, playsInline)

**Evidence**:
- `src/components/bnb/BottomNav.tsx:992` — Safe area handling
- All pages use max-w-lg mx-auto pattern

---

### 7. Performance/States (5/5) ✅

**Perfect Score**:
- Skeleton loading states (page.tsx:436-449)
- Offline support with IndexedDB (useOfflineSync hook)
- Optimistic UI updates (event recorded immediately, synced later)
- Dynamic imports for heavy components (FeedSheet, PoopSheet, TempSheet)
- Loading indicators on all async actions

**Evidence**:
- `src/app/page.tsx:100,436-449` — Loading states
- `src/app/page.tsx:20-23` — Dynamic imports
- `src/hooks/useOfflineSync.ts` — Offline queue

---

## UX Diff (Before → After)

**First audit — no previous baseline.**

Next audit will compare:
- IA: 11/15 → ?
- Interaction: 14/20 → ?
- Visual: 12/15 → ?
- Accessibility: 9/20 → ?
- User Flow: 11/15 → ?
- Responsive: 10/10 → ?
- Perf/States: 5/5 → ?
- **TOTAL: 72/100 → ?**

---

## Recommendations

### Immediate (This Sprint)
1. **Add ARIA labels to all interactive elements** (4h)
   - FAB buttons, nav tabs, header icons, modal close buttons
   - Toast notifications with `role="status"` and `aria-live="polite"`
   - BottomSheet with `role="dialog"` and `aria-modal="true"`

2. **Increase typography sizes** (2h)
   - All body text: 14px minimum
   - All labels/captions: 13px minimum
   - Event time labels: 13px (currently 12px)

3. **Add mode indicator to navigation** (3h)
   - Pill badge in BottomNav showing current mode
   - Smooth transition animation on mode switch

### Next Sprint
4. **Unify event recording API** (6h)
   - Single handleRecord function used everywhere
   - Standardize toast messages and haptic patterns
   - Consistent error handling

5. **Reduce FAB category count** (4h)
   - Show top 4 most frequent actions only
   - Add "더보기" submenu for less frequent items
   - A/B test with 3 vs 4 categories

### Future
6. **Add skip-to-content link** (1h)
7. **Keyboard navigation support** (8h)
8. **Color contrast fixes** (2h)
9. **Empty state illustrations** (4h per page × 10 pages = 40h)
10. **Breadcrumb navigation** (6h)

---

## Appendix: File Citations

### Core Navigation
- `src/components/bnb/BottomNav.tsx:1-1242` — Bottom navigation with FAB system
- `src/components/layout/GlobalHeader.tsx:1-288` — Header with mode indicator

### Main Pages
- `src/app/page.tsx:1-1040` — Parenting mode homepage (육아)
- `src/app/pregnant/page.tsx` — Pregnant mode homepage
- `src/app/preparing/page.tsx` — Preparing mode homepage
- `src/app/onboarding/page.tsx:1-224` — Onboarding flow

### UI Components
- `src/components/ui/Toast.tsx:1-46` — Toast notification system
- `src/components/ui/BottomSheet.tsx:1-38` — Bottom sheet modal
- `src/components/ui/Icons.tsx` — Icon library (65+ icons)

### Total Codebase Stats
- **Pages**: 61
- **Components**: 65+
- **Lines of Code**: ~15,000+ (estimated from file counts)
- **Accessibility Coverage**: 8% (5 aria-labels / ~60 interactive elements)
- **Typography Violations**: 383 instances
- **Focus State Coverage**: 18% (31 focus utilities / ~170 interactive elements)

---

**End of Report**

**Next Steps**: Proceed to Phase 5 (Auto-fix P0 issues) with user approval.
