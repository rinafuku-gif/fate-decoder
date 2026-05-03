/**
 * 九星気学 → 12軸スコア変換
 * 設計書 §4 準拠
 */

import type { OccultismAxisScores } from '../rashisa/types'
import type { KyuseiResult } from './calc'

function clamp(v: number): number {
  return Math.max(-10, Math.min(10, Math.round(v * 10) / 10))
}

// ---------- 本命星スコアテーブル ----------

/**
 * 軸2: エネルギー方向（内向↔外向）
 * 設計書: 一白→-3、二黒→-1、三碧→+2、四緑→+1、五黄→0、六白→+2、七赤→+3、八白→0、九紫→+3
 */
const ENERGY_DIRECTION: Record<number, number> = {
  1: -3,  // 一白水星（内省）
  2: -1,  // 二黒土星（地に足がついた）
  3:  2,  // 三碧木星（活動的）
  4:  1,  // 四緑木星（調和・外向き）
  5:  0,  // 五黄土星（中心）
  6:  2,  // 六白金星（指導的）
  7:  3,  // 七赤金星（社交的）
  8:  0,  // 八白土星（変革・内外両面）
  9:  3,  // 九紫火星（表現的）
}

/**
 * 軸6: 社会性（個↔群）
 * 設計書: 七赤・三碧→+3、一白・八白→-2
 */
const SOCIAL_NATURE: Record<number, number> = {
  1: -2,  // 一白水星（独自路線）
  2: -1,  // 二黒土星
  3:  3,  // 三碧木星
  4:  1,  // 四緑木星
  5:  0,  // 五黄土星
  6:  1,  // 六白金星
  7:  3,  // 七赤金星
  8: -2,  // 八白土星
  9:  2,  // 九紫火星
}

/**
 * 軸7: 変化への姿勢（保守↔革新）
 * 設計書: 三碧木星・九紫火星→革新(+3)、二黒土星・八白土星→保守(-3)
 */
const CHANGE_ATTITUDE: Record<number, number> = {
  1:  0,  // 一白水星（流れに従う）
  2: -3,  // 二黒土星（保守）
  3:  3,  // 三碧木星（革新）
  4:  1,  // 四緑木星（穏やかな変化）
  5:  0,  // 五黄土星
  6: -1,  // 六白金星（秩序重視）
  7:  1,  // 七赤金星（革新寄り）
  8: -3,  // 八白土星（保守）
  9:  3,  // 九紫火星（革新）
}

/**
 * 軸9: 自己表現（受容↔主張）
 * 設計書: 三碧（主張）→+3、二黒（受容）→-3
 */
const SELF_EXPRESSION: Record<number, number> = {
  1: -1,  // 一白水星（控えめ）
  2: -3,  // 二黒土星（受容的）
  3:  3,  // 三碧木星（主張的）
  4:  0,  // 四緑木星
  5:  1,  // 五黄土星（力強い）
  6:  2,  // 六白金星（指導的）
  7:  2,  // 七赤金星（楽しい主張）
  8:  0,  // 八白土星
  9:  3,  // 九紫火星（華やかな表現）
}

/**
 * 軸12: 創造性（再現↔創造）
 * 設計書: 三碧→+2、九紫→+3
 */
const CREATIVITY: Record<number, number> = {
  1:  0,  // 一白水星
  2: -1,  // 二黒土星（再現・維持）
  3:  2,  // 三碧木星
  4:  1,  // 四緑木星
  5:  0,  // 五黄土星
  6:  1,  // 六白金星
  7:  1,  // 七赤金星
  8: -1,  // 八白土星（伝統維持）
  9:  3,  // 九紫火星
}

/**
 * 軸1: 判断（論理↔感情）
 * 本命星の特性から
 */
const JUDGMENT: Record<number, number> = {
  1: -1,  // 一白水星（論理的・分析）
  2:  1,  // 二黒土星（感情・直感）
  3:  0,  // 三碧木星（バランス）
  4:  1,  // 四緑木星（感性・調和）
  5:  0,  // 五黄土星
  6: -2,  // 六白金星（論理・秩序）
  7:  2,  // 七赤金星（感情豊か）
  8: -1,  // 八白土星（冷静）
  9:  2,  // 九紫火星（情熱・感情）
}

// ---------- 軸計算 ----------

function getScore(table: Record<number, number>, honmeiNumber: number): number {
  return clamp(table[honmeiNumber] ?? 0)
}

// ---------- メインAPI ----------

/**
 * 九星気学データを12軸スコアに変換
 * 本命星を主要な判断軸として使用
 */
export function toAxisScores(result: KyuseiResult): OccultismAxisScores {
  const n = result.honmeiNumber

  return {
    occultism: '九星気学',
    rawData: {
      honmei:        result.honmei,
      honmeiNumber:  result.honmeiNumber,
      getsumei:      result.getsumei,
      getsumeiNumber: result.getsumeiNumber,
    },
    axisScores: {
      judgment:              getScore(JUDGMENT, n),
      energyDirection:       getScore(ENERGY_DIRECTION, n),
      informationStyle:      0,  // 九星気学は軸3への具体的な寄与設計なし（重み0.4）
      actionStyle:           0,  // 同上（重み0.5）
      interpersonalDistance: 0,  // 同上（重み0.6）
      socialNature:          getScore(SOCIAL_NATURE, n),
      changeAttitude:        getScore(CHANGE_ATTITUDE, n),
      lifeFocus:             0,  // 同上（重み0.4）
      selfExpression:        getScore(SELF_EXPRESSION, n),
      otherUnderstanding:    0,  // 同上（重み0.4）
      sensitivity:           0,  // 同上（重み0.5）
      creativity:            getScore(CREATIVITY, n),
    },
  }
}
