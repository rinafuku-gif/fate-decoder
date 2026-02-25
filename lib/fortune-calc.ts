// ========================================
// 占術計算ロジック (修正版 v2 - 全8テスト合格済み)
// スタンドアロンモジュール — React/UI依存なし
// ========================================

// ---------- 定数 ----------

export const MAYA_YEARS: Record<number, number> = {
  1950: 168, 1951: 13, 1952: 118, 1953: 223, 1954: 68, 1955: 173, 1956: 18, 1957: 123, 1958: 228, 1959: 73,
  1960: 113, 1961: 218, 1962: 63, 1963: 168, 1964: 13, 1965: 118, 1966: 223, 1967: 68, 1968: 173, 1969: 18,
  1970: 123, 1971: 228, 1972: 73, 1973: 178, 1974: 23, 1975: 128, 1976: 233, 1977: 78, 1978: 183, 1979: 28,
  1980: 133, 1981: 238, 1982: 83, 1983: 188, 1984: 33, 1985: 138, 1986: 243, 1987: 88, 1988: 193, 1989: 38,
  1990: 143, 1991: 248, 1992: 93, 1993: 198, 1994: 43, 1995: 148, 1996: 253, 1997: 98, 1998: 203, 1999: 48,
  2000: 153, 2001: 258, 2002: 103, 2003: 208, 2004: 53, 2005: 158, 2006: 3, 2007: 108, 2008: 213, 2009: 58, 2010: 163
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

export interface FortuneResult {
  date: string
  maya: { kin: number; glyph: string; tone: string; ws: string }
  numerology: { lp: string }
  western: { sign: string }
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

export function calculateAll(y: number, m: number, d: number): FortuneResult {
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

  // 西洋占星術
  const signs = ["山羊座", "水瓶座", "魚座", "牡羊座", "牡牛座", "双子座", "蟹座", "獅子座", "乙女座", "天秤座", "蠍座", "射手座"]
  const borders = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22]
  const sign = d >= borders[m - 1] ? signs[m % 12] : signs[(m - 1 + 12) % 12]

  // 算命学
  const sanmeigaku = calculateSanmeigaku(y, m, d)

  // 宿曜
  const sukuyo = calculateSukuyo(y, m, d)

  return {
    date: `${y}-${m}-${d}`,
    maya: { kin: k, glyph: GLYPHS[gIdx], tone: TONES[tIdx], ws: GLYPHS[wsRoot] },
    numerology: { lp },
    western: { sign },
    bazi: { stem: sanmeigaku.dayStem, weapon: sanmeigaku.mainStar },
    sanmeigaku,
    sukuyo
  }
}
