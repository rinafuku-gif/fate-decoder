/**
 * 易経 → 12軸スコア変換
 * 設計書 §4 準拠
 */

import type { OccultismAxisScores } from '../rashisa/types'
import type { IchingResult } from './calc'

function clamp(v: number): number {
  return Math.max(-10, Math.min(10, Math.round(v * 10) / 10))
}

// ---------- 卦の分類 ----------

/** 安定卦: 設計書 §4.4 "安定卦（艮・坤・乾）→ 構造(-2)" */
const STABLE_HEXAGRAMS = new Set([
  1,   // 乾
  2,   // 坤
  7,   // 師（組織・規律）
  8,   // 比（協調）
  11,  // 泰（平和）
  12,  // 否（退く）
  15,  // 謙（謙虚）
  19,  // 臨（監督）
  20,  // 観（観察）
  23,  // 剥（解体）
  26,  // 大畜（蓄積）
  27,  // 頤（養育）
  29,  // 坎（険しい流れ）
  32,  // 恒（持続）
  33,  // 遯（退く）
  36,  // 明夷（光を秘める）
  37,  // 家人（内なる秩序）
  39,  // 蹇（障害）
  41,  // 損（簡素化）
  45,  // 萃（結集）
  47,  // 困（制約）
  48,  // 井（源泉）
  50,  // 鼎（変容・器）
  52,  // 艮（止まる）
  53,  // 漸（段階的発展）
  60,  // 節（節制）
  61,  // 中孚（誠実）
  63,  // 既済（完成）
])

/** 変化卦: 設計書 §4.4 "変化卦（震・巽・離）→ 流動(+2)" */
const CHANGE_HEXAGRAMS = new Set([
  3,   // 屯（始まりの困難）
  6,   // 訟（争い）
  9,   // 小畜（準備）
  10,  // 履（礼節）
  13,  // 同人（共同）
  14,  // 大有（豊かさ）
  16,  // 豫（喜び）
  17,  // 随（従う）
  18,  // 蠱（刷新）
  21,  // 噬嗑（決断）
  22,  // 賁（飾り）
  24,  // 復（復活）
  25,  // 無妄（純粋）
  28,  // 大過（過剰）
  30,  // 離（炎・明晰）
  31,  // 咸（感応）
  34,  // 大壮（大いなる力）
  35,  // 晋（前進）
  38,  // 睽（対立）
  40,  // 解（解放）
  42,  // 益（増やす）
  43,  // 夬（断固たる行動）
  44,  // 姤（出会い）
  46,  // 升（上昇）
  49,  // 革（革命）
  51,  // 震（雷・覚醒）
  54,  // 帰妹（従属）
  55,  // 豊（豊かさ）
  56,  // 旅（流動）
  57,  // 巽（風・浸透）
  58,  // 兌（喜び）
  59,  // 渙（解放）
  62,  // 小過（細部への注意）
  64,  // 未済（次へ）
])

/** 道徳性・在り方卦 (坤・離・乾系) */
const MORAL_HEXAGRAMS = new Set([1, 2, 13, 14, 37, 61, 63])

/** 革新系卦 */
const INNOVATION_HEXAGRAMS = new Set([17, 18, 24, 49, 51, 64])

/** 創造系卦（動爻多の性質を持つ） */
const CREATIVE_HEXAGRAMS = new Set([1, 3, 24, 42, 51, 60, 64])

// ---------- 軸計算 ----------

/** 軸4: 行動様式（構造↔流動）
 * 安定卦 → 構造(-2)、変化卦 → 流動(+2)
 */
function calcActionStyle(result: IchingResult): number {
  const n = result.benKa.number
  if (STABLE_HEXAGRAMS.has(n))  return clamp(-2)
  if (CHANGE_HEXAGRAMS.has(n))  return clamp(2)
  // nature フィールドでフォールバック
  return result.benKa.nature === 'stable' ? clamp(-2) : clamp(2)
}

/** 軸5: 対人距離 */
function calcInterpersonalDistance(result: IchingResult): number {
  // 協調系: 比(8)・同人(13)・家人(37) → 協調(-)
  const cooperativeHex = new Set([8, 13, 37, 45])
  // 独立系: 遯(33)・乾(1)・大有(14) → 独立(+)
  const independHex    = new Set([1, 33, 14, 39])

  const n = result.benKa.number
  if (cooperativeHex.has(n)) return clamp(-2)
  if (independHex.has(n))    return clamp(2)
  return 0
}

/** 軸6: 社会性 */
function calcSocialNature(result: IchingResult): number {
  // 社会的卦: 師(7)・同人(13)・萃(45) → 群(+)
  const socialHex = new Set([7, 13, 45, 8])
  const n = result.benKa.number
  if (socialHex.has(n)) return clamp(2)
  return 0
}

/** 軸7: 変化への姿勢（保守↔革新）
 * 動爻多 → 革新(+3)、静爻多 → 保守(-3)
 * MVP では本命卦の変化性で代替
 */
function calcChangeAttitude(result: IchingResult): number {
  const n = result.benKa.number
  if (INNOVATION_HEXAGRAMS.has(n))                          return clamp(3)
  if (result.benKa.nature === 'change')                     return clamp(2)
  if (result.benKa.nature === 'stable' && STABLE_HEXAGRAMS.has(n)) return clamp(-2)
  return 0
}

/** 軸8: 生き方の重心（在り方↔やり方）
 * 道徳性の高い卦 → 在り方(-)
 */
function calcLifeFocus(result: IchingResult): number {
  const n = result.benKa.number
  if (MORAL_HEXAGRAMS.has(n)) return clamp(-2)
  return 0
}

/** 軸12: 創造性（再現↔創造）
 * 動爻多さ・卦の創造性 → 創造(+)
 */
function calcCreativity(result: IchingResult): number {
  const n = result.benKa.number
  if (CREATIVE_HEXAGRAMS.has(n))      return clamp(2)
  if (result.benKa.nature === 'change') return clamp(1)
  return 0
}

// ---------- メインAPI ----------

/**
 * 易経データを12軸スコアに変換
 */
export function toAxisScores(result: IchingResult): OccultismAxisScores {
  return {
    occultism: '易経',
    rawData: {
      hexagramNumber: result.benKa.number,
      hexagramName:   result.benKa.name,
      nature:         result.benKa.nature,
      activeLines:    result.activeLines,
    },
    axisScores: {
      judgment:              0,  // 易経は軸1の寄与が薄い（§3 重み0.4）
      energyDirection:       0,  // 同上（重み0.3）
      informationStyle:      0,  // 同上（重み0.6 — 中程度だが独自ロジックなし）
      actionStyle:           calcActionStyle(result),
      interpersonalDistance: calcInterpersonalDistance(result),
      socialNature:          calcSocialNature(result),
      changeAttitude:        calcChangeAttitude(result),
      lifeFocus:             calcLifeFocus(result),
      selfExpression:        0,  // 同上（重み0.5）
      otherUnderstanding:    0,  // 同上（重み0.4）
      sensitivity:           0,  // 同上（重み0.5）
      creativity:            calcCreativity(result),
    },
  }
}
