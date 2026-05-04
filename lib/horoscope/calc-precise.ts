// ========================================
// ホロスコープ計算エンジン v3.0 — FateDecoder 移植版
// 天体位置: sweph (Swiss Ephemeris) 統一
// アスペクト・ハウス・エレメントバランス・月相は独自実装を維持
// 正真交点(ノースノード)・カイロン・ASC/MC対応
// スタンドアロンモジュール — React/UI依存なし
// 移植元: miwa-gk-report/lib/horoscope/calc.ts
// 既存の lib/horoscope-calc.ts と並行運用（Phase D で切り替え予定）
// ========================================

/**
 * Server-side only.
 * sweph requires Node.js native binding and does not work in browser/edge runtime.
 * Phase D で `app/api/rashisa/route.ts` の Server Action / Route Handler から呼び出す前提。
 * Client Component から直接 import するとビルド時にエラー。
 */

import sweph from 'sweph'

// ---------- sweph 定数 ----------

const SE_SUN       = 0
const SE_MOON      = 1
const SE_MERCURY   = 2
const SE_VENUS     = 3
const SE_MARS      = 4
const SE_JUPITER   = 5
const SE_SATURN    = 6
const SE_URANUS    = 7
const SE_NEPTUNE   = 8
const SE_PLUTO     = 9
const SE_TRUE_NODE = 11
const SE_CHIRON    = 15

const SEFLG_SWIEPH = 2
const SEFLG_SPEED  = 256

// ---------- 基本定数 ----------

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

export interface HoroscopePreciseData {
  date: Date | string
  julianDay: number
  planets: PlanetPosition[]
  aspects: AspectInfo[]
  moonPhase: MoonPhaseInfo
  angles: AnglesData
  /** 12ハウスのカスプ黄経（Placidus）。出生地情報なしの場合は空配列。 */
  houses: number[]
  elementBalance: { fire: number; earth: number; air: number; water: number }
  qualityBalance: { cardinal: number; fixed: number; mutable: number }
}

// ---------- 基本ユーティリティ ----------

function normalizeAngle(angle: number): number {
  if (!Number.isFinite(angle)) return 0
  let a = angle % 360
  if (a < 0) a += 360
  return a
}

/** ユリウス通日 (JD) — Date オブジェクトから */
export function dateToJD(date: Date): number {
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

// ---------- sweph 天体位置計算 ----------

interface SwephResult {
  longitude: number
  speed: number     // 黄経速度（°/日）; 負値 = 逆行
  ok: boolean
}

/**
 * sweph で1天体の黄経と速度を取得。
 * sweph が失敗した場合は ok:false を返す（Chiron の eph ファイル非対応対策）。
 */
function swephCalc(jd: number, planetId: number): SwephResult {
  const result = sweph.calc(jd, planetId, SEFLG_SWIEPH | SEFLG_SPEED) as {
    flag: number
    error: string
    data: number[]
  }
  if (result.flag < 0 || !result.data || result.data[0] === 0) {
    return { longitude: 0, speed: 0, ok: false }
  }
  return {
    longitude: normalizeAngle(result.data[0]),
    speed: result.data[3] ?? 0,
    ok: true,
  }
}

// ---------- カイロン フォールバック（sweph eph非対応時のみ使用）----------

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

function trueAnomaly(E: number, e: number): number {
  const halfE = E / 2
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(halfE),
    Math.sqrt(1 - e) * Math.cos(halfE)
  )
  return nu * DEG
}

/** 太陽黄経（VSOP87簡易版）— カイロン地心変換に必要 */
function getSolarLongitudeSimple(jd: number): number {
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
  return normalizeAngle(sunLon)
}

function getSolarR(jd: number): number {
  const T = (jd - J2000) / 36525.0
  const M = normalizeAngle(357.52911 + 35999.05029 * T - 0.0001537 * T * T)
  const C = (1.914602 - 0.004817 * T) * Math.sin(M * RAD)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M * RAD)
    + 0.000289 * Math.sin(3 * M * RAD)
  const e = 0.016708634 - 0.000042037 * T
  const v = (M + C) * RAD
  return (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(v))
}

/**
 * カイロンの地心黄経（フォールバック用）
 * sweph の .se1 ファイルが利用できない環境向け。
 * 軌道要素: JPL Small-Body Database (epoch J2000.0)
 */
function getChironLongitudeFallback(jd: number): number {
  const T = (jd - J2000) / 36525.0

  const a = 13.6481
  const e = 0.37911
  const I = 6.930
  const Om = normalizeAngle(209.354 + 0.0130 * T)
  const w = normalizeAngle(339.432 + 0.0260 * T)
  const M0 = 27.64
  const M = normalizeAngle(M0 + 714.28 * T)

  const Ecc = solveKepler(M, e)
  const nu = trueAnomaly(Ecc, e)
  const r = a * (1 - e * Math.cos(Ecc))

  const nuR = nu * RAD
  const wR = w * RAD
  const IR = I * RAD
  const OmR = Om * RAD

  const psiA = (5029.0966 * T + 1.11113 * T * T) / 3600 * RAD
  const xJ2000 = r * (Math.cos(OmR) * Math.cos(wR + nuR) - Math.sin(OmR) * Math.sin(wR + nuR) * Math.cos(IR))
  const yJ2000 = r * (Math.sin(OmR) * Math.cos(wR + nuR) + Math.cos(OmR) * Math.sin(wR + nuR) * Math.cos(IR))
  const xH = xJ2000 * Math.cos(psiA) - yJ2000 * Math.sin(psiA)
  const yH = xJ2000 * Math.sin(psiA) + yJ2000 * Math.cos(psiA)

  const sunLon = getSolarLongitudeSimple(jd)
  const earthLonR = (sunLon + 180) * RAD
  const earthR = getSolarR(jd)
  const earthX = earthR * Math.cos(earthLonR)
  const earthY = earthR * Math.sin(earthLonR)

  const chironGeoLon = Math.atan2(yH - earthY, xH - earthX) * DEG
  const aberration = -20.49552 / 3600 * Math.cos((sunLon - chironGeoLon) * RAD)
  return normalizeAngle(chironGeoLon + aberration)
}

// ---------- 逆行判定（速度ベース）----------

function isRetrograde(
  speedOrMode: number | 'fallback',
  jd?: number,
  fallbackFn?: (j: number) => number
): boolean {
  if (speedOrMode === 'fallback' && jd !== undefined && fallbackFn !== undefined) {
    const step = 1.0
    let diff = fallbackFn(jd + step) - fallbackFn(jd - step)
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360
    return diff < 0
  }
  return typeof speedOrMode === 'number' ? speedOrMode < 0 : false
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

// ---------- ASC / MC 計算（プラシーダス）----------

/** 恒星時（グリニッジ平均恒星時 GMST）を計算 */
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

/** 黄道傾斜角（平均）を計算 */
function getObliquity(jd: number): number {
  const T = (jd - J2000) / 36525.0
  return 23.4392911 - 0.0130042 * T - 0.00000164 * T * T + 0.000000503 * T * T * T
}

/** ASC（アセンダント）を計算 */
export function calculateASC(jd: number, latitude: number, longitude: number): number {
  const clampedLat = Math.max(-89.99, Math.min(89.99, latitude))

  const T = (jd - J2000) / 36525.0

  const Omega = (125.04452 - 1934.136261 * T) * RAD
  const Ls = (280.4665 + 36000.7698 * T) * RAD
  const Lm = (218.3165 + 481267.8813 * T) * RAD
  const nutLon = -17.20 / 3600 * Math.sin(Omega) - 1.32 / 3600 * Math.sin(2 * Ls) - 0.23 / 3600 * Math.sin(2 * Lm) + 0.21 / 3600 * Math.sin(2 * Omega)
  const nutObl = 9.20 / 3600 * Math.cos(Omega) + 0.57 / 3600 * Math.cos(2 * Ls) + 0.10 / 3600 * Math.cos(2 * Lm) - 0.09 / 3600 * Math.cos(2 * Omega)

  const gmst = getGMST(jd)
  const epsMean = getObliquity(jd)
  const epsTrue = epsMean + nutObl

  const eqEquinox = nutLon * Math.cos(epsMean * RAD)
  const lst = normalizeAngle(gmst + longitude + eqEquinox)
  const lstR = lst * RAD
  const epsTrueR = epsTrue * RAD
  const latR = clampedLat * RAD

  const y = Math.cos(lstR)
  const x = -(Math.sin(lstR) * Math.cos(epsTrueR) + Math.tan(latR) * Math.sin(epsTrueR))
  return normalizeAngle(Math.atan2(y, x) * DEG)
}

/** MC（天頂、ミッドヘブン）を計算 */
export function calculateMC(jd: number, longitude: number): number {
  const T = (jd - J2000) / 36525.0

  const Omega = (125.04452 - 1934.136261 * T) * RAD
  const Ls = (280.4665 + 36000.7698 * T) * RAD
  const Lm = (218.3165 + 481267.8813 * T) * RAD
  const nutLon = -17.20 / 3600 * Math.sin(Omega) - 1.32 / 3600 * Math.sin(2 * Ls) - 0.23 / 3600 * Math.sin(2 * Lm) + 0.21 / 3600 * Math.sin(2 * Omega)
  const nutObl = 9.20 / 3600 * Math.cos(Omega) + 0.57 / 3600 * Math.cos(2 * Ls) + 0.10 / 3600 * Math.cos(2 * Lm) - 0.09 / 3600 * Math.cos(2 * Omega)

  const gmst = getGMST(jd)
  const epsMean = getObliquity(jd)
  const epsTrue = epsMean + nutObl

  const eqEquinox = nutLon * Math.cos(epsMean * RAD)
  const lst = normalizeAngle(gmst + longitude + eqEquinox)
  const lstR = lst * RAD
  const epsTrueR = epsTrue * RAD

  const mc = Math.atan2(Math.sin(lstR), Math.cos(lstR) * Math.cos(epsTrueR)) * DEG
  return normalizeAngle(mc)
}

/**
 * 12ハウス（Placidus）を計算
 * sweph.houses を使用。失敗時は Equal House（ASCから30°ずつ）にフォールバック。
 */
export function calculateHouses(jd: number, latitude: number, longitude: number): number[] {
  try {
    const result = sweph.houses(jd, latitude, longitude, 'P') as {
      data?: {
        houses?: number[]
        points?: number[]
      }
      error?: string
    } | unknown

    const r = result as { data?: { houses?: number[] }; error?: string }
    if (r.data?.houses && r.data.houses.length >= 12) {
      return r.data.houses.slice(0, 12).map(normalizeAngle)
    }
  } catch {
    // フォールバック: Equal House（ASCから30°ずつ）
  }

  const ascLon = calculateASC(jd, latitude, longitude)
  return Array.from({ length: 12 }, (_, i) => normalizeAngle(ascLon + i * 30))
}

/** ASC/MC/DSC/IC を一括計算 */
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

// 個人天体インデックス（太陽〜土星）
const PERSONAL_PLANET_NAMES = new Set<string>([
  '太陽', '月', '水星', '金星', '火星', '木星', '土星'
])
// トランスサタニアン（個人天体との組み合わせのみ）
const TRANS_SATURNIAN_NAMES = new Set<string>([
  '天王星', '海王星', '冥王星', 'カイロン', '正真交点'
])

/**
 * 全天体間のアスペクトを計算
 * デフォルト: 個人天体（太陽〜土星）同士のアスペクト。
 * トランスサタニアンは個人天体に対するアスペクトのみ含める。
 */
function calculateAspects(
  planets: PlanetPosition[],
  fullPairMode = false,
): AspectInfo[] {
  const aspects: AspectInfo[] = []

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i]
      const p2 = planets[j]

      if (!fullPairMode) {
        const p1IsPersonal = PERSONAL_PLANET_NAMES.has(p1.name)
        const p2IsPersonal = PERSONAL_PLANET_NAMES.has(p2.name)
        const p1IsTransSat = TRANS_SATURNIAN_NAMES.has(p1.name)
        const p2IsTransSat = TRANS_SATURNIAN_NAMES.has(p2.name)
        // トランスサタニアン同士はスキップ
        if (p1IsTransSat && p2IsTransSat) continue
        // 個人天体でなく、かつトランスサタニアン同士でもないペアはスキップ
        if (!p1IsPersonal && !p2IsPersonal) continue
      }

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

  aspects.sort((a, b) => a.orb - b.orb)
  return aspects
}

// ---------- 月相計算 ----------

function calculateMoonPhase(sunLon: number, moonLon: number): MoonPhaseInfo {
  const angle = normalizeAngle(moonLon - sunLon)
  const illumination = (1 - Math.cos(angle * RAD)) / 2
  const isWaxing = angle < 180

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
 * 指定日時のホロスコープデータを計算（精密版）
 * @param date - 計算対象のDateオブジェクト（UTC）
 * @param options - 出生地の緯度・経度（ASC/MC計算に必要、省略可）
 * @returns HoroscopePreciseData - 全天体位置・アスペクト・月相・バランス
 */
export function calculateHoroscopePrecise(
  date: Date,
  options?: { latitude?: number; longitude?: number }
): HoroscopePreciseData {
  const jd = dateToJD(date)
  const planets: PlanetPosition[] = []

  const bodyDefs: Array<{
    id: number
    name: PlanetName
    nameEn: string
    canRetrograde: boolean
  }> = [
    { id: SE_SUN,       name: '太陽',     nameEn: 'Sun',        canRetrograde: false },
    { id: SE_MOON,      name: '月',       nameEn: 'Moon',       canRetrograde: false },
    { id: SE_MERCURY,   name: '水星',     nameEn: 'Mercury',    canRetrograde: true  },
    { id: SE_VENUS,     name: '金星',     nameEn: 'Venus',      canRetrograde: true  },
    { id: SE_MARS,      name: '火星',     nameEn: 'Mars',       canRetrograde: true  },
    { id: SE_JUPITER,   name: '木星',     nameEn: 'Jupiter',    canRetrograde: true  },
    { id: SE_SATURN,    name: '土星',     nameEn: 'Saturn',     canRetrograde: true  },
    { id: SE_URANUS,    name: '天王星',   nameEn: 'Uranus',     canRetrograde: true  },
    { id: SE_NEPTUNE,   name: '海王星',   nameEn: 'Neptune',    canRetrograde: true  },
    { id: SE_PLUTO,     name: '冥王星',   nameEn: 'Pluto',      canRetrograde: true  },
    { id: SE_TRUE_NODE, name: '正真交点', nameEn: 'North Node', canRetrograde: false },
  ]

  for (const def of bodyDefs) {
    const res = swephCalc(jd, def.id)
    const lon = res.ok ? res.longitude : 0
    const signInfo = longitudeToSign(lon)
    const retro = res.ok && def.canRetrograde ? res.speed < 0 : false

    planets.push({
      name: def.name,
      nameEn: def.nameEn,
      longitude: Math.round(lon * 10000) / 10000,
      sign: signInfo.sign,
      signEn: signInfo.signEn,
      degree: signInfo.degree,
      minute: signInfo.minute,
      isRetrograde: retro,
      displayDegree: signInfo.displayDegree + (retro ? ' ℞' : ''),
    })
  }

  // カイロン（sweph 試行 → 失敗時はフォールバック）
  const chironSweph = swephCalc(jd, SE_CHIRON)
  let chironLon: number
  let chironRetro: boolean
  if (chironSweph.ok) {
    chironLon = chironSweph.longitude
    chironRetro = chironSweph.speed < 0
  } else {
    chironLon = getChironLongitudeFallback(jd)
    chironRetro = isRetrograde('fallback', jd, getChironLongitudeFallback)
  }
  const chironSign = longitudeToSign(chironLon)
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

  const aspects = calculateAspects(planets)

  const sunLon = planets.find(p => p.name === '太陽')?.longitude ?? 0
  const moonLon = planets.find(p => p.name === '月')?.longitude ?? 0
  const moonPhase = calculateMoonPhase(sunLon, moonLon)

  let angles: AnglesData = { asc: null, mc: null, dsc: null, ic: null }
  let houses: number[] = []
  if (options?.latitude !== undefined && options?.longitude !== undefined) {
    angles = calculateAngles(jd, options.latitude, options.longitude)
    houses = calculateHouses(jd, options.latitude, options.longitude)
  }

  // エレメント・クオリティバランス（太陽〜土星の7天体で計算）
  const personalPlanets = planets.slice(0, 7)
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
    houses,
    elementBalance,
    qualityBalance,
  }
}

// ---------- 後方互換エクスポート ----------

/** 太陽黄経（sweph経由） */
export function getSolarLongitude(jd: number): number {
  const res = swephCalc(jd, SE_SUN)
  return res.ok ? res.longitude : getSolarLongitudeSimple(jd)
}

/** 月黄経（sweph経由） */
export function getLunarLongitude(jd: number): number {
  const res = swephCalc(jd, SE_MOON)
  return res.ok ? res.longitude : 0
}
