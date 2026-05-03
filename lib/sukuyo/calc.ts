// ========================================
// 宿曜計算ロジック — FateDecoder Phase B-4
// 仕様書（complete-calculation-logic-for-ai.md §7）に基づく精密実装
//
// アルゴリズム:
//   1. 朔（新月）を太陽・月の黄経一致から動的算出（JST基準）
//   2. 閏月判定: 朔から次朔の間に中気（太陽黄経が30°の倍数）が含まれない月
//   3. 旧暦月1日の宿インデックス（LUNAR_MONTH_BASE_MAP）+ 旧暦日数-1 で宿を算出
//
// 検証済み: 8件全パス
//   1989-10-24 → 軫宿
//   1988-02-20 → 奎宿
//   1979-11-22 → 箕宿  他5件
//
// 既存の lib/fortune-calc.ts の calculateSukuyo と並行運用（Phase D で切り替え予定）
// 本実装が既存実装より優れる点:
//   - 閏月の正確な旧暦月番号取得
//   - 業胎・栄親・友衰の関係計算を提供
// ========================================

const J2000 = 2451545.0
const RAD = Math.PI / 180.0

// ---------- 27宿定義 ----------

/**
 * 27宿（二十七宿）の名称
 * インデックス 0=昴宿 〜 26=胃宿
 */
export const SUKUYO_NAMES = [
  "昴宿", "畢宿", "觜宿", "参宿", "井宿", "鬼宿", "柳宿",
  "星宿", "張宿", "翼宿", "軫宿", "角宿", "亢宿", "氐宿",
  "房宿", "心宿", "尾宿", "箕宿", "斗宿", "女宿", "虚宿",
  "危宿", "室宿", "壁宿", "奎宿", "婁宿", "胃宿"
] as const

export type SukuyoName = typeof SUKUYO_NAMES[number]

/**
 * 旧暦月1日の宿インデックス（LUNAR_MONTH_BASE_MAP）
 *
 * 計算原理:
 *   宿曜暦は旧暦の月日と27宿の対応を固定マッピングで管理する。
 *   各旧暦月の1日に割り当てられた宿インデックスがこのテーブル。
 *   実際の宿 = (base + lunarDay - 1) mod 27
 *
 * この値は宿曜道の伝統的な「七曜宿曜経」に基づく定数値であり、
 * 旧暦月と27宿の周期的対応から導出されている。
 */
const LUNAR_MONTH_BASE_MAP: Record<number, number> = {
  1: 22, 2: 24, 3: 26, 4: 1, 5: 3, 6: 5,
  7: 8,  8: 10, 9: 13, 10: 15, 11: 18, 12: 20
}

// ---------- 型定義 ----------

export interface LunarDateInfo {
  lunarYear: number
  lunarMonth: number
  lunarDay: number
  isLeapMonth: boolean
}

export interface SukuyoResult {
  /** 27宿の宿名（例: "軫宿"） */
  name: SukuyoName
  /** 宿のインデックス (0-26) */
  index: number
  /** 旧暦年 */
  lunarYear: number
  /** 旧暦月 */
  lunarMonth: number
  /** 閏月かどうか */
  isLeapMonth: boolean
  /** 旧暦日 */
  lunarDay: number
}

// ---------- 天文計算 ----------

function normalizeAngle(angle: number): number {
  let a = angle % 360
  if (a < 0) a += 360
  return a
}

function getJulianDay(y: number, m: number, d: number): number {
  let year = y, month = m
  if (month <= 2) { year -= 1; month += 12 }
  const A = Math.floor(year / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + d + B - 1524.5
}

/** JST日のユリウス整数日（宿曜は日本時間基準） */
function jstDayNumber(jd: number): number {
  return Math.floor(jd + 9.0 / 24.0 + 0.5)
}

/**
 * 太陽黄経を計算（VSOP87簡易版）
 * 精度: ±0.01° — 朔・中気計算に使用
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
 * 月の黄経を計算（ELP2000簡易版）
 * 精度: ±0.3° — 朔の検出に十分
 */
function getLunarLongitude(jd: number): number {
  const T = (jd - J2000) / 36525.0

  let Lm = 218.3164477 + 481267.88123421 * T
    - 0.0015786 * T * T + T * T * T / 538841
    - T * T * T * T / 65194000

  const Mm = normalizeAngle(
    134.9634114 + 477198.8676313 * T
    + 0.0089970 * T * T + T * T * T / 69699
    - T * T * T * T / 14712000
  )
  const Ms = normalizeAngle(
    357.5291092 + 35999.0502909 * T
    - 0.0001536 * T * T + T * T * T / 24490000
  )
  const F = normalizeAngle(
    93.2720950 + 483202.0175233 * T
    - 0.0036539 * T * T - T * T * T / 3526000
    + T * T * T * T / 863310000
  )

  const MmR = Mm * RAD, MsR = Ms * RAD, FR = F * RAD

  Lm += 6.288774 * Math.sin(MmR)
    + 1.274027 * Math.sin(2 * FR - MmR)
    + 0.658314 * Math.sin(2 * FR)
    + 0.213618 * Math.sin(2 * MmR)
    - 0.185116 * Math.sin(MsR)
    + 0.058793 * Math.sin(2 * FR - 2 * MmR)
    + 0.057066 * Math.sin(2 * FR - MsR - MmR)
    + 0.053322 * Math.sin(2 * FR + MmR)
    + 0.045758 * Math.sin(2 * FR - MsR)
    - 0.040923 * Math.sin(MsR - MmR)
    - 0.034720 * Math.sin(FR)
    - 0.030383 * Math.sin(MsR + MmR)
    + 0.010675 * Math.sin(4 * FR - MmR)
    + 0.010034 * Math.sin(3 * MmR)

  return normalizeAngle(Lm)
}

/**
 * 朔（新月）を二分探索で計算
 * 太陽黄経と月黄経の差が 0°（合）になる瞬間
 */
function findNewMoon(approxJD: number): number {
  let low = approxJD - 20, high = approxJD + 20
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2
    let diff = getLunarLongitude(mid) - getSolarLongitude(mid)
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360
    if (diff > 0) high = mid; else low = mid
  }
  return (low + high) / 2
}

/**
 * 二分探索で特定の太陽黄経になる JD を求める（中気算出用）
 */
function findJDFromSolarLongitude(targetLong: number, approxJD: number): number {
  let low = approxJD - 20, high = approxJD + 20
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2
    let diff = getSolarLongitude(mid) - targetLong
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360
    if (diff > 0) high = mid; else low = mid
  }
  return (low + high) / 2
}

/**
 * 太陽黄経から旧暦月番号を計算
 * 春分(0°)=3月、穀雨(30°)=4月 … の対応
 */
function solarLongitudeToLunarMonth(solarLong: number): number {
  const idx = Math.floor(((solarLong + 30) % 360) / 30)
  return idx + 1
}

// ---------- 旧暦変換 ----------

/**
 * グレゴリオ暦 → 旧暦変換
 *
 * アルゴリズム:
 *   1. 対象日の朔（新月）を特定
 *   2. 次の朔との間に中気があるか確認
 *   3. 中気がある → その中気から旧暦月番号を決定
 *   4. 中気がない → 閏月（前月の番号を継承）
 *   5. 旧暦日 = 対象日 - 朔の日 + 1
 */
export function toJSTLunarDate(y: number, m: number, d: number): LunarDateInfo {
  const targetJD = getJulianDay(y, m, d)
  const targetDayJST = Math.floor(targetJD + 0.5)

  // 対象日以前の朔を特定
  let nm = findNewMoon(targetJD)
  let nmDayJST = jstDayNumber(nm)
  if (nmDayJST > targetDayJST) {
    nm = findNewMoon(nm - 30)
    nmDayJST = jstDayNumber(nm)
  }

  // 次の朔
  let nextNm = findNewMoon(nm + 30)
  let nextNmDayJST = jstDayNumber(nextNm)
  if (nextNmDayJST <= targetDayJST) {
    nm = nextNm
    nmDayJST = jstDayNumber(nm)
    nextNm = findNewMoon(nm + 30)
    nextNmDayJST = jstDayNumber(nextNm)
  }

  const lunarDay = targetDayJST - nmDayJST + 1

  // 中気の検索
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

  let lunarMonth = 0
  let isLeapMonth = false

  if (hasChuki) {
    lunarMonth = solarLongitudeToLunarMonth(chukiLong)
  } else {
    // 閏月 — 前月の月番号を使用
    isLeapMonth = true
    const prevNm = findNewMoon(nm - 30)
    const prevNmDayJST = jstDayNumber(prevNm)
    lunarMonth = 1
    for (let ang = 0; ang < 360; ang += 30) {
      const chukiJD = findJDFromSolarLongitude(ang, (prevNm + nm) / 2)
      const chukiDay = jstDayNumber(chukiJD)
      if (chukiDay >= prevNmDayJST && chukiDay < nmDayJST) {
        lunarMonth = solarLongitudeToLunarMonth(ang)
        break
      }
    }
  }

  // 旧暦年（11〜12月で翌年1〜2月の場合は前年扱い）
  let lunarYear = y
  if (lunarMonth >= 11 && m <= 2) lunarYear = y - 1

  return { lunarYear, lunarMonth, lunarDay, isLeapMonth }
}

// ---------- メインAPI ----------

/**
 * 宿曜計算
 *
 * @param y 年（グレゴリオ暦）
 * @param m 月
 * @param d 日
 * @returns SukuyoResult — 宿名・旧暦日付・インデックス
 */
export function calculateSukuyo(y: number, m: number, d: number): SukuyoResult {
  const lunar = toJSTLunarDate(y, m, d)

  const base = LUNAR_MONTH_BASE_MAP[lunar.lunarMonth]
  if (base === undefined) {
    // フォールバック（通常は到達しない）
    return {
      name: "昴宿",
      index: 0,
      lunarYear: lunar.lunarYear,
      lunarMonth: lunar.lunarMonth,
      isLeapMonth: lunar.isLeapMonth,
      lunarDay: lunar.lunarDay,
    }
  }

  const index = (base + lunar.lunarDay - 1) % 27
  const name = SUKUYO_NAMES[index]

  return {
    name,
    index,
    lunarYear: lunar.lunarYear,
    lunarMonth: lunar.lunarMonth,
    isLeapMonth: lunar.isLeapMonth,
    lunarDay: lunar.lunarDay,
  }
}

/**
 * 2つの宿の関係を取得（宿曜の三九の秘法）
 *
 * 宿曜の対人関係:
 *   差 0: 命（同宿）— 深い縁、強い影響
 *   差 ±9: 業・胎 — 業の縁
 *   差 ±3: 栄・親 — 発展・成長を促す好相性
 *   差 ±5 or ±4: 友・衰 — 友情、注意も必要
 *   その他: 安 — 穏やかで安定
 */
export function getSukuyoRelation(
  index1: number,
  index2: number
): '命' | '業' | '胎' | '栄' | '親' | '友' | '衰' | '安' {
  const diff = ((index2 - index1 + 27) % 27)
  const minDiff = Math.min(diff, 27 - diff)

  if (minDiff === 0) return '命'
  if (minDiff === 9) return diff === 9 ? '業' : '胎'
  if (minDiff === 3) return diff === 3 ? '栄' : '親'
  if (minDiff === 5) return diff <= 13 ? '友' : '衰'
  if (minDiff === 4) return diff <= 13 ? '衰' : '友'
  return '安'
}
