/**
 * 四柱推命 → 12軸スコア変換
 * 設計書 §4 準拠
 */

import type { OccultismAxisScores } from '../rashisa/types'
import type { ShichuuResult } from './calc'
import { STEMS } from './calc'

function clamp(v: number): number {
  return Math.max(-10, Math.min(10, Math.round(v * 10) / 10))
}

// 天干の五行（0=木,1=木,2=火,3=火,4=土,5=土,6=金,7=金,8=水,9=水）
function stemElement(stemId: number): string {
  const elements = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水']
  return elements[stemId] ?? '木'
}

function isYinStem(stem: string): boolean {
  const yinStems = ['乙', '丁', '己', '辛', '癸']
  return yinStems.includes(stem)
}

/** 通変星カウント（全柱で集計） */
function countStar(result: ShichuuResult, starName: string): number {
  const stars = [
    result.year.hensei,
    result.month.hensei,
    result.day.hensei,
    result.hour?.hensei ?? '',
  ]
  return stars.filter(s => s === starName).length
}

// ---------- 軸計算 ----------

/** 軸1: 判断（論理↔感情）
 * 日干の五行: 金→-3、水→-1、木→0、火→+3、土→+1（陰陽で補正）
 */
function calcJudgment(result: ShichuuResult): number {
  const stemId = STEMS.indexOf(result.dayStem)
  const elem = stemElement(stemId)
  const isYin = isYinStem(result.dayStem)
  const yin = isYin ? 0.5 : 1.0

  const base: Record<string, number> = { 金: -3, 水: -1, 木: 0, 火: 3, 土: 1 }
  return clamp((base[elem] ?? 0) * yin)
}

/** 軸2: エネルギー方向（内向↔外向）
 * 日干の陰陽: 陰干→-3、陽干→+3
 */
function calcEnergyDirection(result: ShichuuResult): number {
  return isYinStem(result.dayStem) ? -3 : 3
}

/** 軸3: 情報の捉え方（直感↔現実）
 * 印綬・偏印 → 直感(-)、財星 → 現実(+)、官星 → +1
 */
function calcInformationStyle(result: ShichuuResult): number {
  let score = 0
  const realStars  = ['正財', '偏財']
  const authStars  = ['正官', '偏官']

  score += countStar(result, '印綬') * -2
  score += countStar(result, '偏印') * -2
  for (const s of realStars) score += countStar(result, s) * 2
  for (const s of authStars) score += countStar(result, s) * 1

  return clamp(score)
}

/** 軸4: 行動様式（構造↔流動）
 * 月柱地支の五行・土多 → -3、土少 → +2
 * 官星・印星多 → 構造(-)
 */
function calcActionStyle(result: ShichuuResult): number {
  // 全地支の五行で土の数を数える
  const branches = [
    result.year.branch,
    result.month.branch,
    result.day.branch,
    result.hour?.branch ?? '',
  ]
  const EARTH_BRANCHES = ['丑', '辰', '未', '戌']
  const earthCount = branches.filter(b => EARTH_BRANCHES.includes(b)).length

  let score = 0
  if (earthCount >= 2)      score += -3
  else if (earthCount === 0) score += 2

  // 官星・印星の多さ
  const officialCount = countStar(result, '正官') + countStar(result, '偏官')
  const printCount    = countStar(result, '印綬') + countStar(result, '偏印')
  score += -(officialCount + printCount) * 1

  return clamp(score)
}

/** 軸5: 対人距離（協調↔独立）
 * 比肩多 → 独立(+2)、食神多 → 協調(-2)
 */
function calcInterpersonalDistance(result: ShichuuResult): number {
  let score = 0
  score += countStar(result, '比肩') * 2
  score += countStar(result, '劫財') * 1  // 半独立
  score += countStar(result, '食神') * -2
  score += countStar(result, '傷官') * 1  // 主張寄り
  return clamp(score)
}

/** 軸6: 社会性（個↔群） */
function calcSocialNature(result: ShichuuResult): number {
  // 食神（開放的） → 群、比肩（自己中心） → 個
  let score = 0
  score += countStar(result, '食神') * 1
  score += countStar(result, '劫財') * -1
  return clamp(score)
}

/** 軸7: 変化への姿勢（保守↔革新） */
function calcChangeAttitude(result: ShichuuResult): number {
  // 傷官（既存打破） → 革新、官星多 → 保守
  let score = 0
  score += countStar(result, '傷官') * 2
  score += countStar(result, '偏官') * 1
  score += countStar(result, '正官') * -2
  score += countStar(result, '印綬') * -1
  return clamp(score)
}

/** 軸8: 生き方の重心（在り方↔やり方）
 * 印綬多 → 在り方(-)、食神・財星 → やり方(+)
 */
function calcLifeFocus(result: ShichuuResult): number {
  let score = 0
  score += countStar(result, '印綬') * -2
  score += countStar(result, '偏印') * -1
  score += countStar(result, '食神') * 1
  score += countStar(result, '正財') * 1
  score += countStar(result, '偏財') * 1
  return clamp(score)
}

/** 軸9: 自己表現（受容↔主張）
 * 食神 → 受容(-2)、傷官 → 主張(+3)
 */
function calcSelfExpression(result: ShichuuResult): number {
  let score = 0
  score += countStar(result, '食神') * -2
  score += countStar(result, '傷官') * 3
  return clamp(score)
}

/** 軸10: 他者理解（共感↔客観） */
function calcOtherUnderstanding(result: ShichuuResult): number {
  // 印綬（包容）→ 共感(-)、正財（現実感覚）→ 客観(+)
  let score = 0
  score += countStar(result, '印綬') * -1
  score += countStar(result, '正財') * 1
  score += countStar(result, '偏財') * 1
  return clamp(score)
}

/** 軸11: 感性（粗↔繊細）
 * 五行バランス: 偏り強 → 粗(+)、均衡 → 繊細(-)
 */
function calcSensitivity(result: ShichuuResult): number {
  const stems = [
    result.year.stem,
    result.month.stem,
    result.day.stem,
    result.hour?.stem ?? '',
  ].filter(Boolean)

  // 五行の出現頻度
  const elemCount: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  for (const s of stems) {
    const elem = stemElement(STEMS.indexOf(s))
    elemCount[elem] = (elemCount[elem] ?? 0) + 1
  }
  const counts = Object.values(elemCount)
  const maxCount = Math.max(...counts)

  // 偏りが強い（2つ以上が集中）→ 粗
  if (maxCount >= 3) return clamp(2)
  if (maxCount === 2) return clamp(0)
  return clamp(-2)
}

/** 軸12: 創造性（再現↔創造）
 * 傷官 → 創造(+3)、食神 → 再現寄り(+1)
 */
function calcCreativity(result: ShichuuResult): number {
  let score = 0
  score += countStar(result, '傷官') * 3
  score += countStar(result, '食神') * 1
  return clamp(score)
}

// ---------- メインAPI ----------

/**
 * 四柱推命データを12軸スコアに変換
 */
export function toAxisScores(result: ShichuuResult): OccultismAxisScores {
  return {
    occultism: '四柱推命',
    rawData: result,
    axisScores: {
      judgment:              calcJudgment(result),
      energyDirection:       calcEnergyDirection(result),
      informationStyle:      calcInformationStyle(result),
      actionStyle:           calcActionStyle(result),
      interpersonalDistance: calcInterpersonalDistance(result),
      socialNature:          calcSocialNature(result),
      changeAttitude:        calcChangeAttitude(result),
      lifeFocus:             calcLifeFocus(result),
      selfExpression:        calcSelfExpression(result),
      otherUnderstanding:    calcOtherUnderstanding(result),
      sensitivity:           calcSensitivity(result),
      creativity:            calcCreativity(result),
    },
  }
}
