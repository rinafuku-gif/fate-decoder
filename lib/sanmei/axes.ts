/**
 * 算命学 → 12軸スコア変換
 * 設計書 §4 準拠
 *
 * 注: centralStar = 算命学の十大主星（調舒星等）
 *     mainStar    = 四柱推命の通変星（印綬等）— 別物
 */

import type { OccultismAxisScores } from '../rashisa/types'
import type { SanmeiResult } from './calc'

function clamp(v: number): number {
  return Math.max(-10, Math.min(10, Math.round(v * 10) / 10))
}

// ---------- 十大主星スコアテーブル ----------

/** 各軸の十大主星スコア定義 */

/** 軸1: 判断（論理↔感情）
 * 設計書: 鳳閣→+2、車騎→-2、龍高→-1、玉堂→+1、調舒→+1、司禄→0、貫索→0、石門→+1、牽牛→-2、禄存→+1
 */
const JUDGMENT_SCORES: Record<string, number> = {
  '鳳閣星': 2,  '車騎星': -2, '龍高星': -1, '玉堂星': 1,
  '調舒星': 1,  '司禄星': 0,  '貫索星': 0,  '石門星': 1,
  '牽牛星': -2, '禄存星': 1,
}

/** 軸3: 情報の捉え方
 * 設計書: 龍高→-2、玉堂→-2、車騎/牽牛→+1
 */
const INFO_SCORES: Record<string, number> = {
  '龍高星': -2, '玉堂星': -2, '車騎星': 1, '牽牛星': 1,
}

/** 軸5: 対人距離
 * 設計書: 牽牛→-2、鳳閣→-1、龍高→+3
 */
const INTERPERSONAL_SCORES: Record<string, number> = {
  '牽牛星': -2, '鳳閣星': -1, '龍高星': 3,
}

/** 軸9: 自己表現
 * 設計書: 食神（算命学では鳳閣星に対応）→ -3、傷官（調舒星）→ +3（×1）、車騎→+3
 * 設計書§4.9: 食神多→-3、傷官・車騎多→+3
 * 算命学対応: 鳳閣≒食神、調舒≒傷官（創造的・主張的）
 */
const SELF_EXPRESSION_SCORES: Record<string, number> = {
  '鳳閣星': -2, '調舒星': 2,  '車騎星': 3,
  '牽牛星': 2,  '貫索星': 1,  '石門星': 1,
}

/** 軸12: 創造性
 * 設計書: 傷官（算命学=調舒）→+3、貫索→-2
 */
const CREATIVITY_SCORES: Record<string, number> = {
  '調舒星': 3,  '貫索星': -2,
}

// ---------- allStars から主星カウント ----------

function countAllStar(result: SanmeiResult, starName: string): number {
  return result.allStars.filter(s => s.star === starName).length
}

function getWeightedScore(result: SanmeiResult, scoreTable: Record<string, number>): number {
  // centralStar（月令主星）に2倍の重みをつけ、他の星は1倍で集計
  let score = 0
  const centralScore = scoreTable[result.centralStar]
  if (centralScore !== undefined) score += centralScore * 2

  for (const starName of Object.keys(scoreTable)) {
    const count = countAllStar(result, starName)
    score += scoreTable[starName] * count
  }

  return clamp(score / 3)  // スケール正規化
}

// ---------- 軸計算 ----------

function calcJudgment(result: SanmeiResult): number {
  return getWeightedScore(result, JUDGMENT_SCORES)
}

function calcEnergyDirection(result: SanmeiResult): number {
  // 龍高星（探求・外向）→ +2、司禄星（内向・貯蓄）→ -2
  const energyScores: Record<string, number> = {
    '龍高星': 2, '車騎星': 2, '石門星': 1,
    '司禄星': -2, '玉堂星': -1,
  }
  return getWeightedScore(result, energyScores)
}

function calcInformationStyle(result: SanmeiResult): number {
  return getWeightedScore(result, INFO_SCORES)
}

function calcActionStyle(result: SanmeiResult): number {
  // 牽牛星（秩序・構造）→ -2、車騎星（行動・流動）→ +2
  const actionScores: Record<string, number> = {
    '牽牛星': -2, '司禄星': -1, '貫索星': -1,
    '車騎星': 2,  '鳳閣星': 1,
  }
  return getWeightedScore(result, actionScores)
}

function calcInterpersonalDistance(result: SanmeiResult): number {
  return getWeightedScore(result, INTERPERSONAL_SCORES)
}

function calcSocialNature(result: SanmeiResult): number {
  // 石門星（社交）→ 群(+2)、貫索星（孤高）→ 個(-2)
  const socialScores: Record<string, number> = {
    '石門星': 2, '鳳閣星': 1,
    '貫索星': -2,
  }
  return getWeightedScore(result, socialScores)
}

function calcChangeAttitude(result: SanmeiResult): number {
  // 調舒星（変化・革新）→ +2、司禄星（保守）→ -1
  const changeScores: Record<string, number> = {
    '調舒星': 2, '車騎星': 1,
    '司禄星': -1, '牽牛星': -1,
  }
  return getWeightedScore(result, changeScores)
}

function calcLifeFocus(result: SanmeiResult): number {
  // 玉堂星・龍高星（探求・在り方）→ -1、車騎星（行動・やり方）→ +1
  const lifeScores: Record<string, number> = {
    '玉堂星': -1, '龍高星': -1,
    '車騎星': 1,  '司禄星': 1,
  }
  return getWeightedScore(result, lifeScores)
}

function calcSelfExpression(result: SanmeiResult): number {
  return getWeightedScore(result, SELF_EXPRESSION_SCORES)
}

function calcOtherUnderstanding(result: SanmeiResult): number {
  // 玉堂星（礼節・共感）→ -1、牽牛星（客観・秩序）→ +1
  const otherScores: Record<string, number> = {
    '玉堂星': -1, '鳳閣星': -1,
    '牽牛星': 1,  '石門星': 1,
  }
  return getWeightedScore(result, otherScores)
}

function calcSensitivity(result: SanmeiResult): number {
  // 調舒星（感受性が高い）→ 繊細(-2)、車騎星（粗削り）→ 粗(+1)
  const sensitivityScores: Record<string, number> = {
    '調舒星': -2, '玉堂星': -1,
    '車騎星': 1,
  }
  return getWeightedScore(result, sensitivityScores)
}

function calcCreativity(result: SanmeiResult): number {
  return getWeightedScore(result, CREATIVITY_SCORES)
}

// ---------- メインAPI ----------

/**
 * 算命学データを12軸スコアに変換
 */
export function toAxisScores(result: SanmeiResult): OccultismAxisScores {
  return {
    occultism: '算命学',
    rawData: {
      centralStar:  result.centralStar,
      dayStem:      result.dayStem,
      monthBranch:  result.monthBranch,
      daysFromSetsu: result.daysFromSetsu,
      topStars:     result.allStars.slice(0, 6).map(s => ({ star: s.star, zokan: s.zokan, type: s.zokanType })),
    },
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
