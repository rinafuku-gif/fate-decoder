/**
 * 宿曜 → 12軸スコア変換
 * 設計書 §4 準拠
 */

import type { OccultismAxisScores } from '../rashisa/types'
import type { SukuyoResult } from './calc'

function clamp(v: number): number {
  return Math.max(-10, Math.min(10, Math.round(v * 10) / 10))
}

// ---------- 27宿の分類 ----------

/**
 * 宿曜27宿の性質分類
 * 設計書 §4.5, §4.6, §4.9 参照
 */

/** 社交的・開放的な宿（設計書: 角・氐・房等） */
const SOCIAL_NAKSHATRA = new Set([
  '角宿', '氐宿', '房宿',   // 設計書直接参照
  '昴宿', '畢宿',           // 集合・豊穣の象徴
])

/** 内省的・静寂な宿（設計書: 虚・危等） */
const INTROVERT_NAKSHATRA = new Set([
  '虚宿', '危宿',    // 設計書直接参照
  '箕宿', '女宿',    // 風・流れ → 内向
])

/** 表現的な宿（設計書 §4.9: 角・参等） */
const EXPRESSIVE_NAKSHATRA = new Set([
  '角宿', '参宿',   // 設計書直接参照
  '張宿', '翼宿',   // 展開・広がり
])

/** 独立傾向の強い宿（設計書 §4.5） */
const INDEPENDENT_NAKSHATRA = new Set([
  '心宿', '尾宿',   // 深く独立した性質
  '斗宿', '牛宿',   // 堅固・自律
])

/** 協調傾向の強い宿 */
const COOPERATIVE_NAKSHATRA = new Set([
  '房宿', '氐宿',   // 和合・連帯
  '壁宿', '奎宿',   // 繋がり・境界
])

/** 感性の繊細な宿 */
const SENSITIVE_NAKSHATRA = new Set([
  '柳宿', '星宿', '張宿', '翼宿', '軫宿',  // 南方七宿（感受性が高い）
  '觜宿', '参宿',
])

/** 変化への適応が高い宿 */
const ADAPTABLE_NAKSHATRA = new Set([
  '室宿', '壁宿', '奎宿', '婁宿', '胃宿',
])

// ---------- 軸計算 ----------

/** 軸2: エネルギー方向（内向↔外向） */
function calcEnergyDirection(result: SukuyoResult): number {
  if (SOCIAL_NAKSHATRA.has(result.name))   return clamp(1)
  if (INTROVERT_NAKSHATRA.has(result.name)) return clamp(-2)
  return 0
}

/** 軸5: 対人距離（協調↔独立）
 * 設計書: 友衰関係を持つ宿→-1、独立傾向→+2
 */
function calcInterpersonalDistance(result: SukuyoResult): number {
  if (INDEPENDENT_NAKSHATRA.has(result.name))  return clamp(2)
  if (COOPERATIVE_NAKSHATRA.has(result.name)) return clamp(-1)
  return 0
}

/** 軸6: 社会性（個↔群）
 * 設計書: 社交的な宿（角・氐・房等）vs 内省的な宿（虚・危等）
 */
function calcSocialNature(result: SukuyoResult): number {
  if (SOCIAL_NAKSHATRA.has(result.name))    return clamp(2)
  if (INTROVERT_NAKSHATRA.has(result.name)) return clamp(-2)
  return 0
}

/** 軸7: 変化への姿勢 */
function calcChangeAttitude(result: SukuyoResult): number {
  if (ADAPTABLE_NAKSHATRA.has(result.name)) return clamp(1)
  // 固定的な宿（心宿・尾宿）→ 保守
  if (new Set(['心宿', '尾宿', '箕宿']).has(result.name)) return clamp(-1)
  return 0
}

/** 軸9: 自己表現（受容↔主張）
 * 設計書: 表現的な宿（角・参等）→ +2
 */
function calcSelfExpression(result: SukuyoResult): number {
  if (EXPRESSIVE_NAKSHATRA.has(result.name)) return clamp(2)
  if (INTROVERT_NAKSHATRA.has(result.name))  return clamp(-1)
  return 0
}

/** 軸10: 他者理解（共感↔客観）
 * 設計書: 業胎・栄親パターン -2〜+2
 * 業・胎関係（差±9）→ 深い縁・共感(-)、友・衰（差±4,±5）→ 協調(-)
 */
function calcOtherUnderstanding(result: SukuyoResult): number {
  // 南方七宿（感受性が高い）→ 共感(-)
  const southernSeven = new Set(['井宿', '鬼宿', '柳宿', '星宿', '張宿', '翼宿', '軫宿'])
  if (southernSeven.has(result.name)) return clamp(-2)
  // 西方七宿（秩序・客観）→ 客観(+)
  const westernSeven = new Set(['奎宿', '婁宿', '胃宿', '昴宿', '畢宿', '觜宿', '参宿'])
  if (westernSeven.has(result.name))  return clamp(1)
  return 0
}

/** 軸11: 感性（粗↔繊細） */
function calcSensitivity(result: SukuyoResult): number {
  if (SENSITIVE_NAKSHATRA.has(result.name)) return clamp(-2)
  return 0
}

// ---------- メインAPI ----------

/**
 * 宿曜データを12軸スコアに変換
 */
export function toAxisScores(result: SukuyoResult): OccultismAxisScores {
  return {
    occultism: '宿曜',
    rawData: {
      name:       result.name,
      index:      result.index,
      lunarMonth: result.lunarMonth,
      lunarDay:   result.lunarDay,
      isLeapMonth: result.isLeapMonth,
    },
    axisScores: {
      judgment:              0,
      energyDirection:       calcEnergyDirection(result),
      informationStyle:      0,
      actionStyle:           0,
      interpersonalDistance: calcInterpersonalDistance(result),
      socialNature:          calcSocialNature(result),
      changeAttitude:        calcChangeAttitude(result),
      lifeFocus:             0,
      selfExpression:        calcSelfExpression(result),
      otherUnderstanding:    calcOtherUnderstanding(result),
      sensitivity:           calcSensitivity(result),
      creativity:            0,
    },
  }
}
