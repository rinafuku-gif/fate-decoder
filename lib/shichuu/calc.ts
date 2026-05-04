// ========================================
// 四柱推命計算ロジック — FateDecoder 移植版
// 移植元: miwa-gk-report/lib/shichuu/calc.ts
// 既存の lib/fortune-calc.ts の四柱推命部分と並行運用（Phase D で切り替え予定）
// 蔵干テーブル（ZOKAN_TABLE）は Phase C の蔵干 axes で流用する
// ========================================

// ---------- 定数 ----------

export const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
export const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

const J2000 = 2451545.0
const RAD = Math.PI / 180.0

// 五行
export const ELEMENT_JP = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"]
export const ELEMENT_POLARITY = ["陽", "陰", "陽", "陰", "陽", "陰", "陽", "陰", "陽", "陰"]

// 地支の五行
export const BRANCH_ELEMENT = ["水", "土", "木", "木", "土", "火", "火", "土", "金", "金", "土", "水"]

// 通変星マップ — [陰陽異, 陰陽同]
export const STAR_MAP: [string, string][] = [
  ["劫財", "比肩"],
  ["傷官", "食神"],
  ["正財", "偏財"],
  ["正官", "偏官"],
  ["印綬", "偏印"],
]

// 十二運
export const JUNIIN_NAMES = ["長生", "沐浴", "冠帯", "建禄", "帝旺", "衰", "病", "死", "墓", "絶", "胎", "養"]

// 日干ごとの長生の支インデックス（子=0, 丑=1 ...）
const CHOUSEISUPPORT: Record<string, number> = {
  "甲": 11, // 亥
  "乙": 6,  // 午
  "丙": 2,  // 寅
  "戊": 2,  // 寅
  "丁": 11, // 亥
  "己": 6,  // 午
  "庚": 5,  // 巳
  "辛": 0,  // 子
  "壬": 3,  // 卯
  "癸": 8,  // 申
}

/**
 * 蔵干表（地支→[初気日数, 初気, 中気日数, 中気, 本気]）
 * Phase C の蔵干 axes.ts で流用するためエクスポート。
 * 初気・中気の日数は節入りからの経過日数で判定する。
 */
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

/**
 * 節入り角度（各月の始まりの太陽黄経）
 * 月番号→太陽黄経のマッピング。findJDFromSolarLongitude と組み合わせて
 * 任意の年の節入り日時を動的に算出する。
 */
export const SETSUIRI_ANGLES: Record<number, number> = {
  1: 285, 2: 315, 3: 345, 4: 15, 5: 45, 6: 75,
  7: 105, 8: 135, 9: 165, 10: 195, 11: 225, 12: 255,
}

export const MONTH_BRANCH_MAP: Record<number, number> = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6,
  7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 0,
}

// ---------- 型定義 ----------

export interface ShichuuPillar {
  stem: string     // 天干
  branch: string   // 地支
  zokan: string    // 蔵干（月令）
  hensei: string   // 通変星
  juniin: string   // 十二運
}

export interface ShichuuResult {
  year: ShichuuPillar
  month: ShichuuPillar
  day: ShichuuPillar
  hour: ShichuuPillar | null  // 出生時刻不明の場合null
  dayStem: string
  mainStar: string  // 日柱の通変星（月令蔵干）
}

// ---------- 天文計算 ----------

export function normalizeAngle(angle: number): number {
  let a = angle % 360
  if (a < 0) a += 360
  return a
}

export function getJulianDay(y: number, m: number, d: number): number {
  let year = y, month = m
  if (month <= 2) { year -= 1; month += 12 }
  const A = Math.floor(year / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + d + B - 1524.5
}

/**
 * 太陽黄経を計算（VSOP87簡易版）
 * 精度: ±0.01° 程度。節入り日の特定に十分な精度。
 */
function getSolarLongitude(jd: number): number {
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

/**
 * 二分探索で特定の太陽黄経になるJDを求める
 * 探索範囲 ±20日で収束精度 1e-9 JD（約0.09ミリ秒）
 */
function findJDFromSolarLongitude(targetLong: number, approxJD: number): number {
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

// ---------- 四柱推命計算 ----------

/**
 * 通変星を計算
 * @param dayStemId 日干のインデックス (0-9)
 * @param targetStemId 対象天干のインデックス (0-9)
 */
function calcHensei(dayStemId: number, targetStemId: number): string {
  const meElem = Math.floor(dayStemId / 2)
  const mePol = dayStemId % 2
  const targetElem = Math.floor(targetStemId / 2)
  const targetPol = targetStemId % 2
  const relation = ((targetElem - meElem) % 5 + 5) % 5
  const isSamePolarity = mePol === targetPol
  return STAR_MAP[relation][isSamePolarity ? 1 : 0]
}

/**
 * 十二運を計算
 * @param dayStem 日干
 * @param branch 地支
 */
function calcJuniin(dayStem: string, branch: string): string {
  const branchIdx = BRANCHES.indexOf(branch)
  const chouseiIdx = CHOUSEISUPPORT[dayStem] ?? 0
  // 陰干は逆行、陽干は順行
  const stemIdx = STEMS.indexOf(dayStem)
  const isYin = stemIdx % 2 === 1
  let offset: number
  if (isYin) {
    offset = ((chouseiIdx - branchIdx) + 12) % 12
  } else {
    offset = (branchIdx - chouseiIdx + 12) % 12
  }
  return JUNIIN_NAMES[offset]
}

/**
 * 四柱推命の完全計算
 * @param y 年
 * @param m 月
 * @param d 日
 * @param birthHour 出生時刻の時 (0-23, 省略可)
 * @param birthMinute 出生時刻の分 (0-59, 省略可)
 */
export function calculateShichuu(
  y: number, m: number, d: number,
  birthHour?: number, birthMinute?: number
): ShichuuResult {
  const jd = getJulianDay(y, m, d)

  // --- 日柱 ---
  const dayStemBranch = (Math.floor(jd + 0.5) + 49) % 60
  const dayStemId = dayStemBranch % 10
  const dayBranchId = dayStemBranch % 12
  const dayStem = STEMS[dayStemId]
  const dayBranch = BRANCHES[dayBranchId]

  // --- 月柱（節入り日を太陽黄経で動的算出）---
  const setsuAngle = SETSUIRI_ANGLES[m]
  const approxSetsuJD = getJulianDay(y, m, 1)
  const setsuJD = findJDFromSolarLongitude(setsuAngle, approxSetsuJD)
  const isAfterSetsu = jd >= setsuJD
  let sanmeiMonth = m
  let sanmeiYear = y
  if (!isAfterSetsu) {
    sanmeiMonth = m - 1
    if (sanmeiMonth === 0) { sanmeiMonth = 12; sanmeiYear = y - 1 }
  }

  // 年干の算出（立春基準）
  let yearForStem = y
  if (m < 2) {
    yearForStem = y - 1
  } else if (m === 2) {
    const risshunJD = findJDFromSolarLongitude(315, getJulianDay(y, 2, 1))
    if (jd < risshunJD) yearForStem = y - 1
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

  // --- 年柱 ---
  const yearBranchId = yearIndex % 12
  const yearStem = STEMS[yearStemId]
  const yearBranch = BRANCHES[yearBranchId]

  // --- 蔵干（月令：月の節入り後日数で決まる）---
  const actualSetsuAngle = SETSUIRI_ANGLES[sanmeiMonth]
  let actualSetsuJD: number
  if (sanmeiMonth === m) {
    actualSetsuJD = setsuJD
  } else {
    actualSetsuJD = findJDFromSolarLongitude(actualSetsuAngle, getJulianDay(sanmeiYear, sanmeiMonth, 1))
  }
  const daysFromSetsu = Math.floor(jd - actualSetsuJD)
  const zokanEntry = ZOKAN_TABLE[monthBranch]
  const [d1, z1, d2, z2, z3] = zokanEntry
  let mainZokan: string
  if (d1 > 0 && daysFromSetsu < d1) {
    mainZokan = z1
  } else if (d2 > 0 && daysFromSetsu < d1 + d2) {
    mainZokan = z2
  } else {
    mainZokan = z3
  }

  // --- 通変星の計算 ---
  const mainStarZokanId = STEMS.indexOf(mainZokan)
  const mainStar = mainStarZokanId >= 0 ? calcHensei(dayStemId, mainStarZokanId) : "比肩"

  // --- 各柱の通変星・十二運 ---
  const yearHensei = calcHensei(dayStemId, yearStemId)
  const monthHensei = calcHensei(dayStemId, monthStemId)
  const dayHensei = "比肩"

  const yearJuniin = calcJuniin(dayStem, yearBranch)
  const monthJuniin = calcJuniin(dayStem, monthBranch)
  const dayJuniin = calcJuniin(dayStem, dayBranch)

  // --- 年・日の蔵干（主気のみ）---
  const yearZokan = ZOKAN_TABLE[yearBranch]?.[4] ?? ""
  const dayZokan = ZOKAN_TABLE[dayBranch]?.[4] ?? ""

  // --- 時柱 ---
  let hourPillar: ShichuuPillar | null = null
  if (birthHour !== undefined) {
    const adjustedHour = birthHour + (birthMinute ?? 0) / 60
    const hourBranchId = Math.floor(((adjustedHour + 1) % 24) / 2) % 12
    const hourBranch = BRANCHES[hourBranchId]

    const baseHourStem = (dayStemId % 5) * 2
    const hourStemId = (baseHourStem + hourBranchId) % 10
    const hourStem = STEMS[hourStemId]

    const hourZokan = ZOKAN_TABLE[hourBranch]?.[4] ?? ""
    const hourHensei = calcHensei(dayStemId, hourStemId)
    const hourJuniin = calcJuniin(dayStem, hourBranch)

    hourPillar = {
      stem: hourStem,
      branch: hourBranch,
      zokan: hourZokan,
      hensei: hourHensei,
      juniin: hourJuniin,
    }
  }

  return {
    year: {
      stem: yearStem,
      branch: yearBranch,
      zokan: yearZokan,
      hensei: yearHensei,
      juniin: yearJuniin,
    },
    month: {
      stem: STEMS[monthStemId],
      branch: monthBranch,
      zokan: mainZokan,
      hensei: monthHensei,
      juniin: monthJuniin,
    },
    day: {
      stem: dayStem,
      branch: dayBranch,
      zokan: dayZokan,
      hensei: dayHensei,
      juniin: dayJuniin,
    },
    hour: hourPillar,
    dayStem,
    mainStar,
  }
}
