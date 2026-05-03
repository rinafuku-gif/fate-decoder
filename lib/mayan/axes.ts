/**
 * マヤ暦 → 12軸スコア変換
 * 設計書 §4 準拠
 *
 * マヤ暦は重みが全体的に低め（0.3〜0.6）のため、補助的な寄与に留める。
 * 既存の fortune-calc.ts の MAYA_YEARS/MAYA_MONTHS テーブルを利用して KIN を計算。
 */

import type { OccultismAxisScores } from '../rashisa/types'
import { MAYA_YEARS, MAYA_MONTHS, GLYPHS, TONES } from '../fortune-calc'

function clamp(v: number): number {
  return Math.max(-10, Math.min(10, Math.round(v * 10) / 10))
}

export interface MayanData {
  kin: number
  glyph: string
  tone: string
  toneNumber: number  // 1-13
  glyphIndex: number  // 0-19
}

/**
 * マヤ暦データを計算する
 * （fortune-calc.ts の calculateAll から KIN 算出部分を切り出し）
 */
export function calculateMayan(y: number, m: number, d: number): MayanData {
  let yc = MAYA_YEARS[y]
  if (yc === undefined) {
    const diff = y - 2000
    const shift = (365 * diff) % 260
    yc = ((153 + shift) % 260 + 260) % 260
  }
  const mc = MAYA_MONTHS[m]
  let kin = (yc + mc + d) % 260
  if (kin === 0) kin = 260
  const glyphIndex  = (kin - 1) % 20
  const toneIndex   = (kin - 1) % 13

  return {
    kin,
    glyph:      GLYPHS[glyphIndex],
    tone:       TONES[toneIndex],
    toneNumber: toneIndex + 1,  // 1-13
    glyphIndex,
  }
}

// ---------- グリフ分類 ----------

/**
 * 20グリフを性質で分類
 * 設計書では具体的なマッピングが少ないため、
 * ツォルキン暦の伝統的な分類に基づく
 */

/** 外向・行動系グリフ */
const ACTIVE_GLYPHS = new Set([
  '赤い竜',          // 0: 誕生・養育
  '黄色い種',        // 3: 目標・意識
  '赤い蛇',          // 4: 本能・生命力
  '青い手',          // 6: 完成・癒し
  '赤い月',          // 8: 流れ・浄化
  '青い猿',          // 10: 魔術・遊び
  '赤い空歩く人',    // 12: 奉仕・探求
  '青い鷲',          // 14: 創造・ビジョン
  '赤い地球',        // 16: 変化・変容
  '青い嵐',          // 18: 触媒・エネルギー
])

/** 内向・受容系グリフ */
const RECEPTIVE_GLYPHS = new Set([
  '白い風',          // 1: 精霊・コミュニケーション
  '青い夜',          // 2: 夢想・直感
  '白い世界の橋渡し', // 5: 死と再生
  '黄色い星',        // 7: 美・技巧
  '白い犬',          // 9: 愛・忠誠
  '黄色い人',        // 11: 自由・知恵
  '白い魔法使い',    // 13: 时・受容
  '黄色い戦士',      // 15: 知性・疑問
  '白い鏡',          // 17: 秩序・反映
  '黄色い太陽',      // 19: 普遍的な火
])

// ---------- 音の分類（1〜13） ----------

// 磁気(1)〜銀河(8): 蓄積・構造期
// 太陽(9)〜宇宙(13): 発散・流動期

function getToneCharacter(toneNumber: number): 'structure' | 'flow' {
  return toneNumber <= 8 ? 'structure' : 'flow'
}

// ---------- 軸計算 ----------

/** 軸2: エネルギー方向（内向↔外向） */
function calcEnergyDirection(data: MayanData): number {
  if (ACTIVE_GLYPHS.has(data.glyph))    return clamp(1)
  if (RECEPTIVE_GLYPHS.has(data.glyph)) return clamp(-1)
  return 0
}

/** 軸4: 行動様式（構造↔流動） */
function calcActionStyle(data: MayanData): number {
  const char = getToneCharacter(data.toneNumber)
  if (char === 'structure') return clamp(-1)
  return clamp(1)
}

/** 軸5: 対人距離 */
function calcInterpersonalDistance(data: MayanData): number {
  // 白い犬（愛・忠誠）→ 協調、青い嵐（触媒）→ 独立
  if (data.glyph === '白い犬')   return clamp(-1)
  if (data.glyph === '青い嵐')   return clamp(2)
  if (data.glyph === '白い風')   return clamp(-1)
  if (data.glyph === '赤い竜')   return clamp(-1)
  return 0
}

/** 軸6: 社会性（個↔群） */
function calcSocialNature(data: MayanData): number {
  // 白い世界の橋渡し（死と再生・集合的）→ 群
  // 黄色い人（自由意志）→ 個
  if (data.glyph === '白い世界の橋渡し') return clamp(2)
  if (data.glyph === '黄色い人')         return clamp(-1)
  if (data.glyph === '白い犬')           return clamp(1)
  return 0
}

/** 軸7: 変化への姿勢 */
function calcChangeAttitude(data: MayanData): number {
  // 青い嵐（触媒・変化） → 革新
  // 白い鏡（秩序）、黄色い種（意図的成長）→ 保守
  if (data.glyph === '青い嵐')    return clamp(2)
  if (data.glyph === '赤い地球')  return clamp(1)
  if (data.glyph === '白い鏡')    return clamp(-1)
  return 0
}

/** 軸8: 生き方の重心（在り方↔やり方） */
function calcLifeFocus(data: MayanData): number {
  // 白い風（精霊）、黄色い太陽（在り方）→ 在り方
  // 青い手（完成・行動）、赤い蛇（本能・行動）→ やり方
  if (['白い風', '黄色い太陽', '青い夜'].includes(data.glyph)) return clamp(-1)
  if (['青い手', '赤い蛇', '青い鷲'].includes(data.glyph))    return clamp(1)
  return 0
}

/** 軸9: 自己表現（受容↔主張） */
function calcSelfExpression(data: MayanData): number {
  if (ACTIVE_GLYPHS.has(data.glyph))    return clamp(1)
  if (RECEPTIVE_GLYPHS.has(data.glyph)) return clamp(-1)
  return 0
}

// ---------- メインAPI ----------

/**
 * マヤ暦データを12軸スコアに変換
 */
export function toAxisScores(y: number, m: number, d: number): OccultismAxisScores {
  const data = calculateMayan(y, m, d)

  return {
    occultism: 'マヤ暦',
    rawData: data,
    axisScores: {
      judgment:              0,  // マヤ暦は軸1の寄与なし（重み0.3）
      energyDirection:       calcEnergyDirection(data),
      informationStyle:      0,
      actionStyle:           calcActionStyle(data),
      interpersonalDistance: calcInterpersonalDistance(data),
      socialNature:          calcSocialNature(data),
      changeAttitude:        calcChangeAttitude(data),
      lifeFocus:             calcLifeFocus(data),
      selfExpression:        calcSelfExpression(data),
      otherUnderstanding:    0,
      sensitivity:           0,
      creativity:            0,
    },
  }
}
