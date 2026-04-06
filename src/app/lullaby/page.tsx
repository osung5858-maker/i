'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MoonIcon } from '@/components/ui/Icons'

type Category = 'lullaby' | 'nursery' | 'nature' | 'whitenoise'

interface Track {
  id: string
  title: string
  category: Category
  duration: string
  youtubeId?: string
  playlistId?: string
  avgSleepMin?: number
  isRecommended?: boolean
}

const LULLABY_PLAYLIST = 'PLAyG7B7am9daqQ9u267CZoOIJzihXIYTA'
const NURSERY_PLAYLIST = 'PLAyG7B7am9dZ90gGtuco9wzMj_kdkUlMD'

// 자장가 58곡 (도하 Sleep Series - 개별 YouTube ID 매핑)
const LULLABY_TRACKS: Track[] = [
  // ── Group 1 (28개) ──
  { id: 'l1', title: '아기 수면 음악 - 빗소리 창문', youtubeId: '38MBgTBMM7E', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST, isRecommended: true },
  { id: 'l2', title: '아기 수면 소리 - 캠프파이어', youtubeId: '33UCCtUed1s', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST, isRecommended: true },
  { id: 'l3', title: '아기 빗소리 수면 음악 - 창문', youtubeId: 'ySVoGP-hwjw', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST, isRecommended: true },
  { id: 'l4', title: '아기 수면 음악 - 저녁 산책', youtubeId: 'xbS12xW9Psk', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l5', title: '아기 수면 음악 - Doha Sleep', youtubeId: '_q2ByIhN_co', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l6', title: '아기 수면 음악 - 자동차 빗소리', youtubeId: 'o1fBxS3d0AQ', category: 'lullaby', duration: '3:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l7', title: '아기 빗소리 수면 - 자동차 창문', youtubeId: '1HR5HS_nDYU', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l8', title: '아기 수면 허밍 - Calm Humming', youtubeId: 'f4-Jrp0vIuc', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l9', title: '아기 허밍 수면 음악 - Gentle', youtubeId: 'x8S5y3mhWcM', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l10', title: '달소리 수면 음악 - 바다 밤', youtubeId: 'uojpN5BD9vc', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l11', title: '아기 빗소리 수면 음악 - 바다', youtubeId: 'doozvKXbqZ4', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l12', title: '블랙스크린 수면 - Monthly Collection', youtubeId: 'eJjr8Eapfj8', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l13', title: '깊은 수면 음악 - Monthly Collection', youtubeId: 'Ef3oooFrJqc', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l14', title: '깊은 밤 수면 음악 - Long Ambient', youtubeId: 'oPSuFy0UJuM', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l15', title: '숲속 수면 음악 - Forest & River', youtubeId: '9nzwBnyVQ0E', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l16', title: '수면 음악 - Moon and Stars', youtubeId: '8k969yNqpD8', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l17', title: '수면 음악 - Moving Clouds', youtubeId: '2vlmecUiNiA', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l18', title: '봄 빗소리 수면 - Spring Rain', youtubeId: 'Kklr51xXd4A', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l19', title: '숲의 조용한 밤소리', youtubeId: 'oIEwLM7iM0o', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l20', title: '잔잔한 바다 물결 수면 - 432Hz', youtubeId: 'VyoGczIJC4Q', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l21', title: '밤하늘 별빛 수면 - 432Hz', youtubeId: '670Mb9wKC68', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l22', title: '떨어지는 조용한 빗소리', youtubeId: 'sMN9ajwo3R4', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l23', title: '구름 위를 걷는 수면 음악', youtubeId: 'OvAlOmtN7M8', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l24', title: '잔잔한 바다의 수면 음악', youtubeId: 'qmmRK843nXE', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l25', title: '달빛 수면 음악 - Moonlight', youtubeId: 'VOFTq6sQMOI', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l26', title: '바다 수면 사운드 I', youtubeId: 'k-c87G6Dihw', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l27', title: '바다 수면 사운드 II', youtubeId: '__HZc9b6mcM', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l28', title: '꿈나라 수면 사운드 - Dreamland', youtubeId: 't-2ajQ5sbdA', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  // ── Group 2 (9개) ──
  { id: 'l29', title: '잔잔한 바다 - Ocean Drift', youtubeId: 'i69opFYv8BM', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l30', title: '잔잔한 바다 - Ocean Drift II', youtubeId: 'tbWwVOVxqCQ', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l31', title: '구름 수면 - Cloud Drift', youtubeId: 'PsxkAYlCCQs', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l32', title: '꿈나라 수면 - Sleep #27', youtubeId: '4UlBhe9S0z8', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l33', title: '구름 수면 - Sleep #26', youtubeId: '9YkZxgGSXGo', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l34', title: '자연 숲 수면 - Sleep #25', youtubeId: 'c6P_U703-rs', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l35', title: '바다 브리즈 수면 - Sleep #24', youtubeId: '3Boj46u0NVI', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l36', title: '밤하늘 수면 - Sleep #23', youtubeId: 'YyvL-Ttlob0', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l37', title: '밤하늘 수면 - Sleep #22', youtubeId: 'UKrOwiHYTS4', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  // ── 통합본 (3개) ──
  { id: 'l38', title: '[연속]숲 수면 4시간 통합본', youtubeId: 'GgodfVK2F_4', category: 'lullaby', duration: '4:00:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l39', title: '[연속]별빛 수면 2시간+ 통합본', youtubeId: 'UTgM6VPpiUo', category: 'lullaby', duration: '2:30:37', playlistId: LULLABY_PLAYLIST },
  { id: 'l40', title: '[연속]별빛 수면 2시간+ 통합본 II', youtubeId: 'k2Wp0cTlPdY', category: 'lullaby', duration: '2:30:37', playlistId: LULLABY_PLAYLIST },
  // ── Group 3 (18개) ──
  { id: 'l41', title: '바다 수면 - Sleep #20', youtubeId: '8uFbotz_pU0', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l42', title: '숲 수면 - Sleep #19', youtubeId: 'vsl3FdhmWqw', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l43', title: '바다 수면 - Sleep #18', youtubeId: 'qSmlWxGZMsY', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l44', title: '3분 꿀잠 - 구름 Sleep #16', youtubeId: 'bDdSYN0tl88', category: 'lullaby', duration: '3:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l45', title: '3분 꿀잠 - 백색소음 Sleep #15', youtubeId: 'aGefUvzcyIU', category: 'lullaby', duration: '3:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l46', title: '3분 꿀잠 - 신생아 Sleep #14', youtubeId: 'gwEZfv4uC0U', category: 'lullaby', duration: '3:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l47', title: '파도 소리 통잠 - Sleep #13', youtubeId: 'XkkPHTEsfgs', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l48', title: '밤하늘 피아노 자장가 - Sleep #12', youtubeId: 'inD43hSwrcg', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l49', title: '숲속 빗소리 새소리 - Sleep #11', youtubeId: 'n34LdBx5XXw', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l50', title: '[LIVE]3분 꿀잠 수면음악 - Sleep #10', youtubeId: 'JafQEfCimyE', category: 'lullaby', duration: '3:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l51', title: '꿈나라 피아노 자장가 - Sleep #9', youtubeId: 'Qt3agLM_194', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l52', title: '신생아 수면교육 자장가 - Sleep #8', youtubeId: 'eBAPAfUC8Vc', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l53', title: '[LIVE]3분 마법의 소리 - Sleep #7', youtubeId: '2pKf6v-xDj0', category: 'lullaby', duration: '3:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l54', title: '편안한 숲속 소리 - Sleep #6', youtubeId: 'nIaHttJUUk8', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l55', title: '엄마 뱃속 파도 소리 - Sleep #5', youtubeId: 'm6eTbG7ZjaU', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l56', title: '[LIVE]화면 꺼진 수면 - Sleep #4', youtubeId: 'S8Dv2W9XNF0', category: 'lullaby', duration: '3:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l57', title: '숲소리 물소리 자연 ASMR - Sleep #3', youtubeId: 'XxEWnfAmdGk', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
  { id: 'l58', title: '우리 아이 꿀잠 음악 - Sleep #2', youtubeId: 'kJ3Bg0CwKP4', category: 'lullaby', duration: '5:00', playlistId: LULLABY_PLAYLIST },
]

// 동요 57곡 (도하 - 개별 YouTube ID 매핑)
const NURSERY_TRACKS: Track[] = [
  // ── 통합본 (2개) ──
  { id: 'n1', title: '[연속]블랙스크린 연속재생', youtubeId: 'ecaKInVnqR0', category: 'nursery', duration: '1:08:23', playlistId: NURSERY_PLAYLIST, isRecommended: true },
  { id: 'n2', title: '[연속]20곡 연속재생 (18~24M)', youtubeId: 'Pq3j_Oh5yS8', category: 'nursery', duration: '57:07', playlistId: NURSERY_PLAYLIST, isRecommended: true },
  // ── 컴필레이션 (2개) ──
  { id: 'n3', title: '아이 동물 20-21 컴필레이션', youtubeId: 'VBx8iRUh64w', category: 'nursery', duration: '3:00', playlistId: NURSERY_PLAYLIST, isRecommended: true },
  { id: 'n4', title: '아이 동물 20개 연속재생', youtubeId: 'wMSnHATVLmI', category: 'nursery', duration: '3:00', playlistId: NURSERY_PLAYLIST },
  // ── 개별 (53개) ──
  { id: 'n5', title: '여우 행동', youtubeId: 'd4OaQZtHMF0', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n6', title: '바나나 냠냠', youtubeId: 'I6iJ9c3B5ao', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n7', title: '딸기 냠냠', youtubeId: '81HiWf8FMEQ', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n8', title: '오리 퐁당퐁당', youtubeId: 'rYTqCNI4guE', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n9', title: '카피 로봇', youtubeId: 'njll7ce2Bv4', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n10', title: '베베 자동차', youtubeId: 'QkpKrTnnR6A', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n11', title: '탱글 강아지', youtubeId: 'L85QtMhobJ4', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n12', title: '부릉부릉 자동차', youtubeId: 'ADWYF64UywM', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n13', title: '특득 토끼 손놀이', youtubeId: 'hXdrZ5f51xI', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n14', title: '까까 해요 토끼', youtubeId: 'ube-q576EyE', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n15', title: '경찰차', youtubeId: 'XxYh5VbcbCg', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n16', title: '오늘 하루', youtubeId: 'R_CfWKdBz54', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n17', title: '장난감 정리', youtubeId: 'wy4gY3PCiIs', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n18', title: '달과 별', youtubeId: 'mkECm0PF7GE', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n19', title: '조용한 동물', youtubeId: 'C2wZ8TWyIaM', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n20', title: '손 닦기', youtubeId: 'HRIUerKh47M', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n21', title: '날씨 친구와 놀아요', youtubeId: '5i0MsxtEKeQ', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n22', title: '빠라라라 소방차', youtubeId: 'd7mLG3aNH2A', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n23', title: '칙칙폭폭 기차 숫자', youtubeId: 'Reara6ii8Kg', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n24', title: '손놀이 숫자', youtubeId: 'W5JoK4QxYEA', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n25', title: '알록달록 색깔 나라', youtubeId: 'Gkpk03StgU0', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n26', title: '숫자 세기 1부터 10까지', youtubeId: 'z1_bRUJzpKg', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n27', title: '딸기 숫자 놀이', youtubeId: 'ptMd6tnIwd0', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n28', title: '색깔 배우기', youtubeId: 'fLGp7g7LLn4', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n29', title: '몸 움직여 놀아요', youtubeId: 'IwtQ90FEbDk', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n30', title: '숫자 노래 1부터 10까지', youtubeId: 'eENmAptfxTg', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n31', title: '색깔 이야기', youtubeId: 'Ei-syv0ZQP8', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n32', title: '동물 친구들을 찾아', youtubeId: 'IVLfdaSjglg', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n33', title: '숫자 노래 1부터 10까지 II', youtubeId: 'eQZGTv79XVg', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n34', title: '따라 움직이는 하루 놀이', youtubeId: 'mEyI3VYhevs', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n35', title: '동물 친구', youtubeId: '6tSEO2yrw8E', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n36', title: '알록달록 색깔 놀이 - #24', youtubeId: 'il3e_Mdr__Y', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n37', title: '핵핵 박수 리듬 - #23', youtubeId: 'vNCQbTt9RWU', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n38', title: '쿵둔쿵쿵 동물 움직임 - #22', youtubeId: 'WfrwqVt9aRY', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n39', title: '숫자 체험 - #21', youtubeId: 'l4lLwKU_77M', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n40', title: '동물 친구들 - #20', youtubeId: '1PCoBnE5c7k', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n41', title: '알록달록 색깔 인지 - #19', youtubeId: '2lftUIB8V7o', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n42', title: '쿵둔쿵둔 동물 움직임 - #18', youtubeId: 'SIIKL_w-Ows', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n43', title: '색깔 배우기 - #17', youtubeId: '4SOXl5rbFuQ', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n44', title: '색깔 배우기 - #16', youtubeId: 'N5mQBE8HHvI', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n45', title: '숫자 배워라 먹어라 - #15', youtubeId: '4I8E4KC_lX4', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n46', title: '동물 친구들 - #14', youtubeId: 'V60PhtH2kx4', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n47', title: '경찰차 소방차 - #13', youtubeId: 'B57UnHZw0xY', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n48', title: '사자 동물 소리 배우기 - #12', youtubeId: 'OA1UKZ7T25s', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n49', title: '베베베 자동차 놀이 - #11', youtubeId: '0PDBb4REoRI', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n50', title: '풍선 도형 놀이 - #10', youtubeId: 'LxqRNQZjms8', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n51', title: '빨강 파랑 색깔 놀이 - #9', youtubeId: '-LEVp9Z4hpI', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n52', title: '키가 쑥쑥 몸몸 - #8', youtubeId: 'WPwcJPowlHI', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n53', title: '풍선 도형 놀이 - #7', youtubeId: '2uS5m1ssYMI', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n54', title: '색깔 배우기 - #6', youtubeId: 'sVnC9hi0jSQ', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n55', title: '신비로운 색깔 세계 - #5', youtubeId: '03GCe0oDB0U', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n56', title: '손뼉 리듬 놀이 - #4', youtubeId: 'gck-E8RWvOg', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
  { id: 'n57', title: '머리 어깨 무릎 발 - #3', youtubeId: 'jyzOWd7Lrlk', category: 'nursery', duration: '2:30', playlistId: NURSERY_PLAYLIST },
]

// 자연음 10곡
const NATURE_TRACKS: Track[] = [
  { id: 'w1', title: '빗소리', category: 'nature', duration: '∞', youtubeId: 'yIQd2Ya0Ziw', avgSleepMin: 10, isRecommended: true },
  { id: 'w2', title: '파도소리', category: 'nature', duration: '∞', youtubeId: 'Nep1qytq9JM', avgSleepMin: 12 },
  { id: 'w3', title: '백색소음', category: 'nature', duration: '∞', youtubeId: 'nMfPqeZjc2c', avgSleepMin: 14 },
  { id: 'w4', title: '심장소리 (엄마 뱃속)', category: 'nature', duration: '∞', youtubeId: 'dfeIYStsEtI', avgSleepMin: 9 },
  { id: 'w5', title: '진공청소기', category: 'nature', duration: '∞', youtubeId: 'I-5f5FbgVPk', avgSleepMin: 8 },
  { id: 'w6', title: '헤어드라이어', category: 'nature', duration: '∞', youtubeId: '2wg7FMiEKBE', avgSleepMin: 7 },
  { id: 'w7', title: '세탁기 소리', category: 'nature', duration: '∞', youtubeId: 'KJzOJKCt3M4', avgSleepMin: 11 },
  { id: 'w8', title: '시냇물 소리', category: 'nature', duration: '∞', youtubeId: 'IvjMgVS6kng', avgSleepMin: 13 },
  { id: 'w9', title: '새소리 (숲)', category: 'nature', duration: '∞', youtubeId: 'xNN7iTA57jM', avgSleepMin: 15 },
  { id: 'w10', title: '뱃속 소리 (자궁음)', category: 'nature', duration: '∞', youtubeId: 'u0gk2Hn6dLA', avgSleepMin: 8, isRecommended: true },
]

// 백색소음 8종 (Web Audio API로 로컬 생성)
const WHITE_NOISE_TRACKS: Track[] = [
  { id: 'wn1', title: '자궁 속 소리', category: 'whitenoise', duration: '∞' },
  { id: 'wn2', title: '빗소리', category: 'whitenoise', duration: '∞' },
  { id: 'wn3', title: '파도 소리', category: 'whitenoise', duration: '∞' },
  { id: 'wn4', title: '청소기 소리', category: 'whitenoise', duration: '∞' },
  { id: 'wn5', title: '선풍기 소리', category: 'whitenoise', duration: '∞' },
  { id: 'wn6', title: '심장 소리', category: 'whitenoise', duration: '∞' },
  { id: 'wn7', title: '드라이어 소리', category: 'whitenoise', duration: '∞' },
  { id: 'wn8', title: '세탁기 소리', category: 'whitenoise', duration: '∞' },
]

const TRACKS: Track[] = [...LULLABY_TRACKS, ...NURSERY_TRACKS, ...NATURE_TRACKS, ...WHITE_NOISE_TRACKS]

const CATEGORY_LABELS: Record<Category, string> = {
  lullaby: '자장가',
  nursery: '동요',
  nature: '자연음',
  whitenoise: '백색소음',
}

// ─── Web Audio API white noise generator ───
type NoiseType = 'womb' | 'rain' | 'wave' | 'vacuum' | 'fan' | 'heartbeat' | 'dryer' | 'washer'

const NOISE_MAP: Record<string, NoiseType> = {
  wn1: 'womb', wn2: 'rain', wn3: 'wave', wn4: 'vacuum',
  wn5: 'fan', wn6: 'heartbeat', wn7: 'dryer', wn8: 'washer',
}

function createWhiteNoiseNode(ctx: AudioContext, type: NoiseType): AudioNode {
  const bufferSize = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  // Generate base noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  gain.gain.value = 0.5

  switch (type) {
    case 'womb':
      // Deep brown noise - low rumble
      filter.type = 'lowpass'
      filter.frequency.value = 150
      filter.Q.value = 1
      gain.gain.value = 0.7
      break
    case 'rain':
      // Pink-ish noise, mid frequencies
      filter.type = 'bandpass'
      filter.frequency.value = 2000
      filter.Q.value = 0.5
      gain.gain.value = 0.4
      break
    case 'wave':
      // Slow modulated low noise
      filter.type = 'lowpass'
      filter.frequency.value = 400
      filter.Q.value = 0.7
      gain.gain.value = 0.5
      // Add LFO for wave effect
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.value = 0.1
      lfoGain.gain.value = 200
      lfo.connect(lfoGain)
      lfoGain.connect(filter.frequency)
      lfo.start()
      break
    case 'vacuum':
      // Harsh high-frequency noise
      filter.type = 'highpass'
      filter.frequency.value = 800
      filter.Q.value = 0.3
      gain.gain.value = 0.35
      break
    case 'fan':
      // Steady mid-low hum
      filter.type = 'bandpass'
      filter.frequency.value = 300
      filter.Q.value = 0.8
      gain.gain.value = 0.45
      break
    case 'heartbeat': {
      // Deep rhythmic pulse - brown noise + pulse
      filter.type = 'lowpass'
      filter.frequency.value = 120
      filter.Q.value = 2
      gain.gain.value = 0.6
      const pulse = ctx.createOscillator()
      const pulseGain = ctx.createGain()
      pulse.frequency.value = 1.2 // ~72 BPM
      pulseGain.gain.value = 80
      pulse.connect(pulseGain)
      pulseGain.connect(filter.frequency)
      pulse.start()
      break
    }
    case 'dryer':
      // Warm mid noise with slight rumble
      filter.type = 'bandpass'
      filter.frequency.value = 500
      filter.Q.value = 0.6
      gain.gain.value = 0.4
      break
    case 'washer':
      // Cyclic low rumble
      filter.type = 'lowpass'
      filter.frequency.value = 250
      filter.Q.value = 0.5
      gain.gain.value = 0.5
      const washLfo = ctx.createOscillator()
      const washGain = ctx.createGain()
      washLfo.frequency.value = 0.05
      washGain.gain.value = 150
      washLfo.connect(washGain)
      washGain.connect(filter.frequency)
      washLfo.start()
      break
  }

  source.connect(filter)
  filter.connect(gain)
  source.start()
  return gain
}

type TimerOption = 30 | 60 | 0

export default function LullabyPage() {
  const [category, setCategory] = useState<Category>('lullaby')
  const [playing, setPlaying] = useState<string | null>(null)
  const [timer, setTimer] = useState<TimerOption>(30)
  const [timerLeft, setTimerLeft] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // White noise Web Audio refs
  const audioCtxRef = useRef<AudioContext | null>(null)
  const noiseNodeRef = useRef<AudioNode | null>(null)

  const filtered = TRACKS.filter((t) => t.category === category)
  const currentTrack = TRACKS.find((t) => t.id === playing)

  // Stop white noise helper
  const stopWhiteNoise = useCallback(() => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
      noiseNodeRef.current = null
    }
  }, [])

  // Start white noise helper
  const startWhiteNoise = useCallback((trackId: string) => {
    stopWhiteNoise()
    const noiseType = NOISE_MAP[trackId]
    if (!noiseType) return
    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const node = createWhiteNoiseNode(ctx, noiseType)
    node.connect(ctx.destination)
    noiseNodeRef.current = node
  }, [stopWhiteNoise])

  // Clean up white noise when playing changes
  useEffect(() => {
    if (!playing || !NOISE_MAP[playing]) {
      stopWhiteNoise()
    }
  }, [playing, stopWhiteNoise])

  // Cleanup on unmount
  useEffect(() => { return () => { stopWhiteNoise() } }, [stopWhiteNoise])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (playing && timer > 0) {
      setTimerLeft(timer * 60)
      timerRef.current = setInterval(() => {
        setTimerLeft((prev) => {
          if (prev === null || prev <= 1) {
            setPlaying(null)
            if (timerRef.current) clearInterval(timerRef.current)
            return null
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [playing, timer])

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // 다음 곡 자동 재생
  const playNext = useCallback(() => {
    if (!playing) return
    const filtered = TRACKS.filter(t => t.category === category)
    const currentIdx = filtered.findIndex(t => t.id === playing)
    if (currentIdx >= 0 && currentIdx < filtered.length - 1) {
      setPlaying(filtered[currentIdx + 1].id)
    } else {
      // 마지막 곡이면 첫 곡으로
      setPlaying(filtered[0]?.id || null)
    }
  }, [playing, category])

  // YouTube iframe API 메시지 수신 (곡 종료 감지)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        // YouTube iframe API: state 0 = ended
        if (data?.event === 'onStateChange' && data?.info === 0) {
          playNext()
        }
      } catch { /* non-YouTube message */ }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [playNext])

  const togglePlay = useCallback((trackId: string) => {
    if (playing === trackId) {
      setPlaying(null)
      setTimerLeft(null)
      stopWhiteNoise()
    } else {
      // If switching to white noise, start audio
      if (NOISE_MAP[trackId]) {
        startWhiteNoise(trackId)
      } else {
        stopWhiteNoise()
      }
      setPlaying(trackId)
    }
  }, [playing, startWhiteNoise, stopWhiteNoise])

  const getYouTubeEmbedUrl = (track: Track): string | null => {
    if (track.youtubeId) {
      return `https://www.youtube.com/embed/${track.youtubeId}?autoplay=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`
    }
    if (track.playlistId) {
      const catTracks = TRACKS.filter(t => t.category === track.category && t.playlistId === track.playlistId)
      const idx = catTracks.length - 1 - catTracks.indexOf(track)
      return `https://www.youtube.com/embed/videoseries?list=${track.playlistId}&index=${Math.max(0, idx)}&autoplay=1&enablejsapi=1`
    }
    return null
  }

  return (
    <div className="h-[calc(100dvh-144px)] bg-[var(--color-page-bg)] flex flex-col overflow-hidden">
      <div className="px-4 max-w-lg mx-auto w-full flex items-center h-12 shrink-0">
        <button onClick={() => window.history.back()} className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full active:bg-[rgba(0,0,0,0.05)]" aria-label="뒤로가기">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="flex-1 text-center"><p className="text-subtitle text-primary truncate">자장가 · 동요</p></div>
        <div className="w-10" />
      </div>

      <div className="max-w-lg mx-auto w-full flex flex-col flex-1 min-h-0">
        {/* YouTube player */}
        {currentTrack && getYouTubeEmbedUrl(currentTrack) && (
          <div className="mx-5 mt-2 rounded-xl overflow-hidden bg-black aspect-video">
            <iframe
              src={getYouTubeEmbedUrl(currentTrack)!}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title={currentTrack.title}
            />
          </div>
        )}

        {currentTrack && !getYouTubeEmbedUrl(currentTrack) && (
          <div className="mx-5 mt-2 rounded-xl bg-white border border-[#E8E4DF] p-6 text-center">
            <p className="text-body-emphasis font-medium text-primary">{currentTrack.title}</p>
            <p className="text-body text-tertiary mt-1">재생 준비 중...</p>
          </div>
        )}

        {/* Now playing + timer */}
        {currentTrack && (
          <div className="mx-5 mt-2 flex items-center justify-between">
            <p className="text-body font-medium text-[var(--color-primary)] truncate flex-1 min-w-0">
              ♪ {currentTrack.title}
            </p>
            <div className="flex items-center gap-1.5 ml-3 shrink-0">
              {([30, 60, 0] as TimerOption[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimer(t)}
                  className="px-2.5 py-0.5 rounded-full"
                  style={timer === t
                    ? { fontSize: 11, fontWeight: 600, background: 'var(--color-primary)', color: '#FFFFFF' }
                    : { fontSize: 11, fontWeight: 500, background: 'rgba(0,0,0,0.04)', color: '#8C8B89' }
                  }
                >
                  {t === 0 ? '∞' : `${t}분`}
                </button>
              ))}
              {timerLeft !== null && (
                <span className="font-mono ml-1" style={{ fontSize: 11, color: 'var(--color-primary)' }}>
                  {formatTimer(timerLeft)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 첫 진입 가이드 */}
        {!currentTrack && (
          <div className="mx-5 mt-4 text-center">
            <MoonIcon className="w-8 h-8 mx-auto mb-2 text-[var(--color-primary)]" />
            <p className="text-subtitle font-bold text-primary">자장가 · 동요</p>
            <p className="text-body-emphasis text-tertiary mt-1">자장가 {LULLABY_TRACKS.length}곡 · 동요 {NURSERY_TRACKS.length}곡 · 자연음 {NATURE_TRACKS.length}곡 · 백색소음 {WHITE_NOISE_TRACKS.length}종</p>
            <div className="mt-3 px-4 py-2 bg-[var(--color-accent-bg)] rounded-lg inline-block">
              <p className="text-body text-secondary">아래에서 곡을 선택해서 재생해보세요</p>
            </div>
          </div>
        )}

        {/* Category tabs */}
        <div className="flex gap-2 px-5 mt-4">
          {(['lullaby', 'nursery', 'nature'] as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-body-emphasis transition-colors ${
                category === cat ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-tertiary border border-[#E8E4DF]'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Track list */}
        <div className="mt-3 px-5 flex-1 min-h-0 overflow-y-auto pb-4">
          <div className="space-y-px">
            {filtered.map((track, i) => {
              const isPlaying = playing === track.id
              const hasAudio = !!(track.youtubeId || track.playlistId || NOISE_MAP[track.id])
              return (
                <button
                  key={track.id}
                  onClick={() => hasAudio ? togglePlay(track.id) : undefined}
                  disabled={!hasAudio}
                  className={`w-full flex items-center gap-2 px-3 py-2 transition-colors ${
                    i === 0 ? 'rounded-t-xl' : ''
                  } ${i === filtered.length - 1 ? 'rounded-b-xl' : ''} ${
                    isPlaying ? 'bg-[var(--color-accent-bg)]' : hasAudio ? 'bg-white' : 'bg-white/60 opacity-50'
                  }`}
                >
                  <span style={{ fontSize: 11, width: 20 }} className={`shrink-0 text-center ${isPlaying ? 'text-[var(--color-primary)] font-bold' : 'text-tertiary'}`}>
                    {isPlaying ? '▶' : hasAudio ? `${i + 1}` : '-'}
                  </span>
                  <p className={`flex-1 text-left truncate ${isPlaying ? 'text-[var(--color-primary)] font-medium' : 'text-primary'}`} style={{ fontSize: 13 }}>
                    {track.title}
                  </p>
                </button>
              )
            })}
          </div>

          {/* YouTube link */}
          <div className="mt-4 text-center">
            <a
              href={category === 'nursery'
                ? `https://www.youtube.com/playlist?list=${NURSERY_PLAYLIST}`
                : `https://www.youtube.com/playlist?list=${LULLABY_PLAYLIST}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body-emphasis font-medium"
              style={{ color: 'var(--color-primary)' }}
            >
              YouTube에서 전체 {CATEGORY_LABELS[category]} 듣기 →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
