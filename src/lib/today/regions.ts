/**
 * 지역 코드 매핑 — 에어코리아/기상청/질병관리청 파라미터 통합
 * 서울 25개 구 + 17개 시도 대표 도시
 */

export interface RegionMapping {
  id: string;
  name: string;
  sidoName: string;
  sigunguName: string;
  stationName: string;   // 에어코리아 측정소명
  nx: number;            // 기상청 격자 X
  ny: number;            // 기상청 격자 Y
  areaNo: string;        // 기상청 행정코드 (10자리)
  sidoCd: string;        // 질병관리청 시도코드
  lat: number;
  lng: number;
}

// 서울 25개 자치구
const SEOUL_REGIONS: RegionMapping[] = [
  { id: 'seoul_gangnam', name: '서울특별시 강남구', sidoName: '서울특별시', sigunguName: '강남구', stationName: '강남구', nx: 61, ny: 126, areaNo: '1168000000', sidoCd: '11', lat: 37.5172, lng: 127.0473 },
  { id: 'seoul_gangdong', name: '서울특별시 강동구', sidoName: '서울특별시', sigunguName: '강동구', stationName: '강동구', nx: 62, ny: 126, areaNo: '1174000000', sidoCd: '11', lat: 37.5301, lng: 127.1238 },
  { id: 'seoul_gangbuk', name: '서울특별시 강북구', sidoName: '서울특별시', sigunguName: '강북구', stationName: '강북구', nx: 61, ny: 128, areaNo: '1130500000', sidoCd: '11', lat: 37.6396, lng: 127.0255 },
  { id: 'seoul_gangseo', name: '서울특별시 강서구', sidoName: '서울특별시', sigunguName: '강서구', stationName: '강서구', nx: 58, ny: 126, areaNo: '1150000000', sidoCd: '11', lat: 37.5510, lng: 126.8495 },
  { id: 'seoul_gwanak', name: '서울특별시 관악구', sidoName: '서울특별시', sigunguName: '관악구', stationName: '관악구', nx: 59, ny: 125, areaNo: '1162000000', sidoCd: '11', lat: 37.4784, lng: 126.9516 },
  { id: 'seoul_gwangjin', name: '서울특별시 광진구', sidoName: '서울특별시', sigunguName: '광진구', stationName: '광진구', nx: 62, ny: 126, areaNo: '1121500000', sidoCd: '11', lat: 37.5385, lng: 127.0823 },
  { id: 'seoul_guro', name: '서울특별시 구로구', sidoName: '서울특별시', sigunguName: '구로구', stationName: '구로구', nx: 58, ny: 125, areaNo: '1153000000', sidoCd: '11', lat: 37.4954, lng: 126.8877 },
  { id: 'seoul_geumcheon', name: '서울특별시 금천구', sidoName: '서울특별시', sigunguName: '금천구', stationName: '금천구', nx: 59, ny: 124, areaNo: '1154500000', sidoCd: '11', lat: 37.4569, lng: 126.8955 },
  { id: 'seoul_nowon', name: '서울특별시 노원구', sidoName: '서울특별시', sigunguName: '노원구', stationName: '노원구', nx: 61, ny: 129, areaNo: '1135000000', sidoCd: '11', lat: 37.6542, lng: 127.0568 },
  { id: 'seoul_dobong', name: '서울특별시 도봉구', sidoName: '서울특별시', sigunguName: '도봉구', stationName: '도봉구', nx: 61, ny: 129, areaNo: '1132000000', sidoCd: '11', lat: 37.6688, lng: 127.0471 },
  { id: 'seoul_dongdaemun', name: '서울특별시 동대문구', sidoName: '서울특별시', sigunguName: '동대문구', stationName: '동대문구', nx: 61, ny: 127, areaNo: '1123000000', sidoCd: '11', lat: 37.5744, lng: 127.0396 },
  { id: 'seoul_dongjak', name: '서울특별시 동작구', sidoName: '서울특별시', sigunguName: '동작구', stationName: '동작구', nx: 59, ny: 125, areaNo: '1159000000', sidoCd: '11', lat: 37.5124, lng: 126.9393 },
  { id: 'seoul_mapo', name: '서울특별시 마포구', sidoName: '서울특별시', sigunguName: '마포구', stationName: '마포구', nx: 59, ny: 127, areaNo: '1144000000', sidoCd: '11', lat: 37.5663, lng: 126.9014 },
  { id: 'seoul_seodaemun', name: '서울특별시 서대문구', sidoName: '서울특별시', sigunguName: '서대문구', stationName: '서대문구', nx: 59, ny: 127, areaNo: '1141000000', sidoCd: '11', lat: 37.5791, lng: 126.9368 },
  { id: 'seoul_seocho', name: '서울특별시 서초구', sidoName: '서울특별시', sigunguName: '서초구', stationName: '서초구', nx: 61, ny: 125, areaNo: '1165000000', sidoCd: '11', lat: 37.4837, lng: 127.0324 },
  { id: 'seoul_seongdong', name: '서울특별시 성동구', sidoName: '서울특별시', sigunguName: '성동구', stationName: '성동구', nx: 61, ny: 127, areaNo: '1120000000', sidoCd: '11', lat: 37.5634, lng: 127.0369 },
  { id: 'seoul_seongbuk', name: '서울특별시 성북구', sidoName: '서울특별시', sigunguName: '성북구', stationName: '성북구', nx: 61, ny: 128, areaNo: '1129000000', sidoCd: '11', lat: 37.5894, lng: 127.0167 },
  { id: 'seoul_songpa', name: '서울특별시 송파구', sidoName: '서울특별시', sigunguName: '송파구', stationName: '송파구', nx: 62, ny: 126, areaNo: '1171000000', sidoCd: '11', lat: 37.5146, lng: 127.1050 },
  { id: 'seoul_yangcheon', name: '서울특별시 양천구', sidoName: '서울특별시', sigunguName: '양천구', stationName: '양천구', nx: 58, ny: 126, areaNo: '1147000000', sidoCd: '11', lat: 37.5170, lng: 126.8667 },
  { id: 'seoul_yeongdeungpo', name: '서울특별시 영등포구', sidoName: '서울특별시', sigunguName: '영등포구', stationName: '영등포구', nx: 58, ny: 126, areaNo: '1156000000', sidoCd: '11', lat: 37.5264, lng: 126.8963 },
  { id: 'seoul_yongsan', name: '서울특별시 용산구', sidoName: '서울특별시', sigunguName: '용산구', stationName: '용산구', nx: 60, ny: 126, areaNo: '1117000000', sidoCd: '11', lat: 37.5324, lng: 126.9906 },
  { id: 'seoul_eunpyeong', name: '서울특별시 은평구', sidoName: '서울특별시', sigunguName: '은평구', stationName: '은평구', nx: 59, ny: 127, areaNo: '1138000000', sidoCd: '11', lat: 37.6027, lng: 126.9292 },
  { id: 'seoul_jongno', name: '서울특별시 종로구', sidoName: '서울특별시', sigunguName: '종로구', stationName: '종로구', nx: 60, ny: 127, areaNo: '1111000000', sidoCd: '11', lat: 37.5735, lng: 126.9790 },
  { id: 'seoul_jung', name: '서울특별시 중구', sidoName: '서울특별시', sigunguName: '중구', stationName: '중구', nx: 60, ny: 127, areaNo: '1114000000', sidoCd: '11', lat: 37.5641, lng: 126.9979 },
  { id: 'seoul_jungnang', name: '서울특별시 중랑구', sidoName: '서울특별시', sigunguName: '중랑구', stationName: '중랑구', nx: 62, ny: 128, areaNo: '1126000000', sidoCd: '11', lat: 37.6066, lng: 127.0927 },
];

// 17개 시도 대표 도시
const SIDO_REGIONS: RegionMapping[] = [
  { id: 'busan_busanjin', name: '부산광역시 부산진구', sidoName: '부산광역시', sigunguName: '부산진구', stationName: '부산진구', nx: 97, ny: 75, areaNo: '2623000000', sidoCd: '26', lat: 35.1629, lng: 129.0532 },
  { id: 'daegu_jung', name: '대구광역시 중구', sidoName: '대구광역시', sigunguName: '중구', stationName: '중구', nx: 89, ny: 90, areaNo: '2711000000', sidoCd: '27', lat: 35.8714, lng: 128.6014 },
  { id: 'incheon_namdong', name: '인천광역시 남동구', sidoName: '인천광역시', sigunguName: '남동구', stationName: '남동구', nx: 56, ny: 124, areaNo: '2820000000', sidoCd: '28', lat: 37.4488, lng: 126.7309 },
  { id: 'gwangju_seo', name: '광주광역시 서구', sidoName: '광주광역시', sigunguName: '서구', stationName: '서구', nx: 57, ny: 74, areaNo: '2914000000', sidoCd: '29', lat: 35.1522, lng: 126.8895 },
  { id: 'daejeon_seo', name: '대전광역시 서구', sidoName: '대전광역시', sigunguName: '서구', stationName: '대전광역시', nx: 67, ny: 100, areaNo: '3014000000', sidoCd: '30', lat: 36.3556, lng: 127.3836 },
  { id: 'ulsan_nam', name: '울산광역시 남구', sidoName: '울산광역시', sigunguName: '남구', stationName: '남구', nx: 102, ny: 84, areaNo: '3114000000', sidoCd: '31', lat: 35.5444, lng: 129.3300 },
  { id: 'sejong', name: '세종특별자치시', sidoName: '세종특별자치시', sigunguName: '세종시', stationName: '세종시', nx: 66, ny: 103, areaNo: '3611000000', sidoCd: '36', lat: 36.4801, lng: 127.2489 },
  { id: 'gyeonggi_suwon', name: '경기도 수원시', sidoName: '경기도', sigunguName: '수원시', stationName: '수원시', nx: 60, ny: 121, areaNo: '4111000000', sidoCd: '41', lat: 37.2636, lng: 127.0286 },
  { id: 'gangwon_chuncheon', name: '강원특별자치도 춘천시', sidoName: '강원특별자치도', sigunguName: '춘천시', stationName: '춘천시', nx: 73, ny: 134, areaNo: '5111000000', sidoCd: '42', lat: 37.8813, lng: 127.7300 },
  { id: 'chungbuk_cheongju', name: '충청북도 청주시', sidoName: '충청북도', sigunguName: '청주시', stationName: '청주시', nx: 69, ny: 107, areaNo: '4311100000', sidoCd: '43', lat: 36.6424, lng: 127.4890 },
  { id: 'chungnam_cheonan', name: '충청남도 천안시', sidoName: '충청남도', sigunguName: '천안시', stationName: '천안시', nx: 63, ny: 110, areaNo: '4413100000', sidoCd: '44', lat: 36.8151, lng: 127.1139 },
  { id: 'jeonbuk_jeonju', name: '전북특별자치도 전주시', sidoName: '전북특별자치도', sigunguName: '전주시', stationName: '전주시', nx: 63, ny: 89, areaNo: '4511100000', sidoCd: '45', lat: 35.8242, lng: 127.1480 },
  { id: 'jeonnam_mokpo', name: '전라남도 목포시', sidoName: '전라남도', sigunguName: '목포시', stationName: '목포시', nx: 50, ny: 67, areaNo: '4611000000', sidoCd: '46', lat: 34.8118, lng: 126.3922 },
  { id: 'gyeongbuk_pohang', name: '경상북도 포항시', sidoName: '경상북도', sigunguName: '포항시', stationName: '포항시', nx: 102, ny: 94, areaNo: '4711100000', sidoCd: '47', lat: 36.0190, lng: 129.3435 },
  { id: 'gyeongnam_changwon', name: '경상남도 창원시', sidoName: '경상남도', sigunguName: '창원시', stationName: '창원시', nx: 90, ny: 77, areaNo: '4812100000', sidoCd: '48', lat: 35.2281, lng: 128.6812 },
  { id: 'jeju', name: '제주특별자치도 제주시', sidoName: '제주특별자치도', sigunguName: '제주시', stationName: '제주시', nx: 53, ny: 38, areaNo: '5011000000', sidoCd: '50', lat: 33.4996, lng: 126.5312 },
];

export const REGIONS: RegionMapping[] = [...SEOUL_REGIONS, ...SIDO_REGIONS];

/** 지역명으로 매핑 조회 */
export function resolveRegion(regionName: string): RegionMapping | null {
  return REGIONS.find(r => r.name === regionName || r.id === regionName) ?? null;
}

/** 시도 목록 반환 */
export function getSidoList(): string[] {
  return [...new Set(REGIONS.map(r => r.sidoName))];
}

/** 시도별 시군구 목록 반환 */
export function getSigunguList(sidoName: string): string[] {
  return REGIONS.filter(r => r.sidoName === sidoName).map(r => r.sigunguName);
}
