/**
 * 西洋占星術 → 12軸スコア変換
 * 設計書 §4 準拠
 * Server-side only（sweph依存のHoroscopePreciseDataを受け取る）
 */

import type { OccultismAxisScores } from '../rashisa/types'
import type { HoroscopePreciseData, ZodiacSign } from './calc-precise'

// ---------- エレメント・クオリティ分類 ----------

const WATER_SIGNS: ZodiacSign[] = ['蟹座', '蠍座', '魚座']
const FIRE_SIGNS: ZodiacSign[] = ['牡羊座', '獅子座', '射手座']
const EARTH_SIGNS: ZodiacSign[] = ['牡牛座', '乙女座', '山羊座']
const AIR_SIGNS: ZodiacSign[] = ['双子座', '天秤座', '水瓶座']

/** 感情重視サイン（火・水）→ judgment + */
const EMOTIONAL_SIGNS: ZodiacSign[] = [...FIRE_SIGNS, ...WATER_SIGNS]
/** 論理重視サイン（風・地）→ judgment - */
const LOGICAL_SIGNS: ZodiacSign[] = [...AIR_SIGNS, ...EARTH_SIGNS]

/** 内向サイン */
const INTROVERTED_SIGNS: ZodiacSign[] = ['牡牛座', '蟹座', '乙女座', '蠍座', '山羊座', '魚座']
/** 外向サイン */
const EXTROVERTED_SIGNS: ZodiacSign[] = ['牡羊座', '双子座', '獅子座', '天秤座', '射手座', '水瓶座']

// ---------- ユーティリティ ----------

function clamp(v: number): number {
  return Math.max(-10, Math.min(10, Math.round(v * 10) / 10))
}

function isSign(sign: ZodiacSign, group: ZodiacSign[]): boolean {
  return group.includes(sign)
}

function hasAspect(data: HoroscopePreciseData, p1: string, p2: string, types: string[]): boolean {
  return data.aspects.some(a =>
    ((a.planet1 === p1 && a.planet2 === p2) || (a.planet1 === p2 && a.planet2 === p1)) &&
    types.some(t => a.aspect.includes(t))
  )
}

function getPlanetSign(data: HoroscopePreciseData, name: string): ZodiacSign | null {
  return data.planets.find(p => p.name === name)?.sign ?? null
}

// ---------- 軸計算 ----------

/** 軸1: 判断（論理↔感情）
 * 水星0.4 + 月0.3 + 太陽0.2 + アスペクト調整0.1
 */
function calcJudgment(data: HoroscopePreciseData): number {
  const mercurySign = getPlanetSign(data, '水星')
  const moonSign    = getPlanetSign(data, '月')
  const sunSign     = getPlanetSign(data, '太陽')

  let score = 0

  // 水星（重み0.4）: 風・地 → 論理(-)、火・水 → 感情(+)
  if (mercurySign) {
    if (isSign(mercurySign, LOGICAL_SIGNS))   score += -4
    if (isSign(mercurySign, EMOTIONAL_SIGNS)) score += 4
  }
  // 月（重み0.3）
  if (moonSign) {
    if (isSign(moonSign, LOGICAL_SIGNS))   score += -3
    if (isSign(moonSign, EMOTIONAL_SIGNS)) score += 3
  }
  // 太陽（重み0.2）
  if (sunSign) {
    if (isSign(sunSign, LOGICAL_SIGNS))   score += -2
    if (isSign(sunSign, EMOTIONAL_SIGNS)) score += 2
  }

  // アスペクト調整（水星-月の hard aspect で感情+1、soft で論理-1）
  if (hasAspect(data, '水星', '月', ['スクエア', 'オポジション'])) score += 1
  if (hasAspect(data, '水星', '月', ['トライン', 'セクスタイル']))  score -= 1

  return clamp(score)
}

/** 軸2: エネルギー方向（内向↔外向）
 * 太陽サイン + ASC
 */
function calcEnergyDirection(data: HoroscopePreciseData): number {
  const sunSign = getPlanetSign(data, '太陽')
  const ascSign = data.angles.asc?.sign ?? null

  let score = 0
  if (sunSign) {
    if (isSign(sunSign, INTROVERTED_SIGNS)) score += -2
    if (isSign(sunSign, EXTROVERTED_SIGNS)) score += 2
  }
  if (ascSign) {
    if (isSign(ascSign, INTROVERTED_SIGNS)) score += -2
    if (isSign(ascSign, EXTROVERTED_SIGNS)) score += 2
  }

  // 月が内向サインを強化
  const moonSign = getPlanetSign(data, '月')
  if (moonSign) {
    if (isSign(moonSign, INTROVERTED_SIGNS)) score += -1
    if (isSign(moonSign, EXTROVERTED_SIGNS)) score += 1
  }

  return clamp(score)
}

/** 軸3: 情報の捉え方（直感↔現実）
 * 水星が水・火 → 直感(-)、地・風 → 現実(+)
 */
function calcInformationStyle(data: HoroscopePreciseData): number {
  const mercurySign = getPlanetSign(data, '水星')
  let score = 0

  if (mercurySign) {
    if (isSign(mercurySign, [...WATER_SIGNS, ...FIRE_SIGNS])) score += -2
    if (isSign(mercurySign, [...EARTH_SIGNS, ...AIR_SIGNS]))  score += 2
  }

  // 海王星-水星コンジャンクション → 直感強化
  if (hasAspect(data, '海王星', '水星', ['コンジャンクション'])) score -= 2

  // 天王星-水星コンジャンクション → 直感的閃き
  if (hasAspect(data, '天王星', '水星', ['コンジャンクション', 'スクエア'])) score -= 1

  return clamp(score)
}

/** 軸4: 行動様式（構造↔流動）
 * クオリティ（不動→構造、柔軟→流動）
 */
function calcActionStyle(data: HoroscopePreciseData): number {
  const sunSign = getPlanetSign(data, '太陽')
  let score = 0

  if (sunSign) {
    // 設計書: 不動→-3、活動→0、柔軟→+3
    if (['牡牛座', '獅子座', '蠍座', '水瓶座'].includes(sunSign)) score += -3
    if (['牡羊座', '蟹座', '天秤座', '山羊座'].includes(sunSign)) score += 0
    if (['双子座', '乙女座', '射手座', '魚座'].includes(sunSign))  score += 3
  }

  // 土星-太陽コンジャンクション → 構造強化
  if (hasAspect(data, '土星', '太陽', ['コンジャンクション'])) score -= 2

  return clamp(score)
}

/** 軸5: 対人距離（協調↔独立） */
function calcInterpersonalDistance(data: HoroscopePreciseData): number {
  const sunSign = getPlanetSign(data, '太陽')
  let score = 0

  // 天秤座・蟹座 → 協調、射手・牡羊 → 独立
  if (sunSign) {
    if (['天秤座', '蟹座', '魚座'].includes(sunSign))      score += -2
    if (['射手座', '牡羊座', '水瓶座'].includes(sunSign)) score += 2
  }

  // 火星-太陽コンジャンクション → 独立強化
  if (hasAspect(data, '火星', '太陽', ['コンジャンクション'])) score += 1

  return clamp(score)
}

/** 軸6: 社会性（個↔群）
 * 11ハウスの惑星密度
 */
function calcSocialNature(data: HoroscopePreciseData): number {
  let score = 0

  // 11Hの惑星数（houses配列がある場合）
  if (data.houses.length >= 12) {
    const h11 = data.houses[10]  // 11Hカスプ
    const h12 = data.houses[11]  // 12Hカスプ
    const planetsIn11H = data.planets.filter(p => {
      const lon = p.longitude
      if (h11 <= h12) return lon >= h11 && lon < h12
      // 黄道をまたぐ場合
      return lon >= h11 || lon < h12
    })
    if (planetsIn11H.length >= 3) score += 2
    else if (planetsIn11H.length >= 1) score += 1
  }

  // 水瓶座・双子 → 群れ指向
  const sunSign = getPlanetSign(data, '太陽')
  if (sunSign && ['水瓶座', '双子座', '射手座'].includes(sunSign)) score += 1

  return clamp(score)
}

/** 軸7: 変化への姿勢（保守↔革新）
 * 天王星-太陽スクエア・コンジャンクション → 革新(+)、土星優位 → 保守(-)
 */
function calcChangeAttitude(data: HoroscopePreciseData): number {
  let score = 0

  if (hasAspect(data, '天王星', '太陽', ['スクエア', 'コンジャンクション'])) score += 3
  if (hasAspect(data, '天王星', '太陽', ['トライン', 'セクスタイル']))        score += 1
  if (hasAspect(data, '土星',   '太陽', ['コンジャンクション', 'スクエア']))  score += -3
  if (hasAspect(data, '土星',   '太陽', ['オポジション']))                    score += -2

  // 牡羊・射手・水瓶 → 革新寄り
  const sunSign = getPlanetSign(data, '太陽')
  if (sunSign && ['牡羊座', '射手座', '水瓶座'].includes(sunSign)) score += 1

  return clamp(score)
}

/** 軸8: 生き方の重心（在り方↔やり方）
 * 海王星・冥王星のアスペクト、ノード軸
 */
function calcLifeFocus(data: HoroscopePreciseData): number {
  let score = 0

  // 海王星-太陽コンジャンクション → 在り方(-)
  if (hasAspect(data, '海王星', '太陽', ['コンジャンクション'])) score += -3
  // 土星-太陽コンジャンクション → やり方(+)
  if (hasAspect(data, '土星',   '太陽', ['コンジャンクション'])) score += 2

  // 正真交点が12ハウスにある → 在り方志向
  const northNode = data.planets.find(p => p.name === '正真交点')
  if (northNode && data.houses.length >= 12) {
    const h12 = data.houses[11]
    const h1  = data.houses[0]
    const lon = northNode.longitude
    if (h12 <= h1 ? (lon >= h12 && lon < h1) : (lon >= h12 || lon < h1)) {
      score += -2
    }
  }

  return clamp(score)
}

/** 軸9: 自己表現（受容↔主張） */
function calcSelfExpression(data: HoroscopePreciseData): number {
  let score = 0

  // 火星-太陽コンジャンクション → 主張(+)
  if (hasAspect(data, '火星', '太陽', ['コンジャンクション'])) score += 2
  // 土星-太陽ハードアスペクト → 受容(-)
  if (hasAspect(data, '土星', '太陽', ['スクエア', 'オポジション'])) score += -1

  // ASC が外向サインなら主張
  const ascSign = data.angles.asc?.sign
  if (ascSign && isSign(ascSign, EXTROVERTED_SIGNS)) score += 1
  if (ascSign && isSign(ascSign, INTROVERTED_SIGNS)) score += -1

  return clamp(score)
}

/** 軸10: 他者理解（共感↔客観）
 * 月星座が水サイン → 共感(-)、地・風 → 客観(+)
 */
function calcOtherUnderstanding(data: HoroscopePreciseData): number {
  const moonSign   = getPlanetSign(data, '月')
  const venusSign  = getPlanetSign(data, '金星')
  let score = 0

  if (moonSign) {
    if (isSign(moonSign, WATER_SIGNS))                     score += -3
    if (isSign(moonSign, [...EARTH_SIGNS, ...AIR_SIGNS])) score += 2
  }
  if (venusSign) {
    if (isSign(venusSign, WATER_SIGNS))  score += -1
    if (isSign(venusSign, EARTH_SIGNS))  score += 1
  }

  return clamp(score)
}

/** 軸11: 感性（粗↔繊細）
 * 金星サイン、海王星アスペクト、月相
 */
function calcSensitivity(data: HoroscopePreciseData): number {
  const venusSign = getPlanetSign(data, '金星')
  let score = 0

  // 金星が水・地サイン → 繊細(-)、火 → 粗(+)
  if (venusSign) {
    if (isSign(venusSign, [...WATER_SIGNS, ...EARTH_SIGNS])) score += -2
    if (isSign(venusSign, FIRE_SIGNS))                       score += 2
  }

  // 海王星-太陽アスペクト → 繊細
  if (hasAspect(data, '海王星', '太陽', ['コンジャンクション', 'トライン', 'セクスタイル'])) score += -2

  // 月相: 新月・満月の近く → 感度高い(-)
  const moonAngle = data.moonPhase.angle
  if (moonAngle < 30 || moonAngle > 330) score += -1   // 新月
  if (moonAngle > 150 && moonAngle < 210) score += -1  // 満月

  return clamp(score)
}

/** 軸12: 創造性（再現↔創造）
 * 天王星・海王星アスペクト、5ハウス
 */
function calcCreativity(data: HoroscopePreciseData): number {
  let score = 0

  if (hasAspect(data, '天王星', '太陽', ['コンジャンクション', 'トライン', 'セクスタイル'])) score += 3
  if (hasAspect(data, '天王星', '太陽', ['スクエア', 'オポジション']))                       score += 2
  if (hasAspect(data, '海王星', '太陽', ['コンジャンクション']))                              score += 2

  // 5ハウスの惑星
  if (data.houses.length >= 6) {
    const h5 = data.houses[4]
    const h6 = data.houses[5]
    const planetsIn5H = data.planets.filter(p => {
      const lon = p.longitude
      if (h5 <= h6) return lon >= h5 && lon < h6
      return lon >= h5 || lon < h6
    })
    if (planetsIn5H.length >= 2) score += 2
    else if (planetsIn5H.length === 1) score += 1
  }

  return clamp(score)
}

// ---------- メインAPI ----------

/**
 * 西洋占星術データを12軸スコアに変換
 * @param data calculateHoroscopePrecise() の出力
 */
export function toAxisScores(data: HoroscopePreciseData): OccultismAxisScores {
  return {
    occultism: '西洋占星術',
    rawData: data,
    axisScores: {
      judgment:              calcJudgment(data),
      energyDirection:       calcEnergyDirection(data),
      informationStyle:      calcInformationStyle(data),
      actionStyle:           calcActionStyle(data),
      interpersonalDistance: calcInterpersonalDistance(data),
      socialNature:          calcSocialNature(data),
      changeAttitude:        calcChangeAttitude(data),
      lifeFocus:             calcLifeFocus(data),
      selfExpression:        calcSelfExpression(data),
      otherUnderstanding:    calcOtherUnderstanding(data),
      sensitivity:           calcSensitivity(data),
      creativity:            calcCreativity(data),
    },
  }
}
