// ========================================
// 占術計算ロジック - 完全修正版 v2
// ========================================

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
const MANSIONS_27 = [
  "昴", "畢", "觜", "参", "井", "鬼", "柳", "星", "張", "翼", "軫", "角", "亢", "氐", "房", "心", "尾", "箕", "斗", "女", "虚", "危", "室", "壁", "奎", "婁", "胃"
]

const J2000 = 2451545.0
const RAD = Math.PI / 180.0

function normalizeAngle(angle: number): number {
  let a = angle % 360
  if (a < 0) a += 360
  return a
}

// ========================================
// ユリウス通日 (JD) - UT正午基準
// ========================================
function getJulianDay(y: number, m: number, d: number): number {
  let year = y, month = m
  if (month <= 2) { year -= 1; month += 12 }
  const A = Math.floor(year / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + d + B - 1524.5
}

// JST日のJulian Day Number (整数) を返す
// jd_ut: UTでのJD値
// JST = UT + 9h なので、JD値に9/24を足してからfloor(+0.5)で日番号化
function jstDayNumber(jd_ut: number): number {
  return Math.floor(jd_ut + 9.0 / 24.0 + 0.5)
}

// ========================================
// 太陽黄経 (VSOP87簡易版)
// ========================================
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

// ========================================
// 月黄経 (Jean Meeus)
// ========================================
function getLunarLongitude(jd: number): number {
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

// ========================================
// 二分法: 指定太陽黄経のJDを求める
// ========================================
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

// ========================================
// 朔（新月）のJDを求める (Newton法)
// ========================================
function findNewMoon(approxJD: number): number {
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

// ========================================
// 旧暦変換
// ========================================
interface LunarDate {
  lunarYear: number
  lunarMonth: number
  lunarDay: number
  isLeapMonth: boolean
}

function solarLongitudeToMonth(solarLong: number): number {
  // 中気の太陽黄経 → 旧暦月番号
  // 雨水(330°)→1月, 春分(0°)→2月, 穀雨(30°)→3月, ...
  const idx = Math.floor(((solarLong + 30) % 360) / 30)
  return idx + 1
}

function toLunarDate(y: number, m: number, d: number): LunarDate {
  const targetJD = getJulianDay(y, m, d) // UT正午
  const targetDayJST = Math.floor(targetJD + 0.5) // 整数JDN (= 暦日)

  // 対象日付近の朔を探す
  let nm = findNewMoon(targetJD)
  let nmDayJST = jstDayNumber(nm) // 朔のJST日番号

  // 朔がターゲット日より後なら、前の朔を探す
  if (nmDayJST > targetDayJST) {
    nm = findNewMoon(nm - 30)
    nmDayJST = jstDayNumber(nm)
  }

  // さらに次の朔がターゲット以前なら、そちらが正しい朔
  let nextNm = findNewMoon(nm + 30)
  let nextNmDayJST = jstDayNumber(nextNm)
  if (nextNmDayJST <= targetDayJST) {
    nm = nextNm
    nmDayJST = jstDayNumber(nm)
    nextNm = findNewMoon(nm + 30)
    nextNmDayJST = jstDayNumber(nextNm)
  }

  const lunarDay = targetDayJST - nmDayJST + 1

  // 旧暦月の決定: 中気法
  // この朔月に含まれる中気を調べる
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
    // 前の朔月の中気を調べて月番号を決定
    const prevNm = findNewMoon(nm - 30)
    const prevNmDayJST = jstDayNumber(prevNm)
    lunarMonth = 1 // fallback
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
  if (lunarMonth >= 11 && m <= 2) {
    lunarYear = y - 1
  }

  return { lunarYear, lunarMonth, lunarDay, isLeapMonth }
}

// ========================================
// 宿曜占星術計算 (27宿)
// ========================================
function calculateSukuyo(y: number, m: number, d: number): string {
  const lunar = toLunarDate(y, m, d)

  // 旧暦月1日の起点宿インデックス (伝統的固定値)
  const baseMap: Record<number, number> = {
    1: 22, 2: 24, 3: 26, 4: 1, 5: 3, 6: 5,
    7: 8, 8: 10, 9: 13, 10: 15, 11: 18, 12: 20
  }

  const base = baseMap[lunar.lunarMonth]
  if (base === undefined) return "不明"

  const idx = (base + lunar.lunarDay - 1) % 27
  return MANSIONS_27[idx] + "宿"
}

// ========================================
// 算命学計算
// ========================================
const SETSUIRI_ANGLES: Record<number, number> = {
  1: 285, 2: 315, 3: 345, 4: 15, 5: 45, 6: 75,
  7: 105, 8: 135, 9: 165, 10: 195, 11: 225, 12: 255,
}

const MONTH_BRANCH_MAP: Record<number, number> = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6,
  7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 0,
}

const ZOKAN_TABLE: Record<string, [number, string, number, string, string]> = {
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

const STAR_MAP: [string, string][] = [
  ["石門星", "貫索星"],
  ["調舒星", "鳳閣星"],
  ["司禄星", "禄存星"],
  ["牽牛星", "車騎星"],
  ["玉堂星", "龍高星"],
]

function calculateSanmeigaku(y: number, m: number, d: number) {
  const jd = getJulianDay(y, m, d)
  const dayStemBranch = (Math.floor(jd + 0.5) + 49) % 60
  const dayStemId = dayStemBranch % 10
  const dayStem = STEMS[dayStemId]

  // 節入り日の動的計算
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

  // 年干支 (立春基準)
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
  const yearBranchId = yearIndex % 12

  // 月干支 (五虎遁月法)
  const monthBranchId = MONTH_BRANCH_MAP[sanmeiMonth]
  const monthBranch = BRANCHES[monthBranchId]
  const baseMonthStem = ((yearStemId % 5) * 2 + 2) % 10
  let branchDiff = monthBranchId - 2
  if (branchDiff < 0) branchDiff += 12
  const monthStemId = (baseMonthStem + branchDiff) % 10

  // 蔵干: 節入りからの経過日数で判定
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

  // 十大主星
  const meElem = Math.floor(dayStemId / 2)
  const mePol = dayStemId % 2
  const targetStemId = STEMS.indexOf(zokan)
  const targetElem = Math.floor(targetStemId / 2)
  const targetPol = targetStemId % 2
  const relation = ((targetElem - meElem) % 5 + 5) % 5
  const isSamePolarity = mePol === targetPol
  const mainStar = STAR_MAP[relation][isSamePolarity ? 1 : 0]

  return { dayStem, mainStar, zokan, daysFromSetsu, sanmeiMonth, monthBranch }
}

// ========================================
// マヤ暦 KIN (ルックアップテーブル方式 - 検証済み)
// ========================================
const MAYA_YEARS: Record<number, number> = {
  1950: 168, 1951: 13, 1952: 118, 1953: 223, 1954: 68, 1955: 173, 1956: 18, 1957: 123, 1958: 228, 1959: 73,
  1960: 113, 1961: 218, 1962: 63, 1963: 168, 1964: 13, 1965: 118, 1966: 223, 1967: 68, 1968: 173, 1969: 18,
  1970: 123, 1971: 228, 1972: 73, 1973: 178, 1974: 23, 1975: 128, 1976: 233, 1977: 78, 1978: 183, 1979: 28,
  1980: 133, 1981: 238, 1982: 83, 1983: 188, 1984: 33, 1985: 138, 1986: 243, 1987: 88, 1988: 193, 1989: 38,
  1990: 143, 1991: 248, 1992: 93, 1993: 198, 1994: 43, 1995: 148, 1996: 253, 1997: 98, 1998: 203, 1999: 48,
  2000: 153, 2001: 258, 2002: 103, 2003: 208, 2004: 53, 2005: 158, 2006: 3, 2007: 108, 2008: 213, 2009: 58, 2010: 163
}
const MAYA_MONTHS: Record<number, number> = { 1: 259, 2: 30, 3: 58, 4: 89, 5: 119, 6: 150, 7: 180, 8: 211, 9: 242, 10: 272, 11: 303, 12: 333 }

function calculateMayanKin(y: number, m: number, d: number): number {
  let yc = MAYA_YEARS[y]
  if (yc === undefined) {
    // テーブル外の年はJDベースで算出
    const diff = y - 2000
    const shift = (365 * diff) % 260
    yc = ((153 + shift) % 260 + 260) % 260
  }
  const mc = MAYA_MONTHS[m]
  let k = (yc + mc + d) % 260
  if (k === 0) k = 260
  return k
}

// ========================================
// 検証テスト
// ========================================
const VERIFICATION_DATA = [
  { date: [1979, 11, 22] as const, expected: { kin: 93, stem: "癸", weapon: "石門星", sukuyo: "箕宿" } },
  { date: [1982, 11, 6] as const, expected: { stem: "癸", weapon: "牽牛星", sukuyo: "柳宿" } },
  { date: [1983, 6, 4] as const, expected: { stem: "癸", weapon: "司禄星", sukuyo: "壁宿" } },
  { date: [1983, 6, 29] as const, expected: { stem: "戊", weapon: "玉堂星", sukuyo: "危宿" } },
  { date: [1986, 9, 3] as const, expected: { stem: "庚", weapon: "貫索星", sukuyo: "翼宿" } },
  { date: [1989, 10, 24] as const, expected: { stem: "丁", weapon: "調舒星", sukuyo: "軫宿" } },
  { date: [2000, 1, 1] as const, expected: { stem: "戊", weapon: "司禄星", sukuyo: "心宿" } },
  { date: [1988, 2, 20] as const, expected: { kin: 243, stem: "乙", weapon: "石門星", sukuyo: "奎宿" } },
]

console.log("=== 占術計算ロジック検証 v2 ===\n")

let allPass = true

for (const { date, expected } of VERIFICATION_DATA) {
  const [y, m, d] = date
  const sanmei = calculateSanmeigaku(y, m, d)
  const sukuyo = calculateSukuyo(y, m, d)
  const kin = calculateMayanKin(y, m, d)
  const lunar = toLunarDate(y, m, d)

  console.log(`${y}/${m}/${d}:`)
  console.log(`  旧暦: ${lunar.lunarMonth}月${lunar.lunarDay}日${lunar.isLeapMonth ? '(閏)' : ''}`)
  console.log(`  算命: 月=${sanmei.sanmeiMonth} 支=${sanmei.monthBranch} 蔵干=${sanmei.zokan} 節後=${sanmei.daysFromSetsu}日`)

  const results: string[] = []

  if (expected.kin !== undefined) {
    const pass = kin === expected.kin
    results.push(`KIN: ${pass ? "✓" : "✗"} ${kin} (期待: ${expected.kin})`)
    if (!pass) allPass = false
  }
  if (expected.stem) {
    const pass = sanmei.dayStem === expected.stem
    results.push(`日干: ${pass ? "✓" : "✗"} ${sanmei.dayStem} (期待: ${expected.stem})`)
    if (!pass) allPass = false
  }
  if (expected.weapon) {
    const pass = sanmei.mainStar === expected.weapon
    results.push(`中心星: ${pass ? "✓" : "✗"} ${sanmei.mainStar} (期待: ${expected.weapon})`)
    if (!pass) allPass = false
  }
  if (expected.sukuyo) {
    const pass = sukuyo === expected.sukuyo
    results.push(`宿曜: ${pass ? "✓" : "✗"} ${sukuyo} (期待: ${expected.sukuyo})`)
    if (!pass) allPass = false
  }

  results.forEach(r => console.log(`  ${r}`))
  console.log("")
}

console.log(allPass ? "=== 全テスト合格! ===" : "=== テスト失敗あり ===")
