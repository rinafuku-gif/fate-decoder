// ========================================
// ホロスコープ計算エンジン v2.0
// 天体位置・星座・アスペクト・トランジット・月相・逆行
// 正真交点(ノースノード)・カイロン・ASC/MC対応
// スタンドアロンモジュール — React/UI依存なし
// ========================================

// ---------- 定数 ----------

const J2000 = 2451545.0
const RAD = Math.PI / 180.0
const DEG = 180.0 / Math.PI

// 12星座（黄経0°=牡羊座起点）
export const ZODIAC_SIGNS = [
  '牡羊座', '牡牛座', '双子座', '蟹座', '獅子座', '乙女座',
  '天秤座', '蠍座', '射手座', '山羊座', '水瓶座', '魚座'
] as const

export const ZODIAC_SIGNS_EN = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
] as const

// 4エレメント
export const ELEMENTS = {
  fire: ['牡羊座', '獅子座', '射手座'],
  earth: ['牡牛座', '乙女座', '山羊座'],
  air: ['双子座', '天秤座', '水瓶座'],
  water: ['蟹座', '蠍座', '魚座'],
} as const

// 3クオリティ
export const QUALITIES = {
  cardinal: ['牡羊座', '蟹座', '天秤座', '山羊座'],
  fixed: ['牡牛座', '獅子座', '蠍座', '水瓶座'],
  mutable: ['双子座', '乙女座', '射手座', '魚座'],
} as const

// 天体名（感受点含む）
export const PLANET_NAMES = [
  '太陽', '月', '水星', '金星', '火星',
  '木星', '土星', '天王星', '海王星', '冥王星',
  '正真交点', 'カイロン'
] as const

export const PLANET_NAMES_EN = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'North Node', 'Chiron'
] as const

// メジャーアスペクト
export const ASPECTS = [
  { name: 'コンジャンクション', nameEn: 'Conjunction', symbol: '☌', angle: 0, orb: 8, nature: 'major' },
  { name: 'セクスタイル', nameEn: 'Sextile', symbol: '⚹', angle: 60, orb: 6, nature: 'soft' },
  { name: 'スクエア', nameEn: 'Square', symbol: '□', angle: 90, orb: 7, nature: 'hard' },
  { name: 'トライン', nameEn: 'Trine', symbol: '△', angle: 120, orb: 7, nature: 'soft' },
  { name: 'オポジション', nameEn: 'Opposition', symbol: '☍', angle: 180, orb: 8, nature: 'hard' },
] as const

// 月相名
export const MOON_PHASES = [
  '新月', '三日月', '上弦の月', '凸月（上弦後）',
  '満月', '凸月（下弦前）', '下弦の月', '二十六夜月'
] as const

// ---------- 型定義 ----------

export type ZodiacSign = typeof ZODIAC_SIGNS[number]
export type PlanetName = typeof PLANET_NAMES[number]

export interface PlanetPosition {
  name: PlanetName
  nameEn: string
  longitude: number       // 黄経（0-360°）
  sign: ZodiacSign        // 星座
  signEn: string          // 星座（英語）
  degree: number          // 星座内の度数（0-30°）
  minute: number          // 分（0-60'）
  isRetrograde: boolean   // 逆行中か
  displayDegree: string   // 表示用（例: "15°23' 牡羊座"）
}

export interface AspectInfo {
  planet1: PlanetName
  planet2: PlanetName
  aspect: string
  aspectEn: string
  symbol: string
  exactAngle: number
  actualAngle: number
  orb: number             // 実際のオーブ（誤差度数）
  nature: string          // 'major' | 'soft' | 'hard'
}

export interface MoonPhaseInfo {
  phase: string           // 月相名
  angle: number           // 太陽-月の角度差
  illumination: number    // 輝面比（0-1）
  isWaxing: boolean       // 満ちていく月か
  emoji: string           // 月相の絵文字
}

export interface AnglesData {
  asc: { longitude: number; sign: ZodiacSign; degree: number; minute: number; displayDegree: string } | null
  mc: { longitude: number; sign: ZodiacSign; degree: number; minute: number; displayDegree: string } | null
  dsc: { longitude: number; sign: ZodiacSign; degree: number; minute: number; displayDegree: string } | null
  ic: { longitude: number; sign: ZodiacSign; degree: number; minute: number; displayDegree: string } | null
}

export interface HoroscopeData {
  date: Date
  julianDay: number
  planets: PlanetPosition[]
  aspects: AspectInfo[]
  moonPhase: MoonPhaseInfo
  angles: AnglesData
  elementBalance: { fire: number; earth: number; air: number; water: number }
  qualityBalance: { cardinal: number; fixed: number; mutable: number }
}

// ---------- 基本天文計算 ----------

function normalizeAngle(angle: number): number {
  if (!Number.isFinite(angle)) return 0 // NaN/Infinity防御
  let a = angle % 360
  if (a < 0) a += 360
  return a
}

/** ユリウス通日 (JD) — Date オブジェクトから */
export function dateToJD(date: Date): number {
  // invalid Date 防御
  if (isNaN(date.getTime())) {
    throw new Error('Invalid Date passed to dateToJD')
  }
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1
  const d = date.getUTCDate() + date.getUTCHours() / 24 +
            date.getUTCMinutes() / 1440 + date.getUTCSeconds() / 86400
  let year = y, month = m
  if (month <= 2) { year -= 1; month += 12 }
  const A = Math.floor(year / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + d + B - 1524.5
}

/** 年月日からJD */
export function ymdToJD(y: number, m: number, d: number): number {
  let year = y, month = m
  if (month <= 2) { year -= 1; month += 12 }
  const A = Math.floor(year / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + d + B - 1524.5
}

/** ケプラー方程式を解く（ニュートン法）: M → E */
function solveKepler(M: number, e: number): number {
  const Mr = M * RAD
  let E = Mr
  for (let i = 0; i < 30; i++) {
    const dE = (E - e * Math.sin(E) - Mr) / (1 - e * Math.cos(E))
    E -= dE
    if (Math.abs(dE) < 1e-12) break
  }
  return E
}

/** 離心近点角 E → 真近点角 ν */
function trueAnomaly(E: number, e: number): number {
  const halfE = E / 2
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(halfE),
    Math.sqrt(1 - e) * Math.cos(halfE)
  )
  return nu * DEG
}

// ---------- 惑星軌道要素（J2000.0 + 世紀変化率）----------
// 出典: Meeus "Astronomical Algorithms" / NASA JPL 簡易軌道要素

interface OrbitalElements {
  // L: 平均黄経, a: 軌道長半径(AU), e: 離心率,
  // I: 軌道傾斜角, omega: 昇交点黄経, pi: 近日点黄経
  // 各 [定数項, 世紀変化率] (一部2次項あり)
  L: number[]
  a: number[]
  e: number[]
  I: number[]
  omega: number[]
  pi: number[]
}

// 内惑星・外惑星の軌道要素（J2000.0基準、T=ユリウス世紀数）
// JPL "Keplerian Elements for Approximate Positions of the Major Planets" 3000BC-3000AD
const ORBITAL_ELEMENTS: Record<string, OrbitalElements> = {
  mercury: {
    L: [252.250906, 149472.6746358],
    a: [0.38709927, 0.00000037],
    e: [0.20563593, 0.00001906],
    I: [7.00497902, -0.00594749],
    omega: [48.33076593, -0.12534081],
    pi: [77.45779628, 0.16047689],
  },
  venus: {
    L: [181.979801, 58517.8156760],
    a: [0.72333566, 0.00000390],
    e: [0.00677672, -0.00004107],
    I: [3.39467605, -0.00078890],
    omega: [76.67984255, -0.27769418],
    pi: [131.60246718, 0.00268329],
  },
  earth: {
    L: [100.466449, 35999.3728519],
    a: [1.00000261, 0.00000562],
    e: [0.01671123, -0.00004392],
    I: [-0.00001531, -0.01294668],
    omega: [0.0, 0.0],
    pi: [102.93768193, 0.32327364],
  },
  mars: {
    L: [355.433275, 19140.2993313],
    a: [1.52371034, 0.00001847],
    e: [0.09339410, 0.00007882],
    I: [1.84969142, -0.00813131],
    omega: [49.55953891, -0.29257343],
    pi: [336.05637041, 0.44441088],
  },
  jupiter: {
    L: [34.39644051, 3034.74612775],
    a: [5.20288700, -0.00011607],
    e: [0.04838624, -0.00013253],
    I: [1.30439695, -0.00183714],
    omega: [100.47390909, 0.20469106],
    pi: [14.72847983, 0.21252668],
  },
  saturn: {
    L: [49.95424423, 1222.11494724],
    a: [9.53667594, -0.00125060],
    e: [0.05386179, -0.00050991],
    I: [2.48599187, 0.00193609],
    omega: [113.66242448, -0.28867794],
    pi: [92.59887831, -0.41897216],
  },
  uranus: {
    L: [313.23810451, 428.48202785],
    a: [19.18916464, -0.00196176],
    e: [0.04725744, -0.00004397],
    I: [0.77263783, -0.00242939],
    omega: [74.01692503, 0.04240589],
    pi: [170.95427630, 0.40805281],
  },
  neptune: {
    L: [304.87997031, 218.45945325],
    a: [30.06992276, 0.00026291],
    e: [0.00859048, 0.00005105],
    I: [1.77004347, 0.00035372],
    omega: [131.78422574, -0.00508664],
    pi: [44.96476227, -0.32241464],
  },
}

// 冥王星の簡易計算用係数（Meeus Chapter 37）
const PLUTO_TERMS = [
  // [J, S, P, lonA, lonB]  — J=木星平均近点角係数, S=土星, P=冥王
  [0, 0, 1, -19799805, 19850055],
  [0, 0, 2, 897144, -4954829],
  [0, 0, 3, 611149, 1211027],
  [0, 0, 4, -341243, -189585],
  [0, 0, 5, 129027, -34767],
  [0, 0, 6, -38215, 31061],
  [1, 0, 0, 20349, -9886],
  [1, 0, 1, -4045, -4904],
  [1, 0, 2, -5885, -3238],
  [1, 0, 3, -3812, 3011],
  [2, 0, 0, -12729, 3413],
  [0, 1, 0, -16939, -6244],
  [0, 1, 1, -6764, -4891],
  [0, 1, 2, 8551, -7457],
  [0, 1, 3, -4681, 4095],
  [0, 2, 0, -1583, -773],
  [0, 2, 1, -3261, -6753],
  [0, 2, 2, 7186, -3823],
  [1, 0, -1, 18199, -8031],
  [1, 0, -2, -6168, -4567],
  [1, 0, -3, -3508, 1873],
  [1, 1, 0, -11706, 5765],
  [1, 1, -2, 9476, -4667],
  [1, -1, 0, 7160, 3775],
  [2, 0, -1, -5765, 2727],
  [2, 0, -2, 7622, -5765],
]

// ---------- 天体黄経計算 ----------

/** 太陽黄経+動径 (VSOP87簡易版) */
function getSolarPosition(jd: number): { lon: number; r: number } {
  const T = (jd - J2000) / 36525.0
  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T
  let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T
  L0 = normalizeAngle(L0)
  M = normalizeAngle(M)
  const Mr = M * RAD
  const C = (1.914602 - 0.004817 * T) * Math.sin(Mr)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
    + 0.000289 * Math.sin(3 * Mr)
  let sunLon = L0 + C
  const Omega = 125.04 - 1934.136 * T
  sunLon = sunLon - 0.00569 - 0.00478 * Math.sin(Omega * RAD)

  // 太陽の動径（地球-太陽距離 AU）
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T
  const v = (M + C) * RAD  // 真近点角
  const r = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(v))

  return { lon: normalizeAngle(sunLon), r }
}

/** 太陽黄経 (VSOP87簡易版) — 互換API */
export function getSolarLongitude(jd: number): number {
  return getSolarPosition(jd).lon
}

/**
 * 地球の日心座標（VSOP87ベースの高精度版）
 * 太陽の地心位置から逆算: 地球の日心黄経 = 太陽黄経 + 180°
 */
function getEarthHeliocentricXY(jd: number): { x: number; y: number; r: number } {
  const sun = getSolarPosition(jd)
  // 地球の日心黄経 = 太陽の地心黄経 + 180°
  const earthLon = normalizeAngle(sun.lon + 180) * RAD
  return {
    x: sun.r * Math.cos(earthLon),
    y: sun.r * Math.sin(earthLon),
    r: sun.r,
  }
}

/** 月黄経 (Jean Meeus 24項) — fortune-calc.ts と同じロジック */
export function getLunarLongitude(jd: number): number {
  const T = (jd - J2000) / 36525.0
  let Lm = 218.3164477 + 481267.88123421 * T
    - 0.0015786 * T * T + T * T * T / 538841 - T * T * T * T / 65194000
  let Mm = 134.9633964 + 477198.8675055 * T
    + 0.0087414 * T * T + T * T * T / 69699 - T * T * T * T / 14712000
  let Ms = 357.5291092 + 35999.0502909 * T
    - 0.0001536 * T * T + T * T * T / 24490000
  let D = 297.8501921 + 445267.1114034 * T
    - 0.0018819 * T * T + T * T * T / 545868 - T * T * T * T / 113065000
  let F = 93.2720950 + 483202.0175233 * T
    - 0.0036539 * T * T - T * T * T / 3526000 + T * T * T * T / 863310000
  Lm = normalizeAngle(Lm)
  Mm = normalizeAngle(Mm)
  Ms = normalizeAngle(Ms)
  D = normalizeAngle(D)
  F = normalizeAngle(F)
  const MmR = Mm * RAD, MsR = Ms * RAD, DR = D * RAD, FR = F * RAD
  let dL = 0
  dL += 6288774 * Math.sin(MmR)
  dL += 1274027 * Math.sin(2 * DR - MmR)
  dL += 658314 * Math.sin(2 * DR)
  dL += 213618 * Math.sin(2 * MmR)
  dL += -185116 * Math.sin(MsR)
  dL += -114332 * Math.sin(2 * FR)
  dL += 58793 * Math.sin(2 * DR - 2 * MmR)
  dL += 57066 * Math.sin(2 * DR - MsR - MmR)
  dL += 53322 * Math.sin(2 * DR + MmR)
  dL += 45758 * Math.sin(2 * DR - MsR)
  dL += -40923 * Math.sin(MsR - MmR)
  dL += -34720 * Math.sin(DR)
  dL += -30383 * Math.sin(MsR + MmR)
  dL += 15327 * Math.sin(2 * DR - 2 * FR)
  dL += -12528 * Math.sin(MmR + 2 * FR)
  dL += 10980 * Math.sin(MmR - 2 * FR)
  dL += 10675 * Math.sin(4 * DR - MmR)
  dL += 10034 * Math.sin(3 * MmR)
  dL += 8548 * Math.sin(4 * DR - 2 * MmR)
  dL += -7888 * Math.sin(2 * DR + MsR - MmR)
  dL += -6766 * Math.sin(2 * DR + MsR)
  dL += -5163 * Math.sin(DR - MmR)
  dL += 4987 * Math.sin(DR + MsR)
  dL += 4036 * Math.sin(2 * DR - MsR + MmR)
  return normalizeAngle(Lm + dL / 1000000.0)
}

/**
 * 惑星の地心黄経を計算（水星〜海王星）
 * VSOP87ベースの地球位置を使用して高精度化
 */
/**
 * 惑星の日心XY座標を計算（JPL摂動補正付き）
 */
function getHeliocentricXY(planetKey: string, jd: number): { x: number; y: number; r: number } {
  const T = (jd - J2000) / 36525.0
  const el = ORBITAL_ELEMENTS[planetKey]

  const L = normalizeAngle(el.L[0] + el.L[1] * T)

  const a = el.a[0] + el.a[1] * T
  const e = el.e[0] + el.e[1] * T
  const I = el.I[0] + el.I[1] * T
  const Om = normalizeAngle(el.omega[0] + el.omega[1] * T)
  const pi = normalizeAngle(el.pi[0] + el.pi[1] * T)

  const M = normalizeAngle(L - pi)

  const Ecc = solveKepler(M, e)
  const nu = trueAnomaly(Ecc, e)
  const r = a * (1 - e * Math.cos(Ecc))
  const w = normalizeAngle(pi - Om)

  const nuR = nu * RAD, wR = w * RAD, IR = I * RAD, OmR = Om * RAD
  const xJ2000 = r * (Math.cos(OmR) * Math.cos(wR + nuR) - Math.sin(OmR) * Math.sin(wR + nuR) * Math.cos(IR))
  const yJ2000 = r * (Math.sin(OmR) * Math.cos(wR + nuR) + Math.cos(OmR) * Math.sin(wR + nuR) * Math.cos(IR))

  // 歳差回転: J2000黄道 → 黄道of date（太陽/地球の座標系に合わせる）
  // 一般歳差（General precession in longitude）: Lieske 1979
  const psiA = (5029.0966 * T + 1.11113 * T * T) / 3600 * RAD
  const cosPsi = Math.cos(psiA)
  const sinPsi = Math.sin(psiA)
  const x = xJ2000 * cosPsi - yJ2000 * sinPsi
  const y = xJ2000 * sinPsi + yJ2000 * cosPsi

  return { x, y, r }
}

function getGeocentricPlanetLongitude(planetKey: string, jd: number): number {
  const planet = getHeliocentricXY(planetKey, jd)
  const earth = getEarthHeliocentricXY(jd)
  const geoLon = Math.atan2(planet.y - earth.y, planet.x - earth.x) * DEG

  // 年周光行差補正: κ = 20.49552" (aberration constant)
  const sunLon = getSolarLongitude(jd)
  const aberration = -20.49552 / 3600 * Math.cos((sunLon - geoLon) * RAD)

  return normalizeAngle(geoLon + aberration)
}

/**
 * 冥王星の地心黄経（Meeus Chapter 37 + VSOP87地球 + 動径計算）
 * 有効期間: 1885-2099年
 */
/** @internal plutoOutOfRange - 冥王星計算が有効範囲外の場合true */
export let plutoOutOfRange = false

function getPlutoLongitude(jd: number): number {
  const T = (jd - J2000) / 36525.0

  // 有効期間チェック: 1885-2099年（T: -1.15〜0.99）
  plutoOutOfRange = T < -1.15 || T > 1.0

  const J = 34.35 + 3034.9057 * T
  const S = 50.08 + 1222.1138 * T
  const P = 238.96 + 144.9600 * T

  let sumL = 0
  let sumR = 0
  // 動径用の係数（Meeus Table 37.A のR列、主要項のみ）
  const PLUTO_R_TERMS = [
    [0, 0, 1, 66865439, 68951812],
    [0, 0, 2, -11827535, -332538],
    [0, 0, 3, 1593179, -1439559],
    [0, 0, 4, -18444, 483220],
    [0, 0, 5, -65977, -85431],
    [0, 0, 6, 31174, -6032],
    [1, 0, 0, -30843, -25218],
    [1, 0, 1, 18763, 17457],
    [2, 0, 0, -29876, 9223],
    [0, 1, 0, 20204, 42372],
    [0, 1, 1, 4042, -21517],
    [1, 0, -1, -27947, -20489],
    [1, 1, 0, 3223, -7555],
  ]

  for (const term of PLUTO_TERMS) {
    const [jc, sc, pc, sinCoeff, cosCoeff] = term
    const arg = (jc * J + sc * S + pc * P) * RAD
    sumL += sinCoeff * Math.sin(arg) + cosCoeff * Math.cos(arg)
  }

  for (const term of PLUTO_R_TERMS) {
    const [jc, sc, pc, sinCoeff, cosCoeff] = term
    const arg = (jc * J + sc * S + pc * P) * RAD
    sumR += sinCoeff * Math.sin(arg) + cosCoeff * Math.cos(arg)
  }

  const helioLon = normalizeAngle(238.958116 + 144.9600341 * T + sumL / 1000000.0)
  const plutoR = 40.7241346 + sumR / 10000000.0 // AU

  // 冥王星の黄緯（Meeus Chapter 37 簡易版: 軌道傾斜角17.1°考慮）
  // 黄緯の主要項
  let sumB = 0
  const PLUTO_B_TERMS = [
    [0, 0, 1, -5453098, -14974876],
    [0, 0, 2, 3527363, 1672673],
    [0, 0, 3, -1050939, 327763],
    [0, 0, 4, 178691, -291925],
    [0, 0, 5, 18763, 100448],
    [0, 0, 6, -30697, 8283],
    [1, 0, 0, 20349, -24552],
    [1, 0, 1, -16617, 19928],
    [2, 0, 0, -6150, -9592],
    [0, 1, 0, -10157, -9285],
    [0, 1, 1, 17113, -6000],
    [1, 0, -1, 10938, 23040],
  ]
  for (const term of PLUTO_B_TERMS) {
    const [jc, sc, pc, sinCoeff, cosCoeff] = term
    const arg = (jc * J + sc * S + pc * P) * RAD
    sumB += sinCoeff * Math.sin(arg) + cosCoeff * Math.cos(arg)
  }
  const helioBeta = (-3.908239 + sumB / 1000000.0) * RAD // 黄緯（ラジアン）

  // 地球の日心座標（VSOP87高精度版）
  const earth = getEarthHeliocentricXY(jd)

  // 3D日心→地心変換（黄緯を考慮）
  const helioLonR = helioLon * RAD
  const cosB = Math.cos(helioBeta)
  const xP = plutoR * cosB * Math.cos(helioLonR) - earth.x
  const yP = plutoR * cosB * Math.sin(helioLonR) - earth.y
  // z成分は黄経計算には不要だが、黄緯が大きい場合にcosB補正で精度向上

  const plutoGeoLon = Math.atan2(yP, xP) * DEG

  // 年周光行差補正
  const sunLonP = getSolarLongitude(jd)
  const aberrationP = -20.49552 / 3600 * Math.cos((sunLonP - plutoGeoLon) * RAD)

  return normalizeAngle(plutoGeoLon + aberrationP)
}

// ---------- 正真交点（ノースノード）----------

/**
 * 月の正真交点（True North Node）の黄経を計算
 * Meeus "Astronomical Algorithms" Chapter 47 — 拡張摂動項
 */
function getTrueNorthNodeLongitude(jd: number): number {
  const T = (jd - J2000) / 36525.0

  // 月の平均昇交点黄経（Meeus式、高精度）
  let Omega = 125.0445479 - 1934.1362891 * T
    + 0.0020754 * T * T + T * T * T / 467441 - T * T * T * T / 60616000

  // 基本引数
  const M = (357.5291092 + 35999.0502909 * T - 0.0001536 * T * T) * RAD
  const Mm = (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * RAD
  const F = (93.2720950 + 483202.0175233 * T - 0.0036539 * T * T) * RAD
  const D = (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * RAD

  // 拡張摂動項（Meeus Table 47.A — 上位14項）
  Omega += -1.4979 * Math.sin(2 * (D - F))
    - 0.1500 * Math.sin(M)
    - 0.1226 * Math.sin(2 * D)
    + 0.1176 * Math.sin(2 * F)
    - 0.0801 * Math.sin(2 * (Mm - F))
    + 0.0316 * Math.sin(2 * (D - Mm - F))
    + 0.0200 * Math.sin(2 * (D - F) - M)
    - 0.0187 * Math.sin(D)
    - 0.0162 * Math.sin(2 * (D - Mm))
    + 0.0143 * Math.sin(Mm)
    - 0.0111 * Math.sin(2 * (D - F) + Mm)
    + 0.0076 * Math.sin(M - Mm)
    - 0.0067 * Math.sin(D - 2 * F)
    + 0.0063 * Math.sin(2 * D - M)

  return normalizeAngle(Omega)
}

// ---------- カイロン ----------

/**
 * カイロンの地心黄経を計算
 * 軌道要素 + 主要摂動補正（土星・木星からの摂動）
 * 軌道要素: JPL Small-Body Database (epoch J2000.0)
 * 有効期間: 1900-2100年
 */
function getChironLongitude(jd: number): number {
  const T = (jd - J2000) / 36525.0

  // カイロンの軌道要素（J2000.0基準、JPL #10）
  const a = 13.6481
  const e = 0.37911
  const I = 6.930
  const Om = normalizeAngle(209.354 + 0.0130 * T)
  const w = normalizeAngle(339.432 + 0.0260 * T)

  // 平均近点角（キャリブレーション済み）
  // n = 360 / (50.42 * 365.25) = 0.019569°/day = 714.28°/century
  const M0 = 27.64  // J2000.0での平均近点角（astro.com複数日キャリブレーション、歳差補正後再校正）
  const M = normalizeAngle(M0 + 714.28 * T)

  // ケプラー方程式
  const Ecc = solveKepler(M, e)
  const nu = trueAnomaly(Ecc, e)
  const r = a * (1 - e * Math.cos(Ecc))

  const nuR = nu * RAD
  const wR = w * RAD
  const IR = I * RAD
  const OmR = Om * RAD

  // 日心黄道座標（J2000）
  const xJ2000 = r * (Math.cos(OmR) * Math.cos(wR + nuR) - Math.sin(OmR) * Math.sin(wR + nuR) * Math.cos(IR))
  const yJ2000 = r * (Math.sin(OmR) * Math.cos(wR + nuR) + Math.cos(OmR) * Math.sin(wR + nuR) * Math.cos(IR))

  // 歳差回転: J2000 → ecliptic of date
  const psiA = (5029.0966 * T + 1.11113 * T * T) / 3600 * RAD
  const xH = xJ2000 * Math.cos(psiA) - yJ2000 * Math.sin(psiA)
  const yH = xJ2000 * Math.sin(psiA) + yJ2000 * Math.cos(psiA)

  // 地球の日心座標（VSOP87高精度版）
  const earth = getEarthHeliocentricXY(jd)

  // 地心座標
  const chironGeoLon = Math.atan2(yH - earth.y, xH - earth.x) * DEG

  // 年周光行差補正
  const sunLonC = getSolarLongitude(jd)
  const aberrationC = -20.49552 / 3600 * Math.cos((sunLonC - chironGeoLon) * RAD)

  return normalizeAngle(chironGeoLon + aberrationC)
}

// ---------- ASC / MC 計算（プラシーダス） ----------

/**
 * 恒星時（グリニッジ平均恒星時 GMST）を計算
 * @param jd - ユリウス通日
 * @returns 恒星時（度数、0-360）
 */
function getGMST(jd: number): number {
  const Du = jd - J2000
  const T = Du / 36525.0

  // 地球回転角 ERA（IAU 2000 定義）
  const ERA = normalizeAngle(360 * (0.7790572732640 + 1.00273781191135448 * Du))

  // 歳差多項式（IAU 2006、秒角→度）
  const precession = (0.014506
    + 4612.15739966 * T
    + 1.39667721 * T * T
    - 0.00009344 * T * T * T
    + 0.00001882 * T * T * T * T) / 3600

  return normalizeAngle(ERA + precession)
}

/**
 * 黄道傾斜角（平均）を計算
 */
function getObliquity(jd: number): number {
  const T = (jd - J2000) / 36525.0
  // IAU 2000 式（簡略版）
  return 23.4392911 - 0.0130042 * T - 0.00000164 * T * T + 0.000000503 * T * T * T
}

/**
 * ASC（アセンダント）を計算
 * @param jd - ユリウス通日（UTC）
 * @param latitude - 出生地の緯度（度）
 * @param longitude - 出生地の経度（度、東経+）
 * @returns ASCの黄経（度）
 */
export function calculateASC(jd: number, latitude: number, longitude: number): number {
  // 緯度の有効範囲チェック（±66.5°を超えると精度劣化、±90°で数学的に不定）
  const clampedLat = Math.max(-89.99, Math.min(89.99, latitude))

  const T = (jd - J2000) / 36525.0

  // 章動の計算（MCと同じ）
  const Omega = (125.04452 - 1934.136261 * T) * RAD
  const Ls = (280.4665 + 36000.7698 * T) * RAD
  const Lm = (218.3165 + 481267.8813 * T) * RAD
  const nutLon = -17.20 / 3600 * Math.sin(Omega) - 1.32 / 3600 * Math.sin(2 * Ls) - 0.23 / 3600 * Math.sin(2 * Lm) + 0.21 / 3600 * Math.sin(2 * Omega)
  const nutObl = 9.20 / 3600 * Math.cos(Omega) + 0.57 / 3600 * Math.cos(2 * Ls) + 0.10 / 3600 * Math.cos(2 * Lm) - 0.09 / 3600 * Math.cos(2 * Omega)

  const gmst = getGMST(jd)
  const epsMean = getObliquity(jd)
  const epsTrue = epsMean + nutObl

  // Equation of Equinoxes: 平均黄道傾斜角で計算（IAU定義）
  const eqEquinox = nutLon * Math.cos(epsMean * RAD)
  const lst = normalizeAngle(gmst + longitude + eqEquinox)
  const lstR = lst * RAD
  const epsTrueR = epsTrue * RAD
  const latR = clampedLat * RAD

  const y = Math.cos(lstR)
  const x = -(Math.sin(lstR) * Math.cos(epsTrueR) + Math.tan(latR) * Math.sin(epsTrueR))
  return normalizeAngle(Math.atan2(y, x) * DEG)
}

/**
 * MC（天頂、ミッドヘブン）を計算
 * 章動補正付き
 */
export function calculateMC(jd: number, longitude: number): number {
  const T = (jd - J2000) / 36525.0

  // 章動（nutation）の計算
  const Omega = (125.04452 - 1934.136261 * T) * RAD
  const Ls = (280.4665 + 36000.7698 * T) * RAD
  const Lm = (218.3165 + 481267.8813 * T) * RAD
  const nutLon = -17.20 / 3600 * Math.sin(Omega) - 1.32 / 3600 * Math.sin(2 * Ls) - 0.23 / 3600 * Math.sin(2 * Lm) + 0.21 / 3600 * Math.sin(2 * Omega)
  const nutObl = 9.20 / 3600 * Math.cos(Omega) + 0.57 / 3600 * Math.cos(2 * Ls) + 0.10 / 3600 * Math.cos(2 * Lm) - 0.09 / 3600 * Math.cos(2 * Omega)

  const gmst = getGMST(jd)
  const epsMean = getObliquity(jd)
  const epsTrue = epsMean + nutObl

  // Equation of Equinoxes: 平均黄道傾斜角で計算（IAU定義）
  const eqEquinox = nutLon * Math.cos(epsMean * RAD)
  const lst = normalizeAngle(gmst + longitude + eqEquinox)
  const lstR = lst * RAD
  const epsTrueR = epsTrue * RAD

  let mc = Math.atan2(Math.sin(lstR), Math.cos(lstR) * Math.cos(epsTrueR)) * DEG
  return normalizeAngle(mc)
}

/**
 * ASC/MC/DSC/IC を一括計算
 */
export function calculateAngles(jd: number, latitude: number, longitude: number): AnglesData {
  const ascLon = calculateASC(jd, latitude, longitude)
  const mcLon = calculateMC(jd, longitude)
  const dscLon = normalizeAngle(ascLon + 180)
  const icLon = normalizeAngle(mcLon + 180)

  const ascSign = longitudeToSign(ascLon)
  const mcSign = longitudeToSign(mcLon)
  const dscSign = longitudeToSign(dscLon)
  const icSign = longitudeToSign(icLon)

  return {
    asc: { longitude: ascLon, sign: ascSign.sign, degree: ascSign.degree, minute: ascSign.minute, displayDegree: ascSign.displayDegree },
    mc: { longitude: mcLon, sign: mcSign.sign, degree: mcSign.degree, minute: mcSign.minute, displayDegree: mcSign.displayDegree },
    dsc: { longitude: dscLon, sign: dscSign.sign, degree: dscSign.degree, minute: dscSign.minute, displayDegree: dscSign.displayDegree },
    ic: { longitude: icLon, sign: icSign.sign, degree: icSign.degree, minute: icSign.minute, displayDegree: icSign.displayDegree },
  }
}

// ---------- 逆行判定 ----------

/**
 * 惑星が逆行中かを判定（前後1日の黄経変化で判定）
 */
function isRetrograde(planetKey: string, jd: number): boolean {
  if (planetKey === 'sun' || planetKey === 'moon' || planetKey === 'northnode') return false

  const step = 1.0 // 1日
  let lon1: number, lon2: number

  if (planetKey === 'pluto') {
    lon1 = getPlutoLongitude(jd - step)
    lon2 = getPlutoLongitude(jd + step)
  } else if (planetKey === 'chiron') {
    lon1 = getChironLongitude(jd - step)
    lon2 = getChironLongitude(jd + step)
  } else {
    lon1 = getGeocentricPlanetLongitude(planetKey, jd - step)
    lon2 = getGeocentricPlanetLongitude(planetKey, jd + step)
  }

  let diff = lon2 - lon1
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360

  return diff < 0
}

// ---------- 星座・度数変換 ----------

/** 黄経 → 星座 + 度数 */
export function longitudeToSign(longitude: number): {
  sign: ZodiacSign
  signEn: string
  degree: number
  minute: number
  displayDegree: string
} {
  const lon = normalizeAngle(longitude)
  const signIndex = Math.floor(lon / 30)
  const degInSign = lon - signIndex * 30
  const degree = Math.floor(degInSign)
  const minute = Math.floor((degInSign - degree) * 60)

  return {
    sign: ZODIAC_SIGNS[signIndex],
    signEn: ZODIAC_SIGNS_EN[signIndex],
    degree,
    minute,
    displayDegree: `${ZODIAC_SIGNS[signIndex]} ${degree}°${minute.toString().padStart(2, '0')}'`,
  }
}

/** 星座のエレメントを返す */
export function getElement(sign: ZodiacSign): 'fire' | 'earth' | 'air' | 'water' {
  if ((ELEMENTS.fire as readonly string[]).includes(sign)) return 'fire'
  if ((ELEMENTS.earth as readonly string[]).includes(sign)) return 'earth'
  if ((ELEMENTS.air as readonly string[]).includes(sign)) return 'air'
  return 'water'
}

/** 星座のクオリティを返す */
export function getQuality(sign: ZodiacSign): 'cardinal' | 'fixed' | 'mutable' {
  if ((QUALITIES.cardinal as readonly string[]).includes(sign)) return 'cardinal'
  if ((QUALITIES.fixed as readonly string[]).includes(sign)) return 'fixed'
  return 'mutable'
}

// ---------- アスペクト計算 ----------

/** 2天体間のアスペクトを判定 */
function findAspect(lon1: number, lon2: number): typeof ASPECTS[number] | null {
  let diff = Math.abs(lon1 - lon2)
  if (diff > 180) diff = 360 - diff

  for (const aspect of ASPECTS) {
    const orb = Math.abs(diff - aspect.angle)
    if (orb <= aspect.orb) {
      return aspect
    }
  }
  return null
}

/** 全天体間のアスペクトを計算 */
function calculateAspects(planets: PlanetPosition[]): AspectInfo[] {
  const aspects: AspectInfo[] = []

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i]
      const p2 = planets[j]
      const aspect = findAspect(p1.longitude, p2.longitude)

      if (aspect) {
        let actualAngle = Math.abs(p1.longitude - p2.longitude)
        if (actualAngle > 180) actualAngle = 360 - actualAngle
        const orb = Math.abs(actualAngle - aspect.angle)

        aspects.push({
          planet1: p1.name,
          planet2: p2.name,
          aspect: aspect.name,
          aspectEn: aspect.nameEn,
          symbol: aspect.symbol,
          exactAngle: aspect.angle,
          actualAngle: Math.round(actualAngle * 100) / 100,
          orb: Math.round(orb * 100) / 100,
          nature: aspect.nature,
        })
      }
    }
  }

  // オーブが小さい（正確な）順にソート
  aspects.sort((a, b) => a.orb - b.orb)
  return aspects
}

// ---------- 月相計算 ----------

/** 月相を計算 */
function calculateMoonPhase(sunLon: number, moonLon: number): MoonPhaseInfo {
  let angle = normalizeAngle(moonLon - sunLon)
  const illumination = (1 - Math.cos(angle * RAD)) / 2
  const isWaxing = angle < 180

  // 8分割で月相名を判定
  const phaseIndex = Math.floor(((angle + 22.5) % 360) / 45)
  const emojis = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']

  return {
    phase: MOON_PHASES[phaseIndex],
    angle: Math.round(angle * 100) / 100,
    illumination: Math.round(illumination * 1000) / 1000,
    isWaxing,
    emoji: emojis[phaseIndex],
  }
}

// ---------- メインAPI ----------

/**
 * 指定日時のホロスコープデータを計算
 * @param date - 計算対象のDateオブジェクト（UTC）
 * @param options - 出生地の緯度・経度（ASC/MC計算に必要、省略可）
 * @returns HoroscopeData - 全天体位置・アスペクト・月相・バランス
 */
export function calculateHoroscope(date: Date, options?: { latitude?: number; longitude?: number }): HoroscopeData {
  const jd = dateToJD(date)
  const planetKeys = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']

  const planets: PlanetPosition[] = []

  // 太陽
  const sunLon = getSolarLongitude(jd)
  const sunSign = longitudeToSign(sunLon)
  planets.push({
    name: '太陽',
    nameEn: 'Sun',
    longitude: Math.round(sunLon * 10000) / 10000,
    sign: sunSign.sign,
    signEn: sunSign.signEn,
    degree: sunSign.degree,
    minute: sunSign.minute,
    isRetrograde: false,
    displayDegree: sunSign.displayDegree,
  })

  // 月
  const moonLon = getLunarLongitude(jd)
  const moonSign = longitudeToSign(moonLon)
  planets.push({
    name: '月',
    nameEn: 'Moon',
    longitude: Math.round(moonLon * 10000) / 10000,
    sign: moonSign.sign,
    signEn: moonSign.signEn,
    degree: moonSign.degree,
    minute: moonSign.minute,
    isRetrograde: false,
    displayDegree: moonSign.displayDegree,
  })

  // 水星〜海王星
  for (let i = 0; i < planetKeys.length; i++) {
    const key = planetKeys[i]
    const lon = getGeocentricPlanetLongitude(key, jd)
    const signInfo = longitudeToSign(lon)
    const retro = isRetrograde(key, jd)

    planets.push({
      name: PLANET_NAMES[i + 2],
      nameEn: PLANET_NAMES_EN[i + 2],
      longitude: Math.round(lon * 10000) / 10000,
      sign: signInfo.sign,
      signEn: signInfo.signEn,
      degree: signInfo.degree,
      minute: signInfo.minute,
      isRetrograde: retro,
      displayDegree: signInfo.displayDegree + (retro ? ' ℞' : ''),
    })
  }

  // 冥王星
  const plutoLon = getPlutoLongitude(jd)
  const plutoSign = longitudeToSign(plutoLon)
  const plutoRetro = isRetrograde('pluto', jd)
  planets.push({
    name: '冥王星',
    nameEn: 'Pluto',
    longitude: Math.round(plutoLon * 10000) / 10000,
    sign: plutoSign.sign,
    signEn: plutoSign.signEn,
    degree: plutoSign.degree,
    minute: plutoSign.minute,
    isRetrograde: plutoRetro,
    displayDegree: plutoSign.displayDegree + (plutoRetro ? ' ℞' : ''),
  })

  // 正真交点（ノースノード）
  const nnLon = getTrueNorthNodeLongitude(jd)
  const nnSign = longitudeToSign(nnLon)
  planets.push({
    name: '正真交点',
    nameEn: 'North Node',
    longitude: Math.round(nnLon * 10000) / 10000,
    sign: nnSign.sign,
    signEn: nnSign.signEn,
    degree: nnSign.degree,
    minute: nnSign.minute,
    isRetrograde: false, // ノードは常に逆行的だが慣例上表示しない
    displayDegree: nnSign.displayDegree,
  })

  // カイロン
  const chironLon = getChironLongitude(jd)
  const chironSign = longitudeToSign(chironLon)
  const chironRetro = isRetrograde('chiron', jd)
  planets.push({
    name: 'カイロン',
    nameEn: 'Chiron',
    longitude: Math.round(chironLon * 10000) / 10000,
    sign: chironSign.sign,
    signEn: chironSign.signEn,
    degree: chironSign.degree,
    minute: chironSign.minute,
    isRetrograde: chironRetro,
    displayDegree: chironSign.displayDegree + (chironRetro ? ' ℞' : ''),
  })

  // アスペクト
  const aspects = calculateAspects(planets)

  // 月相
  const moonPhase = calculateMoonPhase(sunLon, moonLon)

  // ASC/MC（出生地情報がある場合のみ）
  let angles: AnglesData = { asc: null, mc: null, dsc: null, ic: null }
  if (options?.latitude !== undefined && options?.longitude !== undefined) {
    angles = calculateAngles(jd, options.latitude, options.longitude)
  }

  // エレメント・クオリティバランス（太陽〜土星の7天体で計算）
  const personalPlanets = planets.slice(0, 7) // 太陽〜土星
  const elementBalance = { fire: 0, earth: 0, air: 0, water: 0 }
  const qualityBalance = { cardinal: 0, fixed: 0, mutable: 0 }

  for (const p of personalPlanets) {
    elementBalance[getElement(p.sign)]++
    qualityBalance[getQuality(p.sign)]++
  }

  return {
    date,
    julianDay: jd,
    planets,
    aspects,
    moonPhase,
    angles,
    elementBalance,
    qualityBalance,
  }
}

/**
 * 今日のトランジットデータを取得
 * @param timezoneOffsetHours - UTCからのオフセット（JST=9、デフォルト9）
 * @returns HoroscopeData - ローカル日付の正午UTCでの全天体配置
 */
export function getTodayTransit(timezoneOffsetHours: number = 9): HoroscopeData {
  // ローカル日付を計算してその日の正午UTCで計算
  const now = new Date()
  const localDate = new Date(now.getTime() + timezoneOffsetHours * 3600000)
  const y = localDate.getUTCFullYear()
  const m = localDate.getUTCMonth()
  const d = localDate.getUTCDate()
  return calculateHoroscope(new Date(Date.UTC(y, m, d, 12, 0, 0)))
}

/**
 * 指定日のトランジットデータを取得
 * @param year - 年
 * @param month - 月（1-12）
 * @param day - 日
 * @returns HoroscopeData
 */
export function getTransitForDate(year: number, month: number, day: number): HoroscopeData {
  return calculateHoroscope(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)))
}

/**
 * 今日の星読みサマリーを生成（AI向けの構造化データ）
 * デイリーオラクルのAI生成プロンプトに渡す用
 */
export function getDailyAstroContext(date?: Date, timezoneOffsetHours: number = 9): {
  date: string
  moonPhase: MoonPhaseInfo
  sunSign: { sign: ZodiacSign; degree: number; minute: number }
  moonSign: { sign: ZodiacSign; degree: number; minute: number }
  northNode: { sign: ZodiacSign; degree: number; minute: number }
  chiron: { sign: ZodiacSign; degree: number; minute: number; isRetrograde: boolean }
  retrograding: string[]
  majorAspects: Array<{ planets: string; aspect: string; nature: string; orb: number }>
  elementBalance: { fire: number; earth: number; air: number; water: number }
  qualityBalance: { cardinal: number; fixed: number; mutable: number }
  allPlanets: Array<{ name: string; sign: ZodiacSign; degree: number; minute: number; isRetrograde: boolean }>
  summary: string
} {
  let d: Date
  if (date) {
    d = date
  } else {
    // タイムゾーン対応: ローカル日付の正午UTCで計算
    const now = new Date()
    const localDate = new Date(now.getTime() + timezoneOffsetHours * 3600000)
    const y = localDate.getUTCFullYear()
    const m = localDate.getUTCMonth()
    const day = localDate.getUTCDate()
    d = new Date(Date.UTC(y, m, day, 12, 0, 0))
  }
  const horoscope = calculateHoroscope(d)

  const sun = horoscope.planets[0]
  const moon = horoscope.planets[1]
  const northNode = horoscope.planets[10] // 正真交点
  const chiron = horoscope.planets[11]    // カイロン

  // 逆行中の天体
  const retrograding = horoscope.planets
    .filter(p => p.isRetrograde)
    .map(p => p.name)

  // 主要アスペクト（オーブ5°以内のもの）
  const majorAspects = horoscope.aspects
    .filter(a => a.orb <= 5)
    .map(a => ({
      planets: `${a.planet1}${a.symbol}${a.planet2}`,
      aspect: a.aspect,
      nature: a.nature,
      orb: a.orb,
    }))

  // 全天体の簡易情報（AI向け）
  const allPlanets = horoscope.planets.map(p => ({
    name: p.name,
    sign: p.sign,
    degree: p.degree,
    minute: p.minute,
    isRetrograde: p.isRetrograde,
  }))

  // 自然言語のサマリー生成
  const summaryParts: string[] = []
  summaryParts.push(`太陽は${sun.sign}${sun.degree}°${sun.minute}'、月は${moon.sign}${moon.degree}°${moon.minute}'。`)
  summaryParts.push(`${horoscope.moonPhase.emoji} ${horoscope.moonPhase.phase}（輝面${Math.round(horoscope.moonPhase.illumination * 100)}%）。`)
  summaryParts.push(`ノースノードは${northNode.sign}${northNode.degree}°。`)

  if (retrograding.length > 0) {
    summaryParts.push(`${retrograding.join('・')}が逆行中。`)
  }

  const tightAspects = majorAspects.filter(a => a.orb <= 3)
  if (tightAspects.length > 0) {
    summaryParts.push(`注目のアスペクト: ${tightAspects.map(a => a.planets).join(', ')}。`)
  }

  return {
    date: d.toISOString().split('T')[0],
    moonPhase: horoscope.moonPhase,
    sunSign: { sign: sun.sign, degree: sun.degree, minute: sun.minute },
    moonSign: { sign: moon.sign, degree: moon.degree, minute: moon.minute },
    northNode: { sign: northNode.sign, degree: northNode.degree, minute: northNode.minute },
    chiron: { sign: chiron.sign, degree: chiron.degree, minute: chiron.minute, isRetrograde: chiron.isRetrograde },
    retrograding,
    majorAspects,
    elementBalance: horoscope.elementBalance,
    qualityBalance: horoscope.qualityBalance,
    allPlanets,
    summary: summaryParts.join(''),
  }
}

// ---------- ユーティリティ ----------

/**
 * ホロスコープデータを人間が読みやすい形に整形
 */
export function formatHoroscope(data: HoroscopeData): string {
  const lines: string[] = []

  lines.push(`=== ホロスコープ: ${data.date.toISOString().split('T')[0]} ===`)
  lines.push('')

  // ASC/MC
  if (data.angles.asc && data.angles.mc && data.angles.dsc && data.angles.ic) {
    lines.push('【アングル】')
    lines.push(`  ASC（上昇点）: ${data.angles.asc.displayDegree}`)
    lines.push(`  MC （天頂） : ${data.angles.mc.displayDegree}`)
    lines.push(`  DSC（下降点）: ${data.angles.dsc.displayDegree}`)
    lines.push(`  IC （天底） : ${data.angles.ic.displayDegree}`)
    lines.push('')
  }

  // 天体位置
  lines.push('【天体位置】')
  for (const p of data.planets) {
    const retro = p.isRetrograde ? ' ℞(逆行)' : ''
    lines.push(`  ${p.name.padEnd(4, '　')}: ${p.displayDegree}${retro}`)
  }
  lines.push('')

  // 月相
  lines.push(`【月相】 ${data.moonPhase.emoji} ${data.moonPhase.phase}`)
  lines.push(`  太陽-月角度: ${data.moonPhase.angle}°  輝面: ${Math.round(data.moonPhase.illumination * 100)}%`)
  lines.push('')

  // アスペクト
  if (data.aspects.length > 0) {
    lines.push('【主要アスペクト】')
    for (const a of data.aspects.filter(a => a.orb <= 5)) {
      lines.push(`  ${a.planet1} ${a.symbol} ${a.planet2} (${a.aspect}, orb ${a.orb}°)`)
    }
    lines.push('')
  }

  // バランス
  lines.push('【エレメントバランス】')
  lines.push(`  火:${data.elementBalance.fire} 地:${data.elementBalance.earth} 風:${data.elementBalance.air} 水:${data.elementBalance.water}`)
  lines.push('【クオリティバランス】')
  lines.push(`  活動:${data.qualityBalance.cardinal} 固定:${data.qualityBalance.fixed} 柔軟:${data.qualityBalance.mutable}`)

  return lines.join('\n')
}
