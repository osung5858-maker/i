/**
 * 이벤트 관련 상수
 * 여러 컴포넌트에서 공통으로 사용하는 아이콘, 라벨 등
 */

/**
 * 이벤트 타입별 이모지 아이콘
 */
export const EVENT_ICON_MAP: Record<string, string> = {
  // 육아 모드
  feed: '🍼',
  sleep: '😴',
  poop: '💩',
  pee: '💧',
  temp: '🌡️',
  memo: '📝',
  bath: '🛁',
  pump: '🤱',
  babyfood: '🥣',
  snack: '🍪',
  toddler_meal: '🍱',
  medication: '💊',

  // 임신 모드
  preg_kick: '👶',
  preg_mood: '💭',
  preg_symptom: '🤰',
  preg_checkup: '🏥',
  preg_weight: '⚖️',
  preg_bp: '🩺',
  preg_glucose: '🩸',

  // 임신 준비 모드
  prep_mood: '💭',
  prep_walk: '🚶',
  prep_stretch: '🧘',
  prep_yoga: '🧘‍♀️',
  prep_folic: '💊',
  prep_iron: '💊',
  prep_vitd: '☀️',
  prep_omega: '🐟',
  prep_journal: '📔',
}

/**
 * 이벤트 타입별 한글 라벨
 */
export const EVENT_LABELS: Record<string, string> = {
  // 육아 모드
  feed: '수유',
  sleep: '수면',
  poop: '배변',
  pee: '소변',
  temp: '체온',
  memo: '메모',
  bath: '목욕',
  pump: '유축',
  babyfood: '이유식',
  snack: '간식',
  toddler_meal: '유아식',
  medication: '투약',

  // 임신 모드
  preg_kick: '태동',
  preg_mood: '기분',
  preg_symptom: '증상',
  preg_checkup: '검진',
  preg_weight: '몸무게',
  preg_bp: '혈압',
  preg_glucose: '혈당',

  // 임신 준비 모드
  prep_mood: '기분',
  prep_walk: '걷기',
  prep_stretch: '스트레칭',
  prep_yoga: '요가',
  prep_folic: '엽산',
  prep_iron: '철분',
  prep_vitd: '비타민D',
  prep_omega: '오메가3',
  prep_journal: '기다림 일기',
}

/**
 * 이유식 서브타입 라벨
 */
export const BABYFOOD_LABELS: Record<string, string> = {
  rice: '쌀미음',
  veggie: '야채죽',
  meat: '고기죽',
  fruit: '과일',
  etc: '기타',
}

/**
 * 수면 타입 라벨
 */
export const SLEEP_TYPE_LABELS: Record<string, string> = {
  night: '밤잠',
  nap: '낮잠',
}

/**
 * 배변 상태 라벨
 */
export const POOP_STATUS_LABELS: Record<string, string> = {
  normal: '정상',
  soft: '묽음',
  hard: '단단함',
  none: '없음',
}

/**
 * 기분 타입 라벨
 */
export const MOOD_LABELS: Record<string, string> = {
  happy: '행복',
  excited: '신남',
  calm: '평온',
  tired: '피곤',
  anxious: '불안',
}
