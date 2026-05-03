/**
 * Gene Keys → 12軸スコア変換
 * 設計書 §4 準拠
 */

import type { OccultismAxisScores } from '../rashisa/types'
import type { ChartResult } from './types'

function clamp(v: number): number {
  return Math.max(-10, Math.min(10, Math.round(v * 10) / 10))
}

// ---------- 革新・創造系ゲート定義（設計書 §4 参照）----------

/** 集合無意識・社会性ゲート */
const COLLECTIVE_GATES = new Set([22, 36, 47, 49])

/** 革新系ゲート */
const INNOVATION_GATES = new Set([1, 11, 51])

/** 創造系ゲート */
const CREATIVITY_GATES = new Set([1, 21, 51, 60])

/** ポジションが持つゲート番号リスト（16ポジション） */
function getAllGates(chart: ChartResult): number[] {
  return [
    chart.lifesWork.gate,
    chart.evolution.gate,
    chart.radiance.gate,
    chart.purpose.gate,
    chart.attraction.gate,
    chart.iq.gate,
    chart.eq.gate,
    chart.sq.gate,
    chart.core.gate,
    chart.vocation.gate,
    chart.culture.gate,
    chart.pearl.gate,
    chart.brand.gate,
    chart.creativity.gate,
    chart.relationship.gate,
    chart.stability.gate,
  ]
}

function countGateInSet(gates: number[], set: Set<number>): number {
  return gates.filter(g => set.has(g)).length
}

// ---------- シッディ・贈り物・影の分類（設計書 §4.7, §4.8 参照）----------
// Gene Keys の各層は gate-map / lines から直接は取れないため、
// Life's Work のシッディ名で「在り方志向」を判定する

/** 在り方志向の強いシッディキーワード */
const BEING_SIDDHI_KEYWORDS = [
  '美', '優雅', '恵み', '清明', '聖', '奉仕', '謙虚', '完全', '存在', '光'
]

function isBeing(siddhiOrGift: string): boolean {
  return BEING_SIDDHI_KEYWORDS.some(k => siddhiOrGift.includes(k))
}

// ---------- 軸計算 ----------

/** 軸1: 判断（GK EQ = Mars Personality）
 * EQ の鍵（感情知性）で判断スタイルを読む
 * 感情系の shadow → 感情より, 知性系の shadow → 論理より
 */
function calcJudgment(chart: ChartResult): number {
  // GKプライムEQ: Mars Personality ゲートで判定
  const eqGate = chart.eq.gate
  // 感情・関係系のゲート（19,22,26,36,37,40,47,49,55）→ 感情寄り
  const emotionalGates = new Set([19, 22, 26, 36, 37, 40, 47, 49, 55])
  // 論理・知性系ゲート（5,9,14,15,25,34,52,57）→ 論理寄り
  const logicalGates   = new Set([5, 9, 14, 15, 25, 34, 52, 57])

  if (emotionalGates.has(eqGate)) return clamp(3)
  if (logicalGates.has(eqGate))   return clamp(-3)
  return 0
}

/** 軸2: エネルギー方向（内向↔外向） */
function calcEnergyDirection(chart: ChartResult): number {
  // Life's Work（Sun P）のシッディが内省系なら内向
  const lifesWork = chart.lifesWork
  const isIntrovert = isBeing(lifesWork.siddhi) || isBeing(lifesWork.shadow)
  return isIntrovert ? clamp(-1) : clamp(1)
}

/** 軸3: 情報の捉え方
 * Activation Sequence: Life's Work ゲート → 直感・現実マッピング
 */
function calcInformationStyle(chart: ChartResult): number {
  const gate = chart.lifesWork.gate
  // 直感・スピリチュアル系ゲート → 直感(-)
  const intuGates   = new Set([4, 11, 13, 22, 30, 36, 55, 63, 64])
  // 現実・実用系ゲート → 現実(+)
  const realistGates = new Set([2, 7, 14, 20, 27, 34, 42, 53])

  if (intuGates.has(gate))    return clamp(-2)
  if (realistGates.has(gate)) return clamp(2)
  return 0
}

/** 軸4: 行動様式（構造↔流動） */
function calcActionStyle(chart: ChartResult): number {
  // Stability（Saturn Design）→ 構造志向
  const stabilityGate = chart.stability.gate
  // 構造系ゲート（7, 31, 32, 33, 60）
  const structGates = new Set([7, 31, 32, 33, 60])
  if (structGates.has(stabilityGate)) return clamp(-2)
  return 0
}

/** 軸5: 対人距離 */
function calcInterpersonalDistance(chart: ChartResult): number {
  const gates = getAllGates(chart)
  const socialGates     = new Set([10, 15, 25, 46]) // 協調系
  const independGates   = new Set([1, 3, 12, 33, 56]) // 独立系
  const socialCount  = countGateInSet(gates, socialGates)
  const independCount = countGateInSet(gates, independGates)
  return clamp((independCount - socialCount) * 1.5)
}

/** 軸6: 社会性（個↔群）
 * 集合無意識ゲート（22, 36, 47, 49）に位置がある → 群(+)
 */
function calcSocialNature(chart: ChartResult): number {
  const gates = getAllGates(chart)
  const count = countGateInSet(gates, COLLECTIVE_GATES)
  return clamp(count * 2)
}

/** 軸7: 変化への姿勢（保守↔革新）
 * 革新系ゲート（1, 11, 51）→ 革新(+)
 */
function calcChangeAttitude(chart: ChartResult): number {
  const gates = getAllGates(chart)
  const count = countGateInSet(gates, INNOVATION_GATES)
  return clamp(count * 2)
}

/** 軸8: 生き方の重心（在り方↔やり方）
 * シッディ志向 → 在り方(-)、shadow志向 → やり方(+)
 */
function calcLifeFocus(chart: ChartResult): number {
  // Life's Work と EQ のシッディ・shadow で判定
  const positions = [chart.lifesWork, chart.eq]
  let score = 0
  for (const p of positions) {
    if (isBeing(p.siddhi)) score += -1.5
    // shadow が目立つ鍵はやり方寄り（行動重視）
    if (!isBeing(p.shadow)) score += 0.5
  }
  return clamp(score)
}

/** 軸9: 自己表現（受容↔主張） */
function calcSelfExpression(chart: ChartResult): number {
  const gate = chart.lifesWork.gate
  // 表現・主張系ゲート
  const assertGates  = new Set([1, 7, 12, 20, 31, 33, 62])
  // 受容・奉仕系ゲート
  const receptGates  = new Set([2, 10, 15, 25, 46])
  if (assertGates.has(gate))  return clamp(2)
  if (receptGates.has(gate)) return clamp(-2)
  return 0
}

/** 軸10: 他者理解（共感↔客観）
 * EQ（感情知性）プライム → 高ければ共感(-)
 */
function calcOtherUnderstanding(chart: ChartResult): number {
  const eqGate = chart.eq.gate
  const empathyGates = new Set([19, 22, 36, 37, 49, 55])
  if (empathyGates.has(eqGate)) return clamp(-2)
  return 0
}

/** 軸11: 感性（粗↔繊細）
 * プライムの感情層・美意識鍵
 */
function calcSensitivity(chart: ChartResult): number {
  const gates = getAllGates(chart)
  // 繊細・美意識系ゲート
  const sensitiveGates = new Set([12, 22, 30, 36, 55, 57])
  const count = countGateInSet(gates, sensitiveGates)
  return clamp(count * -1.5)
}

/** 軸12: 創造性（再現↔創造）
 * 創造系ゲート（1, 21, 51, 60）→ 創造(+)
 */
function calcCreativity(chart: ChartResult): number {
  const gates = getAllGates(chart)
  const count = countGateInSet(gates, CREATIVITY_GATES)
  return clamp(count * 2)
}

// ---------- メインAPI ----------

/**
 * Gene Keys データを12軸スコアに変換
 */
export function toAxisScores(chart: ChartResult): OccultismAxisScores {
  return {
    occultism: 'Gene Keys',
    rawData: {
      lifesWork: { gate: chart.lifesWork.gate, line: chart.lifesWork.line, gift: chart.lifesWork.gift, siddhi: chart.lifesWork.siddhi },
      evolution: { gate: chart.evolution.gate, line: chart.evolution.line },
      eq:        { gate: chart.eq.gate, line: chart.eq.line },
      stability: { gate: chart.stability.gate },
      hdProfile: chart.hdProfile,
    },
    axisScores: {
      judgment:              calcJudgment(chart),
      energyDirection:       calcEnergyDirection(chart),
      informationStyle:      calcInformationStyle(chart),
      actionStyle:           calcActionStyle(chart),
      interpersonalDistance: calcInterpersonalDistance(chart),
      socialNature:          calcSocialNature(chart),
      changeAttitude:        calcChangeAttitude(chart),
      lifeFocus:             calcLifeFocus(chart),
      selfExpression:        calcSelfExpression(chart),
      otherUnderstanding:    calcOtherUnderstanding(chart),
      sensitivity:           calcSensitivity(chart),
      creativity:            calcCreativity(chart),
    },
  }
}
