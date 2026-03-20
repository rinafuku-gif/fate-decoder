// ========================================
// 占術計算ロジック (修正版 v3 - ホロスコープ統合)
// スタンドアロンモジュール — React/UI依存なし
// ========================================

import { calculateHoroscope } from './horoscope-calc'

// ---------- 定数 ----------

export const MAYA_YEARS: Record<number, number> = {
  1950: 168, 1951: 13, 1952: 118, 1953: 223, 1954: 68, 1955: 173, 1956: 18, 1957: 123, 1958: 228, 1959: 73,
  1960: 113, 1961: 218, 1962: 63, 1963: 168, 1964: 13, 1965: 118, 1966: 223, 1967: 68, 1968: 173, 1969: 18,
  1970: 123, 1971: 228, 1972: 73, 1973: 178, 1974: 23, 1975: 128, 1976: 233, 1977: 78, 1978: 183, 1979: 28,
  1980: 133, 1981: 238, 1982: 83, 1983: 188, 1984: 33, 1985: 138, 1986: 243, 1987: 88, 1988: 193, 1989: 38,
  1990: 143, 1991: 248, 1992: 93, 1993: 198, 1994: 43, 1995: 148, 1996: 253, 1997: 98, 1998: 203, 1999: 48,
  2000: 153, 2001: 258, 2002: 103, 2003: 208, 2004: 53, 2005: 158, 2006: 3, 2007: 108, 2008: 213, 2009: 58, 2010: 163,
  2011: 8, 2012: 113, 2013: 218, 2014: 63, 2015: 168, 2016: 13, 2017: 118, 2018: 223, 2019: 68, 2020: 173,
  2021: 18, 2022: 123, 2023: 228, 2024: 73, 2025: 178, 2026: 23, 2027: 128, 2028: 233, 2029: 78, 2030: 183
}
export const MAYA_MONTHS: Record<number, number> = { 1: 259, 2: 30, 3: 58, 4: 89, 5: 119, 6: 150, 7: 180, 8: 211, 9: 242, 10: 272, 11: 303, 12: 333 }
export const GLYPHS = ["赤い竜", "白い風", "青い夜", "黄色い種", "赤い蛇", "白い世界の橋渡し", "青い手", "黄色い星", "赤い月", "白い犬", "青い猿", "黄色い人", "赤い空歩く人", "白い魔法使い", "青い鷲", "黄色い戦士", "赤い地球", "白い鏡", "青い嵐", "黄色い太陽"]
export const TONES = ["磁気(1)", "月(2)", "電気(3)", "自己存在(4)", "倍音(5)", "律動(6)", "共振(7)", "銀河(8)", "太陽(9)", "惑星(10)", "スペクトル(11)", "水晶(12)", "宇宙(13)"]

export const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
export const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
export const MANSIONS_27 = [
  "昴", "畢", "觜", "参", "井", "鬼", "柳", "星", "張", "翼", "軫", "角", "亢", "氐", "房", "心", "尾", "箕", "斗", "女", "虚", "危", "室", "壁", "奎", "婁", "胃"
]

const J2000 = 2451545.0
const RAD = Math.PI / 180.0

// ---------- 型定義 ----------

export interface LunarDate {
  lunarYear: number
  lunarMonth: number
  lunarDay: number
  isLeapMonth: boolean
}

export interface SanmeigakuResult {
  day: string
  month: string
  year: string
  mainStar: string
  dayStem: string
}

export interface WesternData {
  sign: string  // 太陽星座（後方互換）
  planets: Array<{ name: string; sign: string; isRetrograde: boolean }>
  tightAspects: Array<{ desc: string; nature: string }>
  moonPhase: string
  moonPhaseEmoji: string
  elementBalance: { fire: number; earth: number; air: number; water: number }
  dominantElement: string
  qualityBalance: { cardinal: number; fixed: number; mutable: number }
  retrograding: string[]
  moonCrossesSigns: boolean
  moonRangeStart: string
  moonRangeEnd: string
}

export interface FortuneResult {
  date: string
  maya: { kin: number; glyph: string; tone: string; ws: string }
  numerology: { lp: string }
  western: WesternData
  bazi: { stem: string; weapon: string }
  sanmeigaku: SanmeigakuResult
  sukuyo: string
}

// ---------- 天文計算 ----------

export function normalizeAngle(angle: number): number {
  let a = angle % 360
  if (a < 0) a += 360
  return a
}

/** ユリウス通日 (JD) - UT正午基準 */
export function getJulianDay(y: number, m: number, d: number): number {
  let year = y, month = m
  if (month <= 2) { year -= 1; month += 12 }
  const A = Math.floor(year / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + d + B - 1524.5
}

/** JST日のJulian Day Number (整数) */
export function jstDayNumber(jd_ut: number): number {
  return Math.floor(jd_ut + 9.0 / 24.0 + 0.5)
}

/** 太陽黄経 (VSOP87簡易版) */
export function getSolarLongitude(jd: number): number {
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

/** 月黄経 (Jean Meeus - 24項) */
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

/** 二分法: 指定太陽黄経のJDを求める */
export function findJDFromSolarLongitude(targetLong: number, approxJD: number): number {
  let low = approxJD - 20
  let high = approxJD + 20
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2
    let diff = getSolarLongitude(mid) - targetLong
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360
    if (diff > 0) high = mid; else low = mid
  }
  return (low + high) / 2
}

/** 朔（新月）のJDを求める (Newton法) */
export function findNewMoon(approxJD: number): number {
  let t = approxJD
  for (let i = 0; i < 50; i++) {
    const sl = getSolarLongitude(t)
    const ml = getLunarLongitude(t)
    let diff = ml - sl
    while (diff > 180) diff -= 360
    while (diff < -180) diff += 360
    if (Math.abs(diff) < 0.0001) break
    t -= diff / 12.1908
  }
  return t
}

// ---------- 旧暦変換 ----------

function solarLongitudeToMonth(solarLong: number): number {
  const idx = Math.floor(((solarLong + 30) % 360) / 30)
  return idx + 1
}

export function toLunarDate(y: number, m: number, d: number): LunarDate {
  const targetJD = getJulianDay(y, m, d)
  const targetDayJST = Math.floor(targetJD + 0.5)
  let nm = findNewMoon(targetJD)
  let nmDayJST = jstDayNumber(nm)
  if (nmDayJST > targetDayJST) {
    nm = findNewMoon(nm - 30)
    nmDayJST = jstDayNumber(nm)
  }
  let nextNm = findNewMoon(nm + 30)
  let nextNmDayJST = jstDayNumber(nextNm)
  if (nextNmDayJST <= targetDayJST) {
    nm = nextNm
    nmDayJST = jstDayNumber(nm)
    nextNm = findNewMoon(nm + 30)
    nextNmDayJST = jstDayNumber(nextNm)
  }
  const lunarDay = targetDayJST - nmDayJST + 1
  let chukiLong = -1
  let hasChuki = false
  for (let ang = 0; ang < 360; ang += 30) {
    const chukiJD = findJDFromSolarLongitude(ang, (nm + nextNm) / 2)
    const chukiDayJST = jstDayNumber(chukiJD)
    if (chukiDayJST >= nmDayJST && chukiDayJST < nextNmDayJST) {
      hasChuki = true
      chukiLong = ang
      break
    }
  }
  let lunarMonth: number
  let isLeapMonth = false
  if (hasChuki) {
    lunarMonth = solarLongitudeToMonth(chukiLong)
  } else {
    isLeapMonth = true
    const prevNm = findNewMoon(nm - 30)
    const prevNmDayJST = jstDayNumber(prevNm)
    lunarMonth = 1
    for (let ang = 0; ang < 360; ang += 30) {
      const chukiJD = findJDFromSolarLongitude(ang, (prevNm + nm) / 2)
      const chukiDay = jstDayNumber(chukiJD)
      if (chukiDay >= prevNmDayJST && chukiDay < nmDayJST) {
        lunarMonth = solarLongitudeToMonth(ang)
        break
      }
    }
  }
  let lunarYear = y
  if (lunarMonth >= 11 && m <= 2) lunarYear = y - 1
  return { lunarYear, lunarMonth, lunarDay, isLeapMonth }
}

// ---------- 宿曜占星術 ----------

export function calculateSukuyo(y: number, m: number, d: number): string {
  const lunar = toLunarDate(y, m, d)
  const baseMap: Record<number, number> = {
    1: 22, 2: 24, 3: 26, 4: 1, 5: 3, 6: 5,
    7: 8, 8: 10, 9: 13, 10: 15, 11: 18, 12: 20
  }
  const base = baseMap[lunar.lunarMonth]
  if (base === undefined) return "不明"
  const idx = (base + lunar.lunarDay - 1) % 27
  return MANSIONS_27[idx] + "宿"
}

// ---------- 算命学 ----------

export const SETSUIRI_ANGLES: Record<number, number> = {
  1: 285, 2: 315, 3: 345, 4: 15, 5: 45, 6: 75,
  7: 105, 8: 135, 9: 165, 10: 195, 11: 225, 12: 255,
}
export const MONTH_BRANCH_MAP: Record<number, number> = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6,
  7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 0,
}
export const ZOKAN_TABLE: Record<string, [number, string, number, string, string]> = {
  "子": [0, "", 0, "", "癸"],
  "丑": [9, "癸", 3, "辛", "己"],
  "寅": [7, "戊", 7, "丙", "甲"],
  "卯": [0, "", 0, "", "乙"],
  "辰": [9, "乙", 3, "癸", "戊"],
  "巳": [7, "戊", 7, "庚", "丙"],
  "午": [0, "", 9, "己", "丁"],
  "未": [9, "丁", 3, "乙", "己"],
  "申": [7, "己", 7, "壬", "庚"],
  "酉": [0, "", 0, "", "辛"],
  "戌": [9, "辛", 3, "丁", "戊"],
  "亥": [12, "甲", 0, "", "壬"],
}
export const STAR_MAP: [string, string][] = [
  ["石門星", "貫索星"],
  ["調舒星", "鳳閣星"],
  ["司禄星", "禄存星"],
  ["牽牛星", "車騎星"],
  ["玉堂星", "龍高星"],
]

export function calculateSanmeigaku(y: number, m: number, d: number): SanmeigakuResult {
  const jd = getJulianDay(y, m, d)
  const dayStemBranch = (Math.floor(jd + 0.5) + 49) % 60
  const dayStemId = dayStemBranch % 10
  const dayStem = STEMS[dayStemId]
  const setsuAngle = SETSUIRI_ANGLES[m]
  const approxSetsuJD = getJulianDay(y, m, 1)
  const setsuJD = findJDFromSolarLongitude(setsuAngle, approxSetsuJD)
  const targetJD = jd
  const isAfterSetsu = targetJD >= setsuJD
  let sanmeiMonth = m
  let sanmeiYear = y
  if (!isAfterSetsu) {
    sanmeiMonth = m - 1
    if (sanmeiMonth === 0) { sanmeiMonth = 12; sanmeiYear = y - 1 }
  }
  let yearForStem = y
  if (m < 2) {
    yearForStem = y - 1
  } else if (m === 2) {
    const risshunJD = findJDFromSolarLongitude(315, getJulianDay(y, 2, 1))
    if (targetJD < risshunJD) yearForStem = y - 1
  }
  const yOffset = yearForStem - 1984
  const yearIndex = ((yOffset % 60) + 60) % 60
  const yearStemId = yearIndex % 10
  const monthBranchId = MONTH_BRANCH_MAP[sanmeiMonth]
  const monthBranch = BRANCHES[monthBranchId]
  const baseMonthStem = ((yearStemId % 5) * 2 + 2) % 10
  let branchDiff = monthBranchId - 2
  if (branchDiff < 0) branchDiff += 12
  const monthStemId = (baseMonthStem + branchDiff) % 10
  const actualSetsuAngle = SETSUIRI_ANGLES[sanmeiMonth]
  let actualSetsuJD: number
  if (sanmeiMonth === m) {
    actualSetsuJD = setsuJD
  } else {
    actualSetsuJD = findJDFromSolarLongitude(actualSetsuAngle, getJulianDay(sanmeiYear, sanmeiMonth, 1))
  }
  const daysFromSetsu = Math.floor(targetJD - actualSetsuJD)
  const zokanEntry = ZOKAN_TABLE[monthBranch]
  const [d1, z1, d2, z2, z3] = zokanEntry
  let zokan: string
  if (d1 > 0 && daysFromSetsu < d1) {
    zokan = z1
  } else if (d2 > 0 && daysFromSetsu < d1 + d2) {
    zokan = z2
  } else {
    zokan = z3
  }
  const meElem = Math.floor(dayStemId / 2)
  const mePol = dayStemId % 2
  const targetStemId = STEMS.indexOf(zokan)
  const targetElem = Math.floor(targetStemId / 2)
  const targetPol = targetStemId % 2
  const relation = ((targetElem - meElem) % 5 + 5) % 5
  const isSamePolarity = mePol === targetPol
  const mainStar = STAR_MAP[relation][isSamePolarity ? 1 : 0]
  return {
    day: STEMS[dayStemId] + BRANCHES[dayStemBranch % 12],
    month: STEMS[monthStemId] + BRANCHES[monthBranchId],
    year: STEMS[yearStemId] + BRANCHES[yearIndex % 12],
    mainStar, dayStem
  }
}

// ---------- 統合計算関数 ----------

// ---------- 相性計算ロジック ----------

export type CompatibilityType = 'love' | 'business' | 'general'

export interface CompatibilityScore {
  total: number
  western: { score: number; detail: string }
  numerology: { score: number; detail: string }
  maya: { score: number; detail: string }
  sanmeigaku: { score: number; detail: string }
  shichusuimei: { score: number; detail: string }
  sukuyo: { score: number; detail: string }
}

// 西洋占星術: エレメント相性
function getElement(sign: string): string {
  const fire = ['牡羊座', '獅子座', '射手座']
  const earth = ['牡牛座', '乙女座', '山羊座']
  const air = ['双子座', '天秤座', '水瓶座']
  const water = ['蟹座', '蠍座', '魚座']
  if (fire.includes(sign)) return '火'
  if (earth.includes(sign)) return '地'
  if (air.includes(sign)) return '風'
  if (water.includes(sign)) return '水'
  return '不明'
}

function westernCompatibility(w1: WesternData, w2: WesternData): { score: number; detail: string } {
  // 太陽エレメント相性（基本スコア）
  const sunE1 = getElement(w1.sign), sunE2 = getElement(w2.sign)
  const good: Record<string, string> = { '火': '風', '風': '火', '地': '水', '水': '地' }
  let baseScore: number
  let details: string[] = []

  if (sunE1 === sunE2) {
    baseScore = 85
    details.push(`太陽が同じ${sunE1}のエレメントで自然体でいられる`)
  } else if (good[sunE1] === sunE2) {
    baseScore = 90
    details.push(`太陽の${sunE1}×${sunE2}が好相性で互いの力を引き出す`)
  } else {
    baseScore = 65
    details.push(`太陽の${sunE1}×${sunE2}は異なる価値観が刺激になる`)
  }

  // 月の相性ボーナス（両者の月星座が確定している場合のみ）
  const moon1 = w1.planets[1]?.sign, moon2 = w2.planets[1]?.sign
  if (moon1 && moon2 && !w1.moonCrossesSigns && !w2.moonCrossesSigns) {
    const moonE1 = getElement(moon1), moonE2 = getElement(moon2)
    if (moonE1 === moonE2) {
      baseScore += 4
      details.push(`月も同じ${moonE1}で感情面の相性◎`)
    } else if (good[moonE1] === moonE2) {
      baseScore += 3
      details.push(`月の${moonE1}×${moonE2}も好相性`)
    }
  }

  // 金星の相性（愛情表現の一致）
  const venus1 = w1.planets.find(p => p.name === '金星')?.sign
  const venus2 = w2.planets.find(p => p.name === '金星')?.sign
  if (venus1 && venus2) {
    const vE1 = getElement(venus1), vE2 = getElement(venus2)
    if (vE1 === vE2) {
      baseScore += 3
      details.push(`金星が同じ${vE1}で愛情表現が似ている`)
    }
  }

  return { score: Math.min(98, baseScore), detail: details.join('。') + '。' }
}

// 数秘術: ライフパスナンバー相性
function numerologyCompatibility(lp1: string, lp2: string): { score: number; detail: string } {
  const n1 = parseInt(lp1), n2 = parseInt(lp2)
  if (n1 === n2) return { score: 80, detail: `同じライフパス${n1}同士。深く共感し合えるが、似すぎて衝突も` }
  const great: [number, number][] = [[1, 5], [2, 8], [3, 5], [3, 6], [4, 8], [6, 9], [7, 5], [1, 3]]
  for (const [a, b] of great) {
    if ((n1 === a && n2 === b) || (n1 === b && n2 === a)) {
      return { score: 92, detail: `${n1}×${n2}の黄金コンビ。互いの弱点を補い合える最高の組み合わせ` }
    }
  }
  const good: [number, number][] = [[1, 9], [2, 4], [2, 6], [3, 7], [4, 6], [5, 7], [8, 9]]
  for (const [a, b] of good) {
    if ((n1 === a && n2 === b) || (n1 === b && n2 === a)) {
      return { score: 80, detail: `${n1}×${n2}の好相性。価値観が近く、自然に支え合える` }
    }
  }
  const diff = Math.abs(n1 - n2)
  if (diff <= 2) return { score: 72, detail: `${n1}×${n2}。波長が近く、穏やかな関係を築ける` }
  return { score: 65, detail: `${n1}×${n2}。異なる視点が互いの世界を広げてくれる` }
}

// マヤ暦: 紋章の関係性
function mayaCompatibility(glyph1: string, glyph2: string, kin1: number, kin2: number): { score: number; detail: string } {
  const g1 = GLYPHS.indexOf(glyph1), g2 = GLYPHS.indexOf(glyph2)
  if (g1 === g2) return { score: 88, detail: `同じ「${glyph1}」の紋章。魂のレベルで深く理解し合える` }
  // 類似KIN (反対の色)
  if (Math.abs(g1 - g2) === 10) return { score: 90, detail: `反対の紋章同士「${glyph1}」×「${glyph2}」。強烈に惹かれ合う宿命的な関係` }
  // ガイドKIN
  if ((g1 + g2) % 20 < 5) return { score: 85, detail: `ガイド関係「${glyph1}」→「${glyph2}」。導き合える関係` }
  // KIN番号の近さ
  const kinDiff = Math.abs(kin1 - kin2)
  if (kinDiff <= 4) return { score: 82, detail: `KIN番号が近く（${kin1}と${kin2}）、同じ時代の波に乗るパートナー` }
  if (kinDiff % 20 === 0) return { score: 78, detail: `KINの周期で共鳴する関係。タイミングが合いやすい` }
  return { score: 68, detail: `「${glyph1}」×「${glyph2}」。異なるエネルギーの融合が新たな可能性を開く` }
}

// 算命学: 中心星の相性
function sanmeigakuCompatibility(weapon1: string, weapon2: string): { score: number; detail: string } {
  if (weapon1 === weapon2) return { score: 85, detail: `同じ中心星「${weapon1}」同士。行動パターンが似ていて自然と歩調が合う` }
  // 中心星の五行グループ
  const starElement: Record<string, string> = {
    '貫索星': '木', '石門星': '木', '鳳閣星': '火', '調舒星': '火',
    '禄存星': '土', '司禄星': '土', '車騎星': '金', '牽牛星': '金',
    '龍高星': '水', '玉堂星': '水',
  }
  const e1 = starElement[weapon1], e2 = starElement[weapon2]
  if (!e1 || !e2) return { score: 70, detail: `「${weapon1}」×「${weapon2}」の組み合わせ` }
  const elemNames = ['木', '火', '土', '金', '水']
  const idx1 = elemNames.indexOf(e1), idx2 = elemNames.indexOf(e2)
  if (idx1 === idx2) return { score: 82, detail: `「${weapon1}」×「${weapon2}」は同じ${e1}の気質。共鳴しやすく理解し合える` }
  const isGenerate = (idx1 + 1) % 5 === idx2 || (idx2 + 1) % 5 === idx1
  if (isGenerate) return { score: 88, detail: `「${weapon1}」(${e1})×「${weapon2}」(${e2})は相生の関係。互いの長所を引き出し合える` }
  const isOvercome = (idx1 + 2) % 5 === idx2 || (idx2 + 2) % 5 === idx1
  if (isOvercome) return { score: 60, detail: `「${weapon1}」(${e1})×「${weapon2}」(${e2})は相剋の関係。緊張感があるが成長を促す` }
  return { score: 72, detail: `「${weapon1}」(${e1})×「${weapon2}」(${e2})。バランスの取れた関係` }
}

// 四柱推命: 日柱・年柱・月柱の干支相性
function shichusuimeiCompatibility(s1: SanmeigakuResult, s2: SanmeigakuResult): { score: number; detail: string } {
  const elemNames = ['木', '火', '土', '金', '水']
  // 日干の五行関係（最重要）
  const dayStemIdx1 = STEMS.indexOf(s1.dayStem), dayStemIdx2 = STEMS.indexOf(s2.dayStem)
  const dayElem1 = Math.floor(dayStemIdx1 / 2), dayElem2 = Math.floor(dayStemIdx2 / 2)
  const dayPol1 = dayStemIdx1 % 2, dayPol2 = dayStemIdx2 % 2 // 0=陽, 1=陰

  let score = 70
  const details: string[] = []

  // 日干の五行関係
  if (dayElem1 === dayElem2) {
    score += 8
    details.push(`日干が同じ${elemNames[dayElem1]}の五行（${s1.dayStem}×${s2.dayStem}）。価値観の根本が近い`)
  } else {
    const isGenerate = (dayElem1 + 1) % 5 === dayElem2 || (dayElem2 + 1) % 5 === dayElem1
    const isOvercome = (dayElem1 + 2) % 5 === dayElem2 || (dayElem2 + 2) % 5 === dayElem1
    if (isGenerate) {
      score += 15
      details.push(`日干が相生「${elemNames[dayElem1]}→${elemNames[dayElem2]}」（${s1.dayStem}×${s2.dayStem}）。自然に支え合える関係`)
    } else if (isOvercome) {
      score -= 5
      details.push(`日干が相剋「${elemNames[dayElem1]}×${elemNames[dayElem2]}」（${s1.dayStem}×${s2.dayStem}）。ぶつかりやすいが学びの多い関係`)
    } else {
      score += 5
      details.push(`日干が「${s1.dayStem}×${s2.dayStem}」。適度な距離感のある関係`)
    }
  }

  // 干合（天干の特別な相性: 甲己, 乙庚, 丙辛, 丁壬, 戊癸）
  const gangoSets: [number, number][] = [[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]]
  for (const [a, b] of gangoSets) {
    if ((dayStemIdx1 === a && dayStemIdx2 === b) || (dayStemIdx1 === b && dayStemIdx2 === a)) {
      score += 10
      details.push(`日干が干合（${s1.dayStem}×${s2.dayStem}）。深い結びつきを示す特別な縁`)
      break
    }
  }

  // 陰陽バランス
  if (dayPol1 !== dayPol2) {
    score += 3
    details.push('陰陽が異なり、互いに補い合える')
  }

  return { score: Math.min(Math.max(score, 0), 100), detail: details.join('。') || `${s1.day}×${s2.day}の四柱推命的相性` }
}

// 宿曜: 三九の秘法（27宿の相性）
function sukuyoCompatibility(sukuyo1: string, sukuyo2: string): { score: number; detail: string } {
  const s1 = sukuyo1.replace('宿', ''), s2 = sukuyo2.replace('宿', '')
  const idx1 = MANSIONS_27.indexOf(s1), idx2 = MANSIONS_27.indexOf(s2)
  if (idx1 === -1 || idx2 === -1) return { score: 70, detail: '宿曜の相性計算に必要なデータが不足' }
  if (idx1 === idx2) return { score: 75, detail: `同じ「${sukuyo1}」同士。命の関係。深い縁があるが、良くも悪くも影響が強い` }
  const diff = ((idx2 - idx1) % 27 + 27) % 27
  // 栄・親・友・衰・危・成の6関係をdiffから判定
  if ([3, 6, 9].includes(diff) || [24, 21, 18].includes(diff)) {
    return { score: 88, detail: `「${sukuyo1}」×「${sukuyo2}」は栄・親の関係。互いに発展・成長を促す好相性` }
  }
  if ([1, 4, 10].includes(diff) || [26, 23, 17].includes(diff)) {
    return { score: 82, detail: `「${sukuyo1}」×「${sukuyo2}」は友の関係。自然に打ち解け、信頼関係を築きやすい` }
  }
  if ([2, 5, 8].includes(diff) || [25, 22, 19].includes(diff)) {
    return { score: 60, detail: `「${sukuyo1}」×「${sukuyo2}」は衰・危の関係。注意は必要だが、意識的に補い合えば深い絆に` }
  }
  return { score: 72, detail: `「${sukuyo1}」×「${sukuyo2}」は安の関係。穏やかで安定した関わりが期待できる` }
}

export function calculateCompatibility(data1: FortuneResult, data2: FortuneResult): CompatibilityScore {
  const western = westernCompatibility(data1.western, data2.western)
  const numerology = numerologyCompatibility(data1.numerology.lp, data2.numerology.lp)
  const maya = mayaCompatibility(data1.maya.glyph, data2.maya.glyph, data1.maya.kin, data2.maya.kin)
  const sanmeigaku = sanmeigakuCompatibility(data1.bazi.weapon, data2.bazi.weapon)
  const shichusuimei = shichusuimeiCompatibility(data1.sanmeigaku, data2.sanmeigaku)
  const sukuyo = sukuyoCompatibility(data1.sukuyo, data2.sukuyo)

  // 6占術均等加重（各 1/6 ≈ 16.67%）
  const total = Math.round(
    (western.score + numerology.score + maya.score + sanmeigaku.score + shichusuimei.score + sukuyo.score) / 6
  )

  return { total, western, numerology, maya, sanmeigaku, shichusuimei, sukuyo }
}

// ---------- 統合計算関数 ----------

export function calculateAll(y: number, m: number, d: number, birthHour?: number, birthMinute?: number): FortuneResult {
  // マヤ暦
  let yc = MAYA_YEARS[y]
  if (yc === undefined) {
    const diff = y - 2000
    const shift = (365 * diff) % 260
    yc = ((153 + shift) % 260 + 260) % 260
  }
  const mc = MAYA_MONTHS[m]
  let k = (yc + mc + d) % 260
  if (k === 0) k = 260
  const gIdx = (k - 1) % 20
  const tIdx = (k - 1) % 13
  const wsRoot = ((k - tIdx - 1) % 20 + 20) % 20

  // 数秘術
  const s = "" + y + m + d
  const reduce = (str: string): string => {
    if (["11", "22", "33"].includes(str)) return str
    if (str.length === 1) return str
    let sum = 0
    for (const c of str) sum += parseInt(c)
    return reduce("" + sum)
  }
  const lp = reduce(s)

  // 西洋占星術（ホロスコープ）
  const hasBirthTime = birthHour !== undefined && birthMinute !== undefined
  let horoscopeDate: Date
  let moonCrossesSigns = false
  let moonRangeStartSign = ''
  let moonRangeEndSign = ''

  if (hasBirthTime) {
    // 出生時間あり → 正確な時刻で計算（JST→UTC: -9時間）
    const utcHour = birthHour - 9
    horoscopeDate = new Date(Date.UTC(y, m - 1, d, utcHour, birthMinute, 0))
    // 出生時間が明確なので月の星座は確定
  } else {
    // 出生時間なし → 正午JSTで計算 + 月の移動範囲チェック
    horoscopeDate = new Date(Date.UTC(y, m - 1, d, 3, 0, 0)) // 12:00 JST = 3:00 UTC
    const dayStartJST = new Date(Date.UTC(y, m - 1, d - 1, 15, 0, 0)) // 0:00 JST
    const dayEndJST = new Date(Date.UTC(y, m - 1, d, 14, 59, 0))      // 23:59 JST
    const moonStart = calculateHoroscope(dayStartJST).planets[1]
    const moonEnd = calculateHoroscope(dayEndJST).planets[1]
    moonCrossesSigns = moonStart.sign !== moonEnd.sign
    moonRangeStartSign = moonStart.sign
    moonRangeEndSign = moonEnd.sign
  }

  const horoscope = calculateHoroscope(horoscopeDate)
  const sign = horoscope.planets[0].sign // 太陽星座

  // 天体データを抽出
  const planets = horoscope.planets.map(p => ({
    name: p.name, sign: p.sign, isRetrograde: p.isRetrograde,
  }))
  const tightAspects = horoscope.aspects
    .filter(a => a.orb <= 3)
    .map(a => ({ desc: `${a.planet1}${a.symbol}${a.planet2}(${a.orb}°)`, nature: a.nature }))
  const retrograding = horoscope.planets.filter(p => p.isRetrograde).map(p => p.name)

  // エレメント優勢判定（同点時は全て列挙）
  const eb = horoscope.elementBalance
  const maxVal = Math.max(eb.fire, eb.earth, eb.air, eb.water)
  const elementNames = ['火', '地', '風', '水'] as const
  const elementVals = [eb.fire, eb.earth, eb.air, eb.water]
  const topElements = elementNames.filter((_, i) => elementVals[i] === maxVal)
  const dominantElement = topElements.join('・')

  const western: WesternData = {
    sign,
    planets,
    tightAspects,
    moonPhase: horoscope.moonPhase.phase,
    moonPhaseEmoji: horoscope.moonPhase.emoji,
    elementBalance: horoscope.elementBalance,
    dominantElement,
    qualityBalance: horoscope.qualityBalance,
    retrograding,
    moonCrossesSigns,
    moonRangeStart: moonRangeStartSign,
    moonRangeEnd: moonRangeEndSign,
  }

  // 算命学
  const sanmeigaku = calculateSanmeigaku(y, m, d)

  // 宿曜
  const sukuyo = calculateSukuyo(y, m, d)

  return {
    date: `${y}-${m}-${d}`,
    maya: { kin: k, glyph: GLYPHS[gIdx], tone: TONES[tIdx], ws: GLYPHS[wsRoot] },
    numerology: { lp },
    western,
    bazi: { stem: sanmeigaku.dayStem, weapon: sanmeigaku.mainStar },
    sanmeigaku,
    sukuyo
  }
}
