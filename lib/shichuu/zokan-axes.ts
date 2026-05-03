/**
 * 蔵干（独立） → 12軸スコア変換
 * 設計書 §4 準拠
 *
 * 蔵干は四柱推命の ShichuuResult から全柱の蔵干を集計して評価する。
 * mainStar（月令蔵干の通変星）に加え、各地支の本気蔵干の通変星を集計。
 */

import type { OccultismAxisScores } from '../rashisa/types'
import type { ShichuuResult } from './calc'
import { ZOKAN_TABLE, STEMS } from './calc'

function clamp(v: number): number {
  return Math.max(-10, Math.min(10, Math.round(v * 10) / 10))
}

/**
 * 地支の本気・中気・初気の蔵干を全て取得
 */
function getZokanAll(branch: string): string[] {
  const entry = ZOKAN_TABLE[branch]
  if (!entry) return []
  const [, z1, , z2, z3] = entry
  return [z1, z2, z3].filter(Boolean)
}

/**
 * 全柱の蔵干リスト（重複含む）
 */
function getAllZokans(result: ShichuuResult): string[] {
  const branches = [
    result.year.branch,
    result.month.branch,
    result.day.branch,
    result.hour?.branch ?? '',
  ].filter(Boolean)

  return branches.flatMap(b => getZokanAll(b))
}

/**
 * 蔵干に対して日干との通変星を算出（四柱推命の calcHensei と同ロジック）
 */
function zokanToHensei(dayStem: string, zokan: string): string {
  const STAR_MAP: [string, string][] = [
    ['劫財', '比肩'],
    ['傷官', '食神'],
    ['正財', '偏財'],
    ['正官', '偏官'],
    ['印綬', '偏印'],
  ]
  const dayStemId  = STEMS.indexOf(dayStem)
  const zokanId    = STEMS.indexOf(zokan)
  if (dayStemId < 0 || zokanId < 0) return '比肩'

  const meElem     = Math.floor(dayStemId / 2)
  const mePol      = dayStemId % 2
  const targetElem = Math.floor(zokanId / 2)
  const targetPol  = zokanId % 2
  const relation   = ((targetElem - meElem) % 5 + 5) % 5
  const isSame     = mePol === targetPol
  return STAR_MAP[relation][isSame ? 1 : 0]
}

function countZokanStar(result: ShichuuResult, starName: string): number {
  const zokans = getAllZokans(result)
  return zokans.filter(z => zokanToHensei(result.dayStem, z) === starName).length
}

function hasZokanStar(result: ShichuuResult, starName: string): boolean {
  return countZokanStar(result, starName) > 0
}

// 蔵干に印綬があるか（繊細性の指標）
function hasInsho(result: ShichuuResult): boolean {
  return hasZokanStar(result, '印綬')
}

// ---------- 軸計算 ----------

/** 軸1: 判断
 * 全蔵干を通変星化して集計（11占術独立の原則に従い mainStar への依存を排除）
 * スコアテーブルは §4.1 の通変星定義から導出:
 *   食神・傷官（感情/表現）→ +2、印綬（直感/内省）→ +1、偏印 → -1
 *   正官・偏官（論理/秩序）→ -2、正財・偏財 → -1、比肩・劫財 → 0
 */
function calcJudgment(result: ShichuuResult): number {
  const JUDGMENT_SCORES: Record<string, number> = {
    '食神': 2,  '傷官': 2,
    '印綬': 1,
    '偏印': -1, '正財': -1, '偏財': -1,
    '正官': -2, '偏官': -2,
    '比肩': 0,  '劫財': 0,
  }
  let score = 0
  for (const [star, val] of Object.entries(JUDGMENT_SCORES)) {
    score += val * countZokanStar(result, star)
  }
  return clamp(score)
}

/** 軸3: 情報の捉え方
 * 印綬・偏印 → 直感(-)、財星 → 現実(+)、官星 → +1
 */
function calcInformationStyle(result: ShichuuResult): number {
  let score = 0
  score += countZokanStar(result, '印綬') * -2
  score += countZokanStar(result, '偏印') * -2
  score += countZokanStar(result, '正財') * 2
  score += countZokanStar(result, '偏財') * 2
  score += countZokanStar(result, '正官') * 1
  return clamp(score)
}

/** 軸4: 行動様式
 * 蔵干は補助的。官星の蔵干が多い → 構造(-)
 */
function calcActionStyle(result: ShichuuResult): number {
  let score = 0
  score += countZokanStar(result, '正官') * -1
  score += countZokanStar(result, '偏官') * -1
  return clamp(score)
}

/** 軸5: 対人距離 */
function calcInterpersonalDistance(result: ShichuuResult): number {
  let score = 0
  score += countZokanStar(result, '比肩') * 1
  score += countZokanStar(result, '食神') * -1
  return clamp(score)
}

/** 軸8: 生き方の重心
 * 本気多 → 在り方(-)、雑気多 → やり方(+)
 * 全蔵干の本気（z3）vs 初・中気（z1, z2）の比率で判定
 */
function calcLifeFocus(result: ShichuuResult): number {
  const branches = [
    result.year.branch,
    result.month.branch,
    result.day.branch,
    result.hour?.branch ?? '',
  ].filter(Boolean)

  let honkiCount = 0
  let zakiCount  = 0
  for (const b of branches) {
    const entry = ZOKAN_TABLE[b]
    if (!entry) continue
    const [d1, z1, d2, z2, z3] = entry
    if (z3) honkiCount++
    if (z1 && d1 > 0) zakiCount++
    if (z2 && d2 > 0) zakiCount++
  }

  // 本気多 → -2、雑気多 → +1
  if (honkiCount > zakiCount) return clamp(-2)
  if (zakiCount > honkiCount) return clamp(1)
  return 0
}

/** 軸11: 感性
 * 印綬蔵干あり → 繊細(-)
 */
function calcSensitivity(result: ShichuuResult): number {
  return hasInsho(result) ? clamp(-2) : 0
}

// ---------- メインAPI ----------

/**
 * 蔵干データを12軸スコアに変換
 * （四柱推命 ShichuuResult の蔵干情報から算出）
 */
export function toAxisScores(result: ShichuuResult): OccultismAxisScores {
  return {
    occultism: '蔵干',
    rawData: {
      dayStem: result.dayStem,
      mainStar: result.mainStar,
      allZokans: getAllZokans(result),
    },
    axisScores: {
      judgment:              calcJudgment(result),
      energyDirection:       0,  // 蔵干は軸2への寄与が薄い（§3 重み0.3）
      informationStyle:      calcInformationStyle(result),
      actionStyle:           calcActionStyle(result),
      interpersonalDistance: calcInterpersonalDistance(result),
      socialNature:          0,  // 蔵干は軸6への寄与が薄い（§3 重み0.3）
      changeAttitude:        0,  // 同上（重み0.4）
      lifeFocus:             calcLifeFocus(result),
      selfExpression:        0,  // 同上（重み0.5）
      otherUnderstanding:    0,  // 同上（重み0.3）
      sensitivity:           calcSensitivity(result),
      creativity:            0,  // 同上（重み0.4）
    },
  }
}
