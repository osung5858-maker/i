/**
 * 동네 피드 더미 데이터 시드 API
 * POST /api/seed/town-feed
 * - 현재 로그인된 유저의 ID를 기반으로 다양한 user_name으로 게시글 삽입
 * - service_role로 RLS 바이패스
 * - 개발/데모 전용
 */
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 가상 닉네임 목록
const NICKNAMES = [
  '하늘맘', '별빛파파', '구름맘', '달빛맘', '바다파파',
  '꽃잎맘', '나무파파', '햇살맘', '은하맘', '산들파파',
  '보라맘', '초록파파', '노을맘', '이슬맘', '솔바람맘',
  '미소맘', '도담파파', '새벽맘', '무지개맘', '소나기파파',
]

// 서울/수도권 위치 (lat, lng)
const LOCATIONS: [number, number][] = [
  [37.5665, 126.9780],  // 서울 시청
  [37.5172, 127.0473],  // 강남
  [37.5563, 126.9236],  // 마포
  [37.5407, 127.0699],  // 성동
  [37.4979, 127.0276],  // 서초
  [37.5283, 126.9290],  // 용산
  [37.5838, 127.0012],  // 종로
  [37.5048, 127.1150],  // 송파
  [37.5173, 126.9016],  // 영등포
  [37.5939, 127.0175],  // 성북
  [37.4813, 126.9527],  // 관악
  [37.5269, 127.0365],  // 한남
  [37.5570, 127.0808],  // 중랑
  [37.6132, 127.0309],  // 노원
  [37.4739, 127.0394],  // 양재
]

// 현실적인 동네 피드 게시글들
const POSTS: { content: string; hoursAgo: number }[] = [
  // === 육아 일상 ===
  { content: '아기가 드디어 첫 뒤집기 성공했어요!! 5개월 만에ㅠㅠ 감동이에요 🥹', hoursAgo: 0.5 },
  { content: '오늘 날씨 진짜 좋다~ 유모차 끌고 공원 산책 중인데 벚꽃이 아직 남아있네요 🌸', hoursAgo: 1 },
  { content: '이유식 시작했는데 쌀미음 한숟갈 먹고 울어버림.. 적응하는데 얼마나 걸렸어요?', hoursAgo: 1.5 },
  { content: '밤새 3번 깨서 먹이고 이제 막 잠든 아가.. 나도 좀 자자 🥱', hoursAgo: 2 },
  { content: '100일 사진 찍으러 가는데 추천 스튜디오 있나요? 강남 쪽이면 좋겠어요', hoursAgo: 2.5 },
  { content: '둘째 36주차인데 첫째가 계속 안아달래서 허리가 끊어질 것 같아요ㅠ 둘째맘들 어떻게 버티셨어요?', hoursAgo: 3 },
  { content: '드디어 7개월 아기 앉기 성공! 흔들흔들하면서도 혼자 앉아있는 모습이 너무 귀여워요 😍', hoursAgo: 3.5 },
  { content: '오늘 예방접종 맞고 왔는데 열이 38도까지 올라서 걱정이에요.. 해열제 먹여야 하나요?', hoursAgo: 4 },
  { content: '남편이 오늘 첫 목욕 시켰는데 아기가 울다가 자기도 울었어요ㅋㅋㅋ 영상 찍어둘걸', hoursAgo: 4.5 },
  { content: '아기 첫 이빨 났어요! 아래 앞니 하나~ 이갈이 시작인가봐요 🦷', hoursAgo: 5 },

  // === 동네 정보 ===
  { content: '마포구 성산동 "작은숲 소아과" 진짜 추천이에요. 원장님 꼼꼼하시고 대기시간도 짧아요', hoursAgo: 5.5 },
  { content: '용산 아이파크몰 키즈카페 리뉴얼했는데 넓어졌어요! 주중에 가면 한적해서 좋아요', hoursAgo: 6 },
  { content: '강남역 근처 기저귀 싸게 파는 곳 아시는 분? 하기스 4단계 찾고 있어요', hoursAgo: 6.5 },
  { content: '서초구 반포에 새로 생긴 실내 놀이터 가봤는데 0~2세 전용 공간이 있어서 안전하더라구요', hoursAgo: 7 },
  { content: '송파 올림픽공원 옆에 있는 맘카페 알려드려요! "리틀포레스트" 수유실도 있고 메뉴도 괜찮아요', hoursAgo: 7.5 },
  { content: '혹시 성동구 쪽에 산후조리원 추천 있으신가요? 11월 출산 예정인데 미리 알아보려구요', hoursAgo: 8 },
  { content: '관악구 봉천동 어린이도서관 프로그램이 진짜 잘되어 있어요. 매주 화요일 영유아 스토리텔링 강추!', hoursAgo: 8.5 },
  { content: '영등포 타임스퀘어 B2에 유아 놀이존 있는 거 아셨나요? 무료인데 괜찮아요', hoursAgo: 9 },
  { content: '혹시 서울숲 근처 유모차 접근 좋은 카페 아시나요? 수유실 있으면 금상첨화!', hoursAgo: 9.5 },
  { content: '노원구 맘들~ 하계역 근처 "꼬마의사" 소아과 어떤가요? 후기 궁금해요', hoursAgo: 10 },

  // === 육아 꿀팁 ===
  { content: '이유식 큐브 만들 때 실리콘 틀이 아이스트레이보다 훨씬 편해요! 다이소에 2천원에 팔아요', hoursAgo: 10.5 },
  { content: '모유수유 중인데 유두보호기 메델라꺼 진짜 좋아요. 초반에 아프신 분들 꼭 써보세요', hoursAgo: 11 },
  { content: '기저귀 발진에 "디시틴" 크림이 최고에요. 바르고 하루만에 좋아졌어요', hoursAgo: 11.5 },
  { content: '낮잠 재울 때 화이트노이즈 앱 쓰시는 분? 추천 앱 있으면 알려주세요~', hoursAgo: 12 },
  { content: '아기 손톱 자르기가 전쟁인데.. 잘 때 자르는 게 제일 나은 것 같아요. 전용 가위 쓰세요!', hoursAgo: 12.5 },
  { content: '12개월 아기 간식으로 떡뻥 말고 뭐가 좋을까요? 자꾸 떡뻥만 찾아서ㅠ', hoursAgo: 13 },
  { content: '외출할 때 기저귀가방 정리팁! 지퍼백으로 분류하면 한 손으로도 꺼내기 편해요 👍', hoursAgo: 13.5 },
  { content: '아기 빨래 세제 "아토세이프" 쓰시는 분? 피부 트러블 없는지 궁금해요', hoursAgo: 14 },
  { content: '젖병 소독기 vs 삶는 거 어떤 게 나을까요? 지금 매번 삶고 있는데 너무 귀찮아요', hoursAgo: 14.5 },
  { content: '9개월 아기인데 아직 배밀이만 해요. 기어다니는 건 언제쯤 할까요? 다른 아기들 보면 조급해져요', hoursAgo: 15 },

  // === 감정 공유 / 일상 ===
  { content: '오늘 아기가 처음으로 "맘마" 했어요.. 감동받아서 눈물 났어요ㅠㅠ❤️', hoursAgo: 15.5 },
  { content: '육아 번아웃 왔나봐요.. 아기 낮잠 자는 동안 멍때리고 있네요. 다들 어떻게 리프레시 하세요?', hoursAgo: 16 },
  { content: '시어머니가 아기 이유식 만들어 오셨는데 간이 좀 세서 어떻게 말씀드려야 할지ㅠ', hoursAgo: 16.5 },
  { content: '남편 육아휴직 3개월차인데 아기랑 찰떡이 됐어요ㅋㅋ 이제 나보다 아기가 아빠 찾아요', hoursAgo: 17 },
  { content: '새벽 4시에 이 글 쓰는 중.. 아기 코감기 걸려서 밤새 킁킁거려요. 코흡입기 쓸까 말까 고민', hoursAgo: 17.5 },
  { content: '오늘 아기 데리고 처음으로 외식했는데 의외로 잘 앉아있었어요! 성장했구나 싶어서 뿌듯 😊', hoursAgo: 18 },
  { content: '출산 후 머리가 너무 빠져서 걱정이에요.. 산후 탈모 언제 멈추나요?', hoursAgo: 18.5 },
  { content: '동네 맘카페 모임 첫 참석했는데 다들 친절해서 좋았어요. 동네 맘친구 생겼으면 좋겠다!', hoursAgo: 19 },
  { content: '쌍둥이 엄마인데 하루가 전쟁이에요.. 같은 쌍둥이맘 계시면 위로 한마디만ㅠ', hoursAgo: 19.5 },
  { content: '3개월째 야간수유 중인데 남편이 알아서 분유 만들어놓고 자더라구요. 감동🥺', hoursAgo: 20 },

  // === 건강 / 발달 ===
  { content: '소아과에서 성장발달 검사 받았는데 모든 항목 정상이래요! 걱정했는데 다행이에요', hoursAgo: 20.5 },
  { content: '아기가 자꾸 귀를 만져서 중이염인가 했는데, 그냥 귀 발견한 거래요ㅋㅋ', hoursAgo: 21 },
  { content: '6개월 영유아 검진 다녀왔어요. 키 68cm 몸무게 8.2kg으로 50%타일이래요', hoursAgo: 21.5 },
  { content: 'BCG 접종 자리가 빨갛게 부어올랐는데 정상인가요? 걱정되네요', hoursAgo: 22 },
  { content: '아기 아토피 때문에 보습제 하루에 세 번 바르고 있어요. 세타필 베이비 좋더라구요', hoursAgo: 22.5 },
  { content: '11개월인데 아직 이유식 잘 안 먹어요.. BLW로 바꿔볼까 고민 중이에요', hoursAgo: 23 },

  // === 과거 게시글 (1~3일 전) ===
  { content: '오늘 첫 수영 갔는데 아기가 물 무서워하지 않고 좋아해요! 아쿠아베이비 추천', hoursAgo: 25 },
  { content: '돌잔치 준비 시작했는데 뭐부터 해야 할지 모르겠어요. 돌잔치 체크리스트 있으신 분?', hoursAgo: 27 },
  { content: '비 오는 날 집콕이라 촉감놀이 했어요. 식용색소+밀가루 반죽 = 아기 폭주ㅋㅋ', hoursAgo: 29 },
  { content: '요즘 어린이집 적응기간인데 매일 문 앞에서 울어서 마음이 아파요ㅠ 적응 얼마나 걸렸어요?', hoursAgo: 31 },
  { content: '아기 신발 첫 구매! 뉴발란스 230 사이즈 사왔는데 너무 귀여워요 👟', hoursAgo: 33 },
  { content: '산후우울증이 올 줄 몰랐는데.. 요즘 자꾸 눈물이 나요. 상담 받아보려구요', hoursAgo: 35 },
  { content: '아기 물티슈 "그린핑거" 쓰시는 분? 성분이 괜찮은지 궁금해서요', hoursAgo: 37 },
  { content: '단풍구경 갔다가 아기 첫 낙엽 만져보는 사진 건졌어요📸 인생샷!', hoursAgo: 39 },
  { content: '백일상 직접 차려봤는데 생각보다 재미있었어요! 떡은 동네 떡집에서 주문했어요', hoursAgo: 42 },
  { content: '아기랑 첫 비행기 탔는데 의외로 잘 잤어요! 이착륙 때 수유하니까 귀 안 아픈 듯', hoursAgo: 48 },
  { content: '오늘 문화센터 원데이 클래스 갔는데 아기가 처음으로 물감 만졌어요ㅋㅋ 난리', hoursAgo: 52 },
  { content: '아기띠 에르고 vs 코니 비교해보신 분? 여름에는 뭐가 더 시원할까요', hoursAgo: 56 },

  // === 최근 (방금~몇분 전) ===
  { content: '점심에 뭐 먹을까 고민하다가 아기 남은 이유식 먹는 나.. 이게 육아인가ㅋㅋ', hoursAgo: 0.1 },
  { content: '아기가 고양이 보고 "냐냐" 하는데 심장이 녹아요 🐱💕', hoursAgo: 0.2 },
  { content: '다들 오늘도 힘내세요! 우리 아기들 건강하게 자라라~', hoursAgo: 0.3 },
  { content: '방금 아기 이유식 한 그릇 뚝딱! 오늘은 고구마+닭가슴살 조합 대성공 🎉', hoursAgo: 0.15 },

  // === 임신/출산 준비 ===
  { content: '임신 32주차인데 발이 너무 부어요ㅠ 부종에 좋은 음식 추천해주세요', hoursAgo: 6.2 },
  { content: '출산가방 싸는 중! 빠진 거 없는지 체크해주실 분?? 신생아복, 수유패드, 산모패드..', hoursAgo: 8.3 },
  { content: '태교 음악 틀어주면 아기가 발차기를 해요ㅋㅋ 클래식보다 동요에 더 반응하는 것 같아요', hoursAgo: 11.2 },
  { content: '양수검사 결과 정상! 기다리는 2주가 정말 길었어요.. 같은 마음이신 분들 파이팅💪', hoursAgo: 14.3 },

  // === 유아/걸음마 ===
  { content: '첫 걸음마!! 세 발자국 걷고 넘어졌는데 박수 치니까 다시 일어나서 걸어요ㅠㅠ', hoursAgo: 3.2 },
  { content: '18개월인데 두 단어 조합 시작했어요. "엄마 맘마" "아빠 가" ㅋㅋ 천재인가?!', hoursAgo: 7.8 },
  { content: '유아식으로 넘어갔는데 양념 어느 정도까지 괜찮을까요? 소금은 아직 안 넣고 있어요', hoursAgo: 12.1 },
  { content: '형아 언니들이 아기한테 장난감 빌려주는 거 보면 마음이 따뜻해져요 🥰', hoursAgo: 16.7 },

  // === 추가 일상 ===
  { content: '오늘 아기 이유식 거부라서 급하게 바나나 갈아줬더니 세 그릇 먹음ㅋㅋ 바나나 전도사', hoursAgo: 1.8 },
  { content: '신생아때 사진 보다가 혼자 울었어요.. 벌써 이렇게 컸다니 ㅠㅠ', hoursAgo: 4.7 },
  { content: '아기 잠투정이 심해서 안아서 재우다가 나도 같이 잠들었어요 ㅋㅋ 팔 저림', hoursAgo: 8.1 },
  { content: '오늘 소아과 갔는데 키가 많이 컸대요!! 하위 10%에서 50%로 올라왔어요 축하해주세요🎊', hoursAgo: 11.8 },
  { content: '아기 옷 정리하다 신생아 때 입던 바디슈트 발견.. 이걸 입었다고?? 너무 작아ㅋㅋ', hoursAgo: 15.2 },
  { content: '주말에 아기 데리고 북카페 가려는데 영유아 환영하는 곳 아시나요?', hoursAgo: 19.3 },
  { content: '오늘 아기가 혼자 숟가락 들고 먹으려고 도전! 온 얼굴에 이유식 범벅ㅋㅋ', hoursAgo: 22.7 },
  { content: '밤중수유 끊은 지 3일째.. 울음소리에 마음이 아프지만 버티는 중이에요', hoursAgo: 26.5 },
  { content: '동네 놀이터에서 또래 아기 만났는데 엄마끼리 번호 교환했어요! 맘친구 생겼다 😆', hoursAgo: 30.8 },
  { content: '아기 두 돌 파티 어떻게 하셨어요? 집에서 소규모로 할까 키즈카페 대관할까 고민', hoursAgo: 44.2 },
]

// 댓글 목록
const COMMENTS: string[] = [
  '저도 같은 경험이에요! 화이팅💪',
  '공감이요ㅠㅠ',
  '저도 궁금했는데 감사해요!',
  '우와 축하해요!! 🎉',
  '저희 아기도 그랬어요~ 금방 적응해요!',
  '좋은 정보 감사합니다 ❤️',
  '맞아요 거기 진짜 좋아요!',
  '저도 추천해요~',
  '아이고 수고하셨어요 😊',
  '넘 귀여워요ㅠㅠ',
  '저도 써봤는데 괜찮더라구요!',
  '힘내세요!! 다 지나가요 🤗',
  '저도 같은 고민이에요ㅋㅋ',
  '오~ 가봐야겠어요',
  '저는 3개월쯤 적응했어요',
  '완전 공감ㅋㅋㅋ',
  '저도 그 시기가 제일 힘들었어요. 금방 나아져요!',
  '어머 저도 오늘 같은 경험!',
  '꿀팁 감사해요~ 바로 사러 가야겠어요',
  '우리 아기도 그랬는데 지금은 잘 먹어요 걱정마세요~',
  '정보 저장합니다📌',
  '와 대박ㅋㅋㅋ',
  '너무 공감돼요 ㅠㅠ',
  '저도 알려주세요!',
  '응원합니다! 💕',
]

const EMOJIS = ['❤️', '😂', '👍', '😢', '🥰', '👶']

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function jitterLocation([lat, lng]: [number, number]): [number, number] {
  const jitLat = lat + (Math.random() - 0.5) * 0.009
  const jitLng = lng + (Math.random() - 0.5) * 0.011
  return [jitLat, jitLng]
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  if (process.env.NODE_ENV === 'production' && secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  // 현재 로그인 유저 확인 (없으면 첫번째 유저 사용)
  let userId: string | null = null
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id || null
  } catch { /* no session */ }

  // 세션 없으면 첫번째 auth 유저 사용 (개발용)
  if (!userId) {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1 })
    userId = data?.users?.[0]?.id || null
  }
  if (!userId) {
    return NextResponse.json({ error: 'No users found' }, { status: 400 })
  }

  // 기존 시드 데이터 정리 (이 유저의 게시글 중 seed 마커가 있는 것들)
  // user_name이 NICKNAMES에 포함된 게시글만 삭제
  for (const nick of NICKNAMES) {
    await admin.from('town_feed').delete().eq('user_id', userId).eq('user_name', nick)
  }

  // 게시글 삽입
  const now = Date.now()
  const postRows = POSTS.map((p, i) => {
    const userName = NICKNAMES[i % NICKNAMES.length]
    const [lat, lng] = jitterLocation(randomPick(LOCATIONS))
    const createdAt = new Date(now - p.hoursAgo * 3600000).toISOString()
    // expires_at: 게시 후 7일 (데모용으로 길게)
    const expiresAt = new Date(now - p.hoursAgo * 3600000 + 7 * 24 * 3600000).toISOString()
    return {
      user_id: userId,
      user_name: userName,
      content: p.content,
      lat,
      lng,
      range_meters: randomPick([1000, 2000, 3000, 5000]),
      created_at: createdAt,
      expires_at: expiresAt,
    }
  })

  const { data: insertedPosts, error: postError } = await admin
    .from('town_feed')
    .insert(postRows)
    .select('id')

  if (postError) {
    return NextResponse.json({ error: 'Post insert failed', detail: postError.message }, { status: 500 })
  }

  const postIds = (insertedPosts || []).map(p => p.id)

  // 좋아요 시드 (각 게시글에 1~4개 랜덤 반응, 전부 같은 유저이지만 다른 이모지)
  const likeRows: { post_id: string; user_id: string; emoji: string }[] = []
  for (const postId of postIds) {
    const likeCount = randomInt(1, 4)
    const usedEmojis = new Set<string>()
    for (let i = 0; i < likeCount; i++) {
      const emoji = randomPick(EMOJIS)
      if (usedEmojis.has(emoji)) continue
      usedEmojis.add(emoji)
      likeRows.push({ post_id: postId, user_id: userId, emoji })
    }
  }

  if (likeRows.length > 0) {
    const { error: likeError } = await admin.from('town_feed_likes').insert(likeRows)
    if (likeError) console.warn('Like insert warning:', likeError.message)
  }

  // 댓글 시드 (게시글 중 40%에 1~3개 댓글)
  const commentRows: { post_id: string; user_id: string; content: string; created_at: string }[] = []
  for (let i = 0; i < postIds.length; i++) {
    if (Math.random() > 0.4) continue
    const commentCount = randomInt(1, 3)
    for (let j = 0; j < commentCount; j++) {
      const comment = randomPick(COMMENTS)
      const postCreatedAt = new Date(postRows[i].created_at).getTime()
      const commentTime = new Date(postCreatedAt + randomInt(5, 120) * 60000).toISOString()
      commentRows.push({
        post_id: postIds[i],
        user_id: userId,
        content: comment,
        created_at: commentTime,
      })
    }
  }

  if (commentRows.length > 0) {
    const { error: commentError } = await admin.from('town_feed_comments').insert(commentRows)
    if (commentError) console.warn('Comment insert warning:', commentError.message)
  }

  return NextResponse.json({
    success: true,
    stats: {
      posts: postIds.length,
      likes: likeRows.length,
      comments: commentRows.length,
    },
  })
}
