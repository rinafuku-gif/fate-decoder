// ========================================
// 算命学計算ロジック — FateDecoder Phase B-3
// 仕様書（complete-calculation-logic-for-ai.md §6）に基づく精密実装
//
// 実装方針:
//   - 節入り日は太陽黄経から動的算出（if文による個別補正禁止）
//   - 十大主星は蔵干テーブルを通じて日干との五行・陰陽関係から決定
//   - 蔵干テーブルは lib/shichuu/calc.ts の ZOKAN_TABLE を流用
// ========================================

import {
  STEMS,
  BRANCHES,
  ZOKAN_TABLE,
  SETSUIRI_ANGLES,
  MONTH_BRANCH_MAP,
  normalizeAngle,
  getJulianDay,
} from '../shichuu/calc'

const J2000 = 2451545.0
const RAD = Math.PI / 180.0

// ---------- 定数 ----------

/**
 * 十大主星マップ（算命学）
 * 五行の関係番号 → [陰陽異（=異質）, 陰陽同（=同質）]
 *
 * 五行関係（五行の差を mod 5 で計算）:
 *   0: 比和（同じ五行）→ 石門星（異）/ 貫索星（同）
 *   1: 漏気（我が生む）→ 調舒星（異）/ 鳳閣星（同）
 *   2: 刺激（我が克す）→ 司禄星（異）/ 禄存星（同）
 *   3: 攻撃（克す者）→  牽牛星（異）/ 車騎星（同）
 *   4: 授気（生む者）→  玉堂星（異）/ 龍高星（同）
 */
const SANMEI_STAR_MAP: [string, string][] = [
  ["石門星", "貫索星"], // 比和
  ["調舒星", "鳳閣星"], // 漏気
  ["司禄星", "禄存星"], // 刺激
  ["牽牛星", "車騎星"], // 攻撃
  ["玉堂星", "龍高星"], // 授気
]

// ---------- 型定義 ----------

export interface SanmeiResult {
  /** 日干 */
  dayStem: string
  /** 月支（算命学の月柱の地支）*/
  monthBranch: string
  /** 節入りからの経過日数 */
  daysFromSetsu: number
  /** 月令蔵干（本気・中気・初気のいずれか） */
  mainZokan: string
  /** 中心星（=日干と月令蔵干の関係から算出した十大主星） */
  centralStar: string
  /** 全十大主星リスト（年・月・日・時柱の蔵干それぞれに対して算出） */
  allStars: SanmeiStarInfo[]
}

export interface SanmeiStarInfo {
  /** 対象となる地支 */
  branch: string
  /** 対象の蔵干 */
  zokan: string
  /** 算出した十大主星 */
  star: string
  /** 蔵干の種別（本気・中気・初気） */
  zokanType: '本気' | '中気' | '初気'
}

// ---------- 天文計算（VSOP87簡易版）----------

/**
 * 太陽黄経を計算
 * 精度: ±0.01° — 節入り日の特定に十分
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
 * 二分探索で特定の太陽黄経になる JD を求める
 * ±20日の範囲で50回反復、精度 ~1e-9 JD（<0.1ミリ秒）
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

// ---------- 算命学計算 ----------

/**
 * 十大主星を算出
 * @param dayStemId 日干のインデックス (0-9)
 * @param targetStemId 対象天干のインデックス (0-9)
 * @returns 十大主星名
 */
function calcSanmeiStar(dayStemId: number, targetStemId: number): string {
  const meElem = Math.floor(dayStemId / 2)
  const mePol = dayStemId % 2
  const targetElem = Math.floor(targetStemId / 2)
  const targetPol = targetStemId % 2
  // 五行の関係: (対象の五行 - 自分の五行) mod 5
  const relation = ((targetElem - meElem) % 5 + 5) % 5
  // 陰陽が同じ → 同質（index 1）、異なる → 異質（index 0）
  const isSamePolarity = mePol === targetPol
  return SANMEI_STAR_MAP[relation][isSamePolarity ? 1 : 0]
}

/**
 * 地支の蔵干リストを取得（本気・中気・初気すべて）
 * ZOKAN_TABLE から初気・中気・本気を抽出してSanmeiStarInfoリストを返す
 */
function getZokanList(branch: string, daysFromSetsu: number): SanmeiStarInfo[] {
  const entry = ZOKAN_TABLE[branch]
  if (!entry) return []

  const [d1, z1, d2, z2, z3] = entry
  const list: SanmeiStarInfo[] = []

  // 初気
  if (z1) {
    list.push({ branch, zokan: z1, star: '', zokanType: '初気' })
  }
  // 中気
  if (z2) {
    list.push({ branch, zokan: z2, star: '', zokanType: '中気' })
  }
  // 本気（必ず存在）
  list.push({ branch, zokan: z3, star: '', zokanType: '本気' })

  // 月令（daysFromSetsu）で主蔵干を判定（月柱の場合のみ意味を持つ）
  void d1; void d2; void daysFromSetsu
  return list
}

/**
 * 算命学の完全計算
 * @param y 年
 * @param m 月
 * @param d 日
 * @param birthHour 出生時刻の時（0-23、省略可）
 * @param birthMinute 出生時刻の分（0-59、省略可）
 */
export function calculateSanmei(
  y: number, m: number, d: number,
  birthHour?: number, birthMinute?: number
): SanmeiResult {
  const jd = getJulianDay(y, m, d)

  // --- 日干 ---
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

  // --- 年干（立春基準）---
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
  const yearBranchId = yearIndex % 12
  const yearBranch = BRANCHES[yearBranchId]

  // --- 月支 ---
  const monthBranchId = MONTH_BRANCH_MAP[sanmeiMonth]
  const monthBranch = BRANCHES[monthBranchId]

  // --- 蔵干（月令：節入り後経過日数で判定）---
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

  // --- 中心星（日干 × 月令蔵干）---
  const mainZokanId = STEMS.indexOf(mainZokan)
  const centralStar = mainZokanId >= 0 ? calcSanmeiStar(dayStemId, mainZokanId) : "貫索星"

  // --- 全十大主星リスト ---
  // 年柱・月柱・日柱・時柱のすべての蔵干に対して主星を算出
  const allStars: SanmeiStarInfo[] = []

  const processedBranches: Array<{ branch: string; daysFromSetsu: number }> = [
    { branch: yearBranch, daysFromSetsu: 0 },
    { branch: monthBranch, daysFromSetsu },
    { branch: dayBranch, daysFromSetsu: 0 },
  ]

  // 時柱（出生時刻がある場合）
  if (birthHour !== undefined) {
    const adjustedHour = birthHour + (birthMinute ?? 0) / 60
    const hourBranchId = Math.floor(((adjustedHour + 1) % 24) / 2) % 12
    const hourBranch = BRANCHES[hourBranchId]
    processedBranches.push({ branch: hourBranch, daysFromSetsu: 0 })
  }

  for (const { branch, daysFromSetsu: days } of processedBranches) {
    const zokanList = getZokanList(branch, days)
    for (const info of zokanList) {
      const zokanId = STEMS.indexOf(info.zokan)
      const star = zokanId >= 0 ? calcSanmeiStar(dayStemId, zokanId) : "貫索星"
      allStars.push({ ...info, star })
    }
  }

  return {
    dayStem,
    monthBranch,
    daysFromSetsu,
    mainZokan,
    centralStar,
    allStars,
  }
}
