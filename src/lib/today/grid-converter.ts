/**
 * 위경도 → 기상청 격자 좌표 변환 (Lambert Conformal Conic)
 * 기상청 단기예보 API에 필요한 nx, ny 좌표 생성
 *
 * Reference: 기상청 좌표변환 공식 (공공데이터포털 기상청 API 문서)
 */

interface GridCoord {
  nx: number;
  ny: number;
}

interface LatLng {
  lat: number;
  lng: number;
}

// Lambert Conformal Conic 파라미터 (기상청 표준)
const RE = 6371.00877;    // 지구 반경 (km)
const GRID = 5.0;         // 격자 간격 (km)
const SLAT1 = 30.0;       // 투영 위도 1 (degree)
const SLAT2 = 60.0;       // 투영 위도 2 (degree)
const OLON = 126.0;       // 기준점 경도 (degree)
const OLAT = 38.0;        // 기준점 위도 (degree)
const XO = 43;            // 기준점 X 좌표 (격자)
const YO = 136;           // 기준점 Y 좌표 (격자)

const DEGRAD = Math.PI / 180.0;

/**
 * 위경도를 기상청 격자 좌표 (nx, ny)로 변환
 */
export function latLngToGrid(lat: number, lng: number): GridCoord {
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);

  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;

  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);

  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

  return { nx, ny };
}

/**
 * 기상청 격자 좌표를 위경도로 역변환
 */
export function gridToLatLng(nx: number, ny: number): LatLng {
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);

  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;

  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  const xn = nx - XO;
  const yn = ro - ny + YO;

  let ra = Math.sqrt(xn * xn + yn * yn);
  if (sn < 0.0) ra = -ra;

  let alat = Math.pow((re * sf) / ra, 1.0 / sn);
  alat = 2.0 * Math.atan(alat) - Math.PI * 0.5;

  let theta = 0.0;
  if (Math.abs(xn) <= 0.0) {
    theta = 0.0;
  } else if (Math.abs(yn) <= 0.0) {
    theta = Math.PI * 0.5;
    if (xn < 0.0) theta = -theta;
  } else {
    theta = Math.atan2(xn, yn);
  }

  const alon = theta / sn + olon;

  return {
    lat: alat / DEGRAD,
    lng: alon / DEGRAD,
  };
}
