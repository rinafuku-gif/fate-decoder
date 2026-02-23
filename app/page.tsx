'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { generateStory } from './actions'
import { fetchStoryFromNotion } from './notion-actions'

// ========================================
// 1. 占術計算ロジック (修正版 v2 - 全8テスト合格済み)
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
const GLYPHS = ["赤い竜", "白い風", "青い夜", "黄色い種", "赤い蛇", "白い世界の橋渡し", "青い手", "黄色い星", "赤い月", "白い犬", "青い猿", "黄色い人", "赤い空歩く人", "白い魔法使い", "青い鷲", "黄色い戦士", "赤い地球", "白い鏡", "青い嵐", "黄色い太陽"]
const TONES = ["磁気(1)", "月(2)", "電気(3)", "自己存在(4)", "倍音(5)", "律動(6)", "共振(7)", "銀河(8)", "太陽(9)", "惑星(10)", "スペクトル(11)", "水晶(12)", "宇宙(13)"]

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

// ユリウス通日 (JD) - UT正午基準
function getJulianDay(y: number, m: number, d: number): number {
  let year = y, month = m
  if (month <= 2) { year -= 1; month += 12 }
  const A = Math.floor(year / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + d + B - 1524.5
}

// JST日のJulian Day Number (整数)
function jstDayNumber(jd_ut: number): number {
  return Math.floor(jd_ut + 9.0 / 24.0 + 0.5)
}

// 太陽黄経 (VSOP87簡易版)
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

// 月黄経 (Jean Meeus - 24項)
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

// 二分法: 指定太陽黄経のJDを求める
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

// 朔（新月）のJDを求める (Newton法)
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

// 旧暦変換
interface LunarDate {
  lunarYear: number
  lunarMonth: number
  lunarDay: number
  isLeapMonth: boolean
}

function solarLongitudeToMonth(solarLong: number): number {
  const idx = Math.floor(((solarLong + 30) % 360) / 30)
  return idx + 1
}

function toLunarDate(y: number, m: number, d: number): LunarDate {
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

// 宿曜占星術計算 (27宿)
function calculateSukuyo(y: number, m: number, d: number): string {
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

// 算命学計算
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

// 統合計算関数
function calculateAll(y: number, m: number, d: number) {
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


// ========================================
// 2. React UI - モダン・ミニマルデザイン
// ========================================

export default function FateDecoder() {
  const [screen, setScreen] = useState<'input' | 'loading' | 'result'>('input')
  const [formData, setFormData] = useState({
    name: '', year: '', month: '1', day: '1',
    birthHour: '', birthMinute: '',
    bloodType: 'A', birthPlace: '', concern: ''
  })
  const [consentChecked, setConsentChecked] = useState(false)
  const [resultHtml, setResultHtml] = useState('')
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)
  const [isProcessingInBackground, setIsProcessingInBackground] = useState(false)
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      const ua = navigator.userAgent
      setIsInAppBrowser(/Line|FBAV|FBAN|Instagram|Twitter|Snapchat|WeChat|WhatsApp|Telegram/i.test(ua))
    }
  }, [])

  useEffect(() => {
    const loadFromURL = async () => {
      const params = new URLSearchParams(window.location.search)
      const notionId = params.get('notionId')
      if (notionId) {
        setScreen('loading')
        try {
          const result = await fetchStoryFromNotion(notionId)
          if (result.success && result.story) {
            let story = result.story
            if (!story || typeof story !== 'object') story = {}
            if (!story.prologue || typeof story.prologue !== 'object') {
              story.prologue = { tag: '#はじめに', title: 'あなたの物語', text: 'あなたの性格と運命の物語が始まります。' }
            }
            if (!Array.isArray(story.chapters)) story.chapters = []
            if (!story.final || typeof story.final !== 'object') {
              story.final = { tag: '#まとめ', title: 'これからのあなたへ', text: 'あなたの可能性は、あなた自身の選択で広がっていきます。', magic: '自分を信じて一歩踏み出す' }
            }
            const name = params.get('name') || '診断結果'
            const year = params.get('year') || '1990'
            const month = params.get('month') || '1'
            const day = params.get('day') || '1'
            const data = calculateAll(parseInt(year), parseInt(month), parseInt(day))
            const concern = params.get('concern') || ''
            setResultHtml(renderNovel(name, data, story, decodeURIComponent(concern)))
            setScreen('result')
          } else {
            throw new Error('Failed to load')
          }
        } catch {
          alert('過去の診断データを読み込めませんでした。\n\nもう一度診断をお試しください。')
          setScreen('input')
        }
        return
      }
      if (typeof navigator !== 'undefined' && /Line|FBAV|FBAN|Instagram|Twitter|Snapchat|WeChat|WhatsApp|Telegram/i.test(navigator.userAgent)) return
      const name = params.get('name')
      const year = params.get('year')
      const month = params.get('month')
      const day = params.get('day')
      if (name && year && month && day) {
        setFormData({
          name: decodeURIComponent(name), year, month, day,
          birthHour: params.get('birthHour') || '',
          birthMinute: params.get('birthMinute') || '',
          bloodType: params.get('bloodType') || 'A',
          birthPlace: decodeURIComponent(params.get('birthPlace') || ''),
          concern: decodeURIComponent(params.get('concern') || '')
        })
        setConsentChecked(true)
        setTimeout(() => {
          const form = document.querySelector('form')
          if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
        }, 500)
      }
    }
    loadFromURL()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.year || !formData.month || !formData.day) {
      alert('お名前と生年月日を入力してください。')
      return
    }
    if (!consentChecked) {
      alert('診断結果の保存にご同意ください。')
      return
    }
    setScreen('loading')
    let timedOut = false
    const timeoutId = setTimeout(() => {
      timedOut = true
      setIsProcessingInBackground(true)
      setScreen('input')
      alert('AIが文章を作成中です。\n\n完了したら自動的に結果が表示されます。しばらくお待ちください。')
    }, 60000)

    try {
      const data = calculateAll(parseInt(formData.year), parseInt(formData.month), parseInt(formData.day))

      const prompt = `
あなたは、複数の占術データを読み解いて「その人だけの性格分析レポート」を小説形式で書くライターです。
しいたけ占いのような親しみやすく温かい文体で、読者に深く寄り添うトーンで書いてください。

【対象者】
名前: ${formData.name} (${formData.year}年${formData.month}月${formData.day}日生まれ / ${formData.bloodType}型 / ${formData.birthPlace || '未入力'}出身)

【分析データ】
・マヤ暦: KIN${data.maya.kin} / 太陽の紋章:${data.maya.glyph} / 銀河の音:${data.maya.tone} / ウェイブスペル:${data.maya.ws}
・算命学: 日干[${data.bazi.stem}] / 中心星[${data.bazi.weapon}]
・数秘術: ライフパスナンバー[${data.numerology.lp}]
・西洋占星術: ${data.western.sign}
・宿曜: ${data.sukuyo}

【相談内容】
「${formData.concern || '特になし'}」

【執筆ルール】
1. 専門用語は必ず噛み砕いて説明してください。例：「KIN93」→「KIN93（あなたの誕生日に対応するマヤ暦の番号で、魂の特性を表します）」
2. 「〜という感覚はありませんか？」のような共感・問いかけスタイルを使ってください。
3. 各章は800文字以上。全体で6000文字以上書いてください。
4. 相談内容に合わせて3〜7章を柔軟に構成してください。
5. 抽象的な表現を避け、具体的なシーンや行動例を入れてください。
6. **必ず純粋なJSON形式** で出力してください（Markdownのバッククォートは不要）。

【出力フォーマット】
{
  "prologue": {
    "tag": "#はじめに",
    "title": "序章：（相談内容に合ったタイトル）",
    "text": "悩みに対する深い共感。なぜ今その悩みを持つに至ったかの分析。800文字以上。"
  },
  "chapters": [
    {
      "tag": "#占術名 #キーワード",
      "title": "第1章：（テーマ）",
      "text": "データを使った性格分析。800文字以上。"
    }
  ],
  "final": {
    "tag": "#まとめ",
    "title": "最終章：これからのあなたへ",
    "text": "悩みへの具体的なアドバイス。800文字以上。",
    "magic": "運気を変える具体的なアクション（例：赤い靴下を履く）"
  }
}
`
      const resultText = await generateStory(prompt)
      let cleanJson = resultText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
      cleanJson = cleanJson.replace(/^\uFEFF/, '').replace(/^[\s\uFEFF\xA0]+/, '')
      const jsonStart = cleanJson.search(/^[\{\[]/)
      if (jsonStart === -1) {
        const firstBrace = cleanJson.indexOf('{')
        if (firstBrace !== -1) cleanJson = cleanJson.substring(firstBrace)
      }
      const lastBrace = cleanJson.lastIndexOf('}')
      const lastBracket = cleanJson.lastIndexOf(']')
      const jsonEnd = Math.max(lastBrace, lastBracket)
      if (jsonEnd !== -1) cleanJson = cleanJson.substring(0, jsonEnd + 1)

      let story
      try {
        story = JSON.parse(cleanJson)
      } catch {
        let repairedJson = cleanJson
        const quoteCount = (repairedJson.match(/"/g) || []).length
        if (quoteCount % 2 !== 0) repairedJson += '"'
        let braceCount = (repairedJson.match(/{/g) || []).length - (repairedJson.match(/}/g) || []).length
        let bracketCount = (repairedJson.match(/\[/g) || []).length - (repairedJson.match(/]/g) || []).length
        for (let i = 0; i < braceCount; i++) repairedJson += '}'
        for (let i = 0; i < bracketCount; i++) repairedJson += ']'
        repairedJson = repairedJson.replace(/,(\s*[\]}])/g, '$1')
        try {
          story = JSON.parse(repairedJson)
        } catch {
          throw new Error('AIの出力を解析できませんでした。')
        }
      }

      if (!story || typeof story !== 'object') story = {}
      if (!story.prologue) story.prologue = { tag: '#はじめに', title: 'あなたの物語', text: 'あなたの性格と運命の物語が始まります。' }
      if (!Array.isArray(story.chapters)) story.chapters = []
      if (!story.final) story.final = { tag: '#まとめ', title: 'これからのあなたへ', text: 'あなたの可能性は、あなた自身の選択で広がっていきます。', magic: '自分を信じて一歩踏み出す' }

      setResultHtml(renderNovel(formData.name, data, story, formData.concern))

      const params = new URLSearchParams()
      params.set('name', encodeURIComponent(formData.name))
      params.set('year', formData.year)
      params.set('month', formData.month)
      params.set('day', formData.day)
      if (formData.birthHour) params.set('birthHour', formData.birthHour)
      if (formData.birthMinute) params.set('birthMinute', formData.birthMinute)
      params.set('bloodType', formData.bloodType)
      if (formData.birthPlace) params.set('birthPlace', encodeURIComponent(formData.birthPlace))
      if (formData.concern) params.set('concern', encodeURIComponent(formData.concern))
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)

      const birthDate = `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`
      const birthTime = formData.birthHour && formData.birthMinute !== '' ? `${String(formData.birthHour).padStart(2, '0')}:${String(formData.birthMinute).padStart(2, '0')}` : ''
      const toneNumber = parseInt(data.maya.tone.match(/\((\d+)\)/)?.[1] || '0')

      clearTimeout(timeoutId)
      setIsProcessingInBackground(false)
      setScreen('result')
      setTimeout(() => window.scrollTo(0, 0), 100)

      fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name, birthDate, birthTime,
          bloodType: formData.bloodType, birthPlace: formData.birthPlace,
          concern: formData.concern, kin: data.maya.kin, glyph: data.maya.glyph,
          tone: toneNumber, ws: data.maya.ws, stem: data.bazi.stem,
          weapon: data.bazi.weapon, lp: data.numerology.lp, sign: data.western.sign,
          sukuyo: data.sukuyo, story
        })
      }).then(res => res.json()).then(notionResult => {
        if (notionResult.success && notionResult.pageId) {
          window.history.replaceState({}, '', `${window.location.pathname}?notionId=${notionResult.pageId}`)
        } else {
          console.error('[Notion Save Failed]', notionResult.error)
        }
      }).catch((err) => console.error('[Notion Save Error]', err))

    } catch (e) {
      clearTimeout(timeoutId)
      if (e instanceof Error && e.message.includes('執筆力が本日の限界')) {
        const data = calculateAll(parseInt(formData.year), parseInt(formData.month), parseInt(formData.day))
        setResultHtml(renderPreview(formData.name, data, formData.concern))
        setScreen('result')
        setIsProcessingInBackground(false)
      } else {
        alert(`${e instanceof Error ? e.message : '予期せぬエラーが発生しました。'}\n\nアプリ内ブラウザをお使いの場合は、SafariやChromeで開き直してみてください。`)
        setScreen('input')
      }
    }
  }

  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
      const script = document.createElement('script')
      script.src = src
      script.onload = () => resolve()
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  const handlePrintOrDownload = async () => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const isInApp = /Line|FBAV|FBAN|Instagram|Twitter|Snapchat|WeChat|WhatsApp|Telegram/i.test(ua)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua)
    if (isInApp || isMobile) {
      setIsDownloadingPDF(true)
      try {
        if (typeof window !== 'undefined' && !(window as any).html2canvas) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
        }
        const el = document.getElementById('result-screen')
        if (!el) return
        const canvas = await (window as any).html2canvas(el, { scale: 2 })
        const imgData = canvas.toDataURL('image/png')
        const { jsPDF } = (window as any).jspdf
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const imgWidth = 210
        const pageHeight = 297
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        let heightLeft = imgHeight
        let position = 0
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }
        pdf.save('fate-decoder-result.pdf')
        setIsDownloadingPDF(false)
      } catch {
        setIsDownloadingPDF(false)
        alert('PDF保存に失敗しました。\n\nブラウザの印刷機能 (Ctrl+P / Cmd+P) から「PDFとして保存」をお試しください。')
      }
    } else {
      window.print()
    }
  }

  const handleShare = async () => {
    if (typeof window === 'undefined') return
    const name = formData.name || '私'
    const shareData = {
      title: 'Fate Decoder - AIパーソナルリーディング',
      text: `${name}さんの診断結果`,
      url: window.location.href
    }
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try { await navigator.share(shareData) } catch {}
    } else if (typeof navigator !== 'undefined') {
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('URLをコピーしました。')
      } catch {
        alert('URLのコピーに失敗しました。')
      }
    }
  }

  return (
    <>
      {isProcessingInBackground && (
        <div className="bg-banner">
          <div className="bg-banner-title">AIが文章を作成しています...</div>
          <div className="bg-banner-desc">完了したら自動的に結果が表示されます</div>
        </div>
      )}

      {screen === 'loading' && (
        <div className="loading-screen">
          <div className="loading-spinner" />
          <div className="loading-text">AIがあなたの<br />診断レポートを作成中...</div>
          <p className="loading-desc">あなただけのレポートを執筆しています<br />(30〜60秒ほどかかります)</p>
        </div>
      )}

      {screen === 'input' && (
        <div className="input-screen">
          {isInAppBrowser && (
            <div className="inapp-warning">
              アプリ内ブラウザでは正常に動作しない場合があります。<br />
              <strong>Safari、Chrome等の外部ブラウザで開くこと</strong>をおすすめします。
            </div>
          )}
          <div className="input-card">
            <div className="input-header">
              <h1 className="input-title">Fate Decoder</h1>
              <p className="input-subtitle">運命鑑定士 Grand Master が、6つの占術であなたの問いに答えます</p>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>お名前 <span className="required">*</span></label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="ニックネームでもOK" required />
              </div>
              <div className="form-group">
                <label>生年月日 <span className="required">*</span></label>
                <div className="row-3">
                  <input type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} placeholder="1995" required />
                  <select value={formData.month} onChange={(e) => setFormData({ ...formData, month: e.target.value })} required>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (<option key={m} value={m}>{m}月</option>))}
                  </select>
                  <select value={formData.day} onChange={(e) => setFormData({ ...formData, day: e.target.value })} required>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (<option key={d} value={d}>{d}日</option>))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>出生時間 <span className="optional">(任意)</span></label>
                <div className="row-time">
                  <select value={formData.birthHour} onChange={(e) => setFormData({ ...formData, birthHour: e.target.value })}>
                    <option value="">--</option>
                    {Array.from({ length: 24 }, (_, i) => i).map(h => (<option key={h} value={h}>{String(h).padStart(2, '0')}</option>))}
                  </select>
                  <span className="time-sep">時</span>
                  <select value={formData.birthMinute} onChange={(e) => setFormData({ ...formData, birthMinute: e.target.value })}>
                    <option value="">--</option>
                    {Array.from({ length: 60 }, (_, i) => i).map(m => (<option key={m} value={m}>{String(m).padStart(2, '0')}</option>))}
                  </select>
                  <span className="time-sep">分</span>
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>血液型 <span className="required">*</span></label>
                  <select value={formData.bloodType} onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })} required>
                    <option value="A">A型</option><option value="B">B型</option><option value="O">O型</option><option value="AB">AB型</option><option value="Unknown">不明</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>出生地 <span className="optional">(任意)</span></label>
                  <input type="text" value={formData.birthPlace} onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })} placeholder="例: 東京" />
                </div>
              </div>
              <div className="form-group">
                <label>今、気になっていること・相談したいこと</label>
                <textarea value={formData.concern} onChange={(e) => setFormData({ ...formData, concern: e.target.value })} rows={4} placeholder="例：今の仕事を続けるべきか迷っています..." />
              </div>
              <div className="consent-group">
                <label className="consent-label">
                  <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="consent-checkbox" />
                  <span className="consent-text">
                    診断結果の記録・保存に同意します。
                    <Link href="/privacy" className="consent-link" target="_blank">プライバシーポリシー</Link>
                  </span>
                </label>
              </div>
              <button type="submit" className="submit-btn">診断する</button>
            </form>
          </div>
          <p className="input-footer">マヤ暦・算命学・数秘術・西洋占星術・宿曜・四柱推命の6つの占術を用いてリーディングします。</p>
        </div>
      )}

      {screen === 'result' && (
        <>
          <div id="result-screen" dangerouslySetInnerHTML={{ __html: resultHtml }} />
          <div className="action-bar">
            <button onClick={() => { setScreen('input'); window.scrollTo(0, 0) }} className="fab fab-back" title="新しく診断する">
              もう一度
            </button>
            <button onClick={handlePrintOrDownload} className="fab fab-print" title={isDownloadingPDF ? 'PDF生成中...' : '印刷/PDF保存'} disabled={isDownloadingPDF}>
              {isDownloadingPDF ? '...' : '印刷'}
            </button>
            <button onClick={handleShare} className="fab fab-share" title="シェア">
              共有
            </button>
          </div>
        </>
      )}
    </>
  )
}

// ========================================
// 3. レンダリング関数
// ========================================

function renderNovel(name: string, data: any, story: any, concern: string): string {
  return `
    <div class="result-container">
      <header class="result-header">
        <p class="result-label">Fate Decoder</p>
        <h1 class="result-name">${name} さんへの<br>Grand Master's Reading</h1>
      </header>

      <section class="data-section">
        <h2 class="section-title">あなたの診断データ</h2>
        ${concern ? `<div class="concern-box">
          <div class="concern-label">ご相談内容</div>
          <div class="concern-text">「${concern}」</div>
        </div>` : ''}
        <div class="data-grid">
          <div class="data-card">
            <span class="data-label">KIN番号</span>
            <span class="data-sublabel">マヤ暦</span>
            <span class="data-value">${data.maya.kin}</span>
          </div>
          <div class="data-card">
            <span class="data-label">太陽の紋章</span>
            <span class="data-sublabel">表の自分</span>
            <span class="data-value">${data.maya.glyph}</span>
          </div>
          <div class="data-card">
            <span class="data-label">ウェイブスペル</span>
            <span class="data-sublabel">内なる自分</span>
            <span class="data-value">${data.maya.ws}</span>
          </div>
          <div class="data-card">
            <span class="data-label">銀河の音</span>
            <span class="data-sublabel">役割・才能</span>
            <span class="data-value">${data.maya.tone}</span>
          </div>
          <div class="data-card">
            <span class="data-label">ライフパス</span>
            <span class="data-sublabel">数秘術</span>
            <span class="data-value">${data.numerology.lp}</span>
          </div>
          <div class="data-card">
            <span class="data-label">日干</span>
            <span class="data-sublabel">生まれ持った性質</span>
            <span class="data-value">${data.bazi.stem}</span>
          </div>
          <div class="data-card">
            <span class="data-label">中心星</span>
            <span class="data-sublabel">行動パターン</span>
            <span class="data-value">${data.bazi.weapon}</span>
          </div>
          <div class="data-card">
            <span class="data-label">星座</span>
            <span class="data-sublabel">西洋占星術</span>
            <span class="data-value">${data.western.sign}</span>
          </div>
          <div class="data-card">
            <span class="data-label">宿曜</span>
            <span class="data-sublabel">東洋の星座</span>
            <span class="data-value">${data.sukuyo}</span>
          </div>
        </div>
      </section>

      ${renderSection(story.prologue)}
      ${story.chapters ? story.chapters.map((chapter: any) => renderSection(chapter)).join('\n') : ''}

      <section class="chapter-section final-section">
        <span class="chapter-tag">${story.final?.tag || '#まとめ'}</span>
        <h2 class="chapter-title">${story.final?.title || 'これからのあなたへ'}</h2>
        <div class="chapter-text">
          <p>${(story.final?.text || 'あなたの可能性は、あなた自身の選択で広がっていきます。').replace(/\n/g, '<br>')}</p>
          <div class="magic-box">
            <span class="magic-title">今日からできるアクション</span>
            <strong>${story.final?.magic || '自分を信じて一歩踏み出す'}</strong>
          </div>
        </div>
      </section>

      <footer class="result-footer">
        <p>Fate Decoder - AIパーソナルリーディング</p>
      </footer>
    </div>
  `
}

function renderSection(part: any) {
  if (!part) return ""
  return `
    <section class="chapter-section">
      <span class="chapter-tag">${part.tag || '#章'}</span>
      <h2 class="chapter-title">${part.title || '章'}</h2>
      <div class="chapter-text"><p>${(part.text || '').replace(/\n/g, '<br>')}</p></div>
    </section>`
}

function renderPreview(name: string, data: any, concern: string): string {
  return `
    <div class="result-container">
      <header class="result-header">
        <p class="result-label">Fate Decoder</p>
        <h1 class="result-name">${name} さんの<br>診断データ</h1>
        ${concern ? `<p class="preview-concern">「${concern}」</p>` : ''}
      </header>

      <div class="preview-notice">
        <h2>診断データの算出が完了しました</h2>
        <p>AIによるレポート作成は現在利用上限に達しています。<br/>以下の9つの指標は正常に計算されています。</p>
        <div class="preview-cta">
          <p><strong>明日以降に再度お試しいただくと、</strong><br/>これらのデータをもとにAIが6000文字超の詳細レポートを作成します。</p>
        </div>
      </div>

      <section class="data-section">
        <div class="data-grid">
          <div class="data-card"><span class="data-label">KIN番号</span><span class="data-sublabel">マヤ暦</span><span class="data-value">${data.maya.kin}</span></div>
          <div class="data-card"><span class="data-label">太陽の紋章</span><span class="data-sublabel">表の自分</span><span class="data-value">${data.maya.glyph}</span></div>
          <div class="data-card"><span class="data-label">ウェイブスペル</span><span class="data-sublabel">内なる自分</span><span class="data-value">${data.maya.ws}</span></div>
          <div class="data-card"><span class="data-label">銀河の音</span><span class="data-sublabel">役割・才能</span><span class="data-value">${data.maya.tone}</span></div>
          <div class="data-card"><span class="data-label">ライフパス</span><span class="data-sublabel">数秘術</span><span class="data-value">${data.numerology.lp}</span></div>
          <div class="data-card"><span class="data-label">日干</span><span class="data-sublabel">生まれ持った性質</span><span class="data-value">${data.bazi.stem}</span></div>
          <div class="data-card"><span class="data-label">中心星</span><span class="data-sublabel">行動パターン</span><span class="data-value">${data.bazi.weapon}</span></div>
          <div class="data-card"><span class="data-label">星座</span><span class="data-sublabel">西洋占星術</span><span class="data-value">${data.western.sign}</span></div>
          <div class="data-card"><span class="data-label">宿曜</span><span class="data-sublabel">東洋の星座</span><span class="data-value">${data.sukuyo}</span></div>
        </div>
      </section>

      <footer class="result-footer">
        <p>Fate Decoder - AIパーソナルリーディング</p>
      </footer>
    </div>
  `
}
