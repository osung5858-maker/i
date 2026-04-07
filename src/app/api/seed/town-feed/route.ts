/**
 * 동네 피드 더미 데이터 시드 API
 * POST /api/seed/town-feed
 * - service_role로 RLS 바이패스
 * - 실제 유저가 아닌 가상 user_id 사용
 * - 개발/데모 전용
 */
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 가상 유저 IDs (UUID v4 형식)
const FAKE_USERS = [
  { id: '00000000-aaaa-4000-a000-000000000001', name: '하늘맘' },
  { id: '00000000-aaaa-4000-a000-000000000002', name: '별빛파파' },
  { id: '00000000-aaaa-4000-a000-000000000003', name: '구름맘' },
  { id: '00000000-aaaa-4000-a000-000000000004', name: '달빛맘' },
  { id: '00000000-aaaa-4000-a000-000000000005', name: '바다파파' },
  { id: '00000000-aaaa-4000-a000-000000000006', name: '꽃잎맘' },
  { id: '00000000-aaaa-4000-a000-000000000007', name: '나무파파' },
  { id: '00000000-aaaa-4000-a000-000000000008', name: '햇살맘' },
  { id: '00000000-aaaa-4000-a000-000000000009', name: '은하맘' },
  { id: '00000000-aaaa-4000-a000-000000000010', name: '산들파파' },
  { id: '00000000-aaaa-4000-a000-000000000011', name: '보라맘' },
  { id: '00000000-aaaa-4000-a000-000000000012', name: '초록파파' },
  { id: '00000000-aaaa-4000-a000-000000000013', name: '노을맘' },
  { id: '00000000-aaaa-4000-a000-000000000014', name: '이슬맘' },
  { id: '00000000-aaaa-4000-a000-000000000015', name: '솔바람맘' },
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

  // === 두 번째 날 (어제) ===
  { content: '오늘 첫 수영 갔는데 아기가 물 무서워하지 않고 좋아해요! 아쿠아베이비 추천', hoursAgo: 25 },
  { content: '돌잔치 준비 시작했는데 뭐부터 해야 할지 모르겠어요. 돌잔치 체크리스트 있으신 분?', hoursAgo: 27 },
  { content: '비 오는 날 집콕이라 촉감놀이 했어요. 식용색소+밀가루 반죽 = 아기 폭주ㅋㅋ', hoursAgo: 29 },
  { content: '요즘 어린이집 적응기간인데 매일 문 앞에서 울어서 마음이 아파요ㅠ 적응 얼마나 걸렸어요?', hoursAgo: 31 },
  { content: '아기 신발 첫 구매! 뉴발란스 230 사이즈 사왔는데 너무 귀여워요 👟', hoursAgo: 33 },
  { content: '산후우울증이 올 줄 몰랐는데.. 요즘 자꾸 눈물이 나요. 상담 받아보려구요', hoursAgo: 35 },
  { content: '아기 물티슈 "그린핑거" 쓰시는 분? 성분이 괜찮은지 궁금해서요', hoursAgo: 37 },
  { content: '오늘 단풍구경 갔다가 아기 첫 낙엽 만져보는 사진 건졌어요📸 인생샷!', hoursAgo: 39 },

  // === 최근 (방금~몇분 전) ===
  { content: '점심에 뭐 먹을까 고민하다가 아기 남은 이유식 먹는 나.. 이게 육아인가ㅋㅋ', hoursAgo: 0.1 },
  { content: '아기가 고양이 보고 "냐냐" 하는데 심장이 녹아요 🐱💕', hoursAgo: 0.2 },
  { content: '다들 오늘도 힘내세요! 우리 아기들 건강하게 자라라~', hoursAgo: 0.3 },
  { content: '방금 아기 이유식 한 그릇 뚝딱! 오늘은 고구마+닭가슴살 조합 대성공 🎉', hoursAgo: 0.15 },

  // === 추가: 임신/출산 준비 ===
  { content: '임신 32주차인데 발이 너무 부어요ㅠ 부종에 좋은 음식 추천해주세요', hoursAgo: 6.2 },
  { content: '출산가방 싸는 중! 빠진 거 없는지 체크해주실 분?? 신생아복, 수유패드, 산모패드..', hoursAgo: 8.3 },
  { content: '태교 음악 틀어주면 아기가 발차기를 해요ㅋㅋ 클래식보다 동요에 더 반응하는 것 같아요', hoursAgo: 11.2 },
  { content: '양수검사 결과 정상! 기다리는 2주가 정말 길었어요.. 같은 마음이신 분들 파이팅💪', hoursAgo: 14.3 },

  // === 추가: 유아/걸음마 ===
  { content: '첫 걸음마!! 세 발자국 걷고 넘어졌는데 박수 치니까 다시 일어나서 걸어요ㅠㅠ', hoursAgo: 3.2 },
  { content: '18개월인데 두 단어 조합 시작했어요. "엄마 맘마" "아빠 가" ㅋㅋ 천재인가?!', hoursAgo: 7.8 },
  { content: '유아식으로 넘어갔는데 양념 어느 정도까지 괜찮을까요? 소금은 아직 안 넣고 있어요', hoursAgo: 12.1 },
  { content: '형아 언니들이 아기한테 장난감 빌려주는 거 보면 마음이 따뜻해져요 🥰', hoursAgo: 16.7 },
]

// 댓글 목록
const COMMENTS: { content: string }[] = [
  { content: '저도 같은 경험이에요! 화이팅💪' },
  { content: '공감이요ㅠㅠ' },
  { content: '저도 궁금했는데 감사해요!' },
  { content: '우와 축하해요!! 🎉' },
  { content: '저희 아기도 그랬어요~ 금방 적응해요!' },
  { content: '좋은 정보 감사합니다 ❤️' },
  { content: '맞아요 거기 진짜 좋아요!' },
  { content: '저도 추천해요~' },
  { content: '아이고 수고하셨어요 😊' },
  { content: '넘 귀여워요ㅠㅠ' },
  { content: '저도 써봤는데 괜찮더라구요!' },
  { content: '힘내세요!! 다 지나가요 🤗' },
  { content: '저도 같은 고민이에요ㅋㅋ' },
  { content: '오~ 가봐야겠어요' },
  { content: '저는 3개월쯤 적응했어요' },
  { content: '완전 공감ㅋㅋㅋ' },
  { content: '저도 그 시기가 제일 힘들었어요. 금방 나아져요!' },
  { content: '어머 저도 오늘 같은 경험!' },
  { content: '꿀팁 감사해요~ 바로 사러 가야겠어요' },
  { content: '우리 아기도 그랬는데 지금은 잘 먹어요 걱정마세요~' },
]

const EMOJIS = ['❤️', '😂', '👍', '😢', '🥰', '👶']

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function jitterLocation([lat, lng]: [number, number]): [number, number] {
  // ~500m 반경 내 랜덤 좌표 jitter
  const jitLat = lat + (Math.random() - 0.5) * 0.009
  const jitLng = lng + (Math.random() - 0.5) * 0.011
  return [jitLat, jitLng]
}

export async function POST(req: Request) {
  // 간단한 보안: 개발환경 또는 시크릿 키
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  if (process.env.NODE_ENV === 'production' && secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const errors: string[] = []

  // 1) 가상 유저를 auth.users에 생성 (고정 UUID 사용)
  const realUserIds: string[] = []
  const userIdToName: Record<string, string> = {}

  for (const u of FAKE_USERS) {
    const email = `seed-${u.id.slice(-4)}@dodam.seed`
    // 먼저 기존 유저 확인
    const { data: existing } = await admin.auth.admin.listUsers({ perPage: 50 })
    const found = existing?.users?.find(au => au.email === email)
    if (found) {
      realUserIds.push(found.id)
      userIdToName[found.id] = u.name
      continue
    }
    // 새로 생성
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: 'seed-dodam-2026!',
      email_confirm: true,
      user_metadata: { name: u.name, full_name: u.name },
    })
    if (created?.user) {
      realUserIds.push(created.user.id)
      userIdToName[created.user.id] = u.name
    } else if (error) {
      errors.push(`User ${u.name}: ${error.message}`)
    }
  }

  if (realUserIds.length === 0) {
    return NextResponse.json({ error: 'No seed users created', details: errors }, { status: 500 })
  }

  // 2) 기존 시드 데이터 정리 (시드 유저의 게시글만)
  await admin.from('town_feed').delete().in('user_id', realUserIds)

  // 3) 게시글 삽입
  const now = Date.now()
  const postRows = POSTS.map((p) => {
    const userIdx = randomInt(0, realUserIds.length - 1)
    const userId = realUserIds[userIdx]
    const userName = userIdToName[userId] || '익명'
    const [lat, lng] = jitterLocation(randomPick(LOCATIONS))
    const createdAt = new Date(now - p.hoursAgo * 3600000).toISOString()
    // expires_at: 게시글 생성 후 7일 (데모용으로 길게 설정)
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
    .select('id, user_id')

  if (postError) {
    return NextResponse.json({ error: 'Post insert failed', detail: postError.message }, { status: 500 })
  }

  // 4) 좋아요 시드 (각 게시글에 0~6개 랜덤 반응)
  const likeRows: { post_id: string; user_id: string; emoji: string }[] = []
  for (const post of (insertedPosts || [])) {
    const likeCount = randomInt(0, 6)
    const usedPairs = new Set<string>()
    for (let i = 0; i < likeCount; i++) {
      const likerId = randomPick(realUserIds)
      const emoji = randomPick(EMOJIS)
      const key = `${likerId}-${emoji}`
      if (usedPairs.has(key) || likerId === post.user_id) continue
      usedPairs.add(key)
      likeRows.push({ post_id: post.id, user_id: likerId, emoji })
    }
  }

  if (likeRows.length > 0) {
    const { error: likeError } = await admin.from('town_feed_likes').insert(likeRows)
    if (likeError) console.warn('Like insert warning:', likeError.message)
  }

  // 5) 댓글 시드 (각 게시글에 0~3개 랜덤 댓글)
  const commentRows: { post_id: string; user_id: string; content: string; created_at: string }[] = []
  for (const post of (insertedPosts || [])) {
    const commentCount = randomInt(0, 3)
    for (let i = 0; i < commentCount; i++) {
      const commenterId = randomPick(realUserIds.filter(id => id !== post.user_id))
      if (!commenterId) continue
      const comment = randomPick(COMMENTS)
      // 댓글은 원글보다 0.5~3시간 후
      const postRow = postRows.find(p => p.user_id === post.user_id)
      const baseTime = postRow ? new Date(postRow.created_at).getTime() : now
      const commentTime = new Date(baseTime + randomInt(30, 180) * 60000).toISOString()
      commentRows.push({
        post_id: post.id,
        user_id: commenterId,
        content: comment.content,
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
      users: realUserIds.length,
      posts: insertedPosts?.length || 0,
      likes: likeRows.length,
      comments: commentRows.length,
    },
  })
}
