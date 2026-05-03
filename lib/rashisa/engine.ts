/**
 * らしさプロファイル統合エンジン
 * 設計書 §5 準拠
 *
 * calculateRashisaProfile(input: ChartInput): Promise<RashisaProfile>
 *
 * Server-side only（sweph依存の占術を含む）
 * - 西洋占星術: calculateHoroscopePrecise（sweph）
 * - 四柱推命・蔵干: calculateShichuu
 * - 算命学: calculateSanmei
 * - 宿曜: calculateSukuyo
 * - Gene Keys + HD: calculateGKChart（astro/calculate）
 * - 易経: calculateIching（GK Life's Work ゲートから）
 * - マヤ暦・数秘術: 独自計算（sweph不要）
 * - 九星気学: calculateKyusei（sweph不要）
 */

import type {
  ChartInput,
  OccultismAxisScores,
  AxisScores,
  AxisKey,
  AxisResult,
  AxisContributor,
  RashisaProfile,
} from './types'
import { AXIS_KEYS, AXIS_META } from './types'
import { WEIGHTS, WEIGHT_TOTALS } from './weights'

// ---------- 占術モジュール import ----------

// 西洋占星術（sweph）
import { calculateHoroscopePrecise } from '../horoscope/calc-precise'
import { toAxisScores as horoscopeAxes } from '../horoscope/axes'

// 四柱推命・蔵干
import { calculateShichuu } from '../shichuu/calc'
import { toAxisScores as shichuuAxes } from '../shichuu/axes'
import { toAxisScores as zokanAxes } from '../shichuu/zokan-axes'

// Gene Keys + Human Design
import { calculatePlanetLongitudes } from '../gk/astro/calculate'
import { calculateDesignTime } from '../gk/astro/design-time'
import { calculateAllPositions } from '../gk/gene-keys/positions'
import type { ChartResult } from '../gk/types'
import { toAxisScores as gkAxes } from '../gk/axes'
import { toAxisScores as hdAxes } from '../gk/hd-axes'

// 易経（Gene Keys の Life's Work ゲートから）
import { calculateIching } from '../iching/calc'
import { toAxisScores as ichingAxes } from '../iching/axes'

// マヤ暦
import { toAxisScores as mayanAxes } from '../mayan/axes'

// 数秘術
import { toAxisScores as numerologyAxes } from '../numerology/axes'

// 算命学
import { calculateSanmei } from '../sanmei/calc'
import { toAxisScores as sanmeiAxes } from '../sanmei/axes'

// 宿曜
import { calculateSukuyo } from '../sukuyo/calc'
import { toAxisScores as sukuyoAxes } from '../sukuyo/axes'

// 九星気学
import { calculateKyusei } from '../kyusei/calc'
import { toAxisScores as kyuseiAxes } from '../kyusei/axes'

// ---------- ユーティリティ ----------

/** 生年月日文字列 "YYYY-MM-DD" をパース */
function parseBirthDate(birthDate: string): { y: number; m: number; d: number } {
  const parts = birthDate.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid birthDate: ${birthDate}`)
  }
  return { y: parts[0], m: parts[1], d: parts[2] }
}

/** 出生時刻 "HH:MM" をパース */
function parseBirthTime(birthTime: string): { hour: number; minute: number } {
  const parts = birthTime.split(':').map(Number)
  if (parts.length !== 2 || parts.some(isNaN)) {
    throw new Error(`Invalid birthTime: ${birthTime}`)
  }
  return { hour: parts[0], minute: parts[1] }
}

/** -10〜+10 クランプ */
function clamp(v: number): number {
  return Math.max(-10, Math.min(10, v))
}

/** 標準偏差 */
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

// ---------- §5 スコア統合 ----------

/**
 * 1軸分のスコア統合（§5.1〜§5.4）
 */
function integrateAxis(
  occultisms: OccultismAxisScores[],
  axis: AxisKey,
): AxisResult {
  const contributors: AxisContributor[] = []

  for (const o of occultisms) {
    const weight = WEIGHTS[o.occultism][axis]
    if (weight === 0) continue  // 重み0は寄与しない
    contributors.push({
      occultism: o.occultism,
      score:     o.axisScores[axis],
      weight,
    })
  }

  if (contributors.length === 0) {
    return {
      score: 0,
      agreement: 0.5,
      stdDev: 0,
      isQuestionTrigger: false,
      contributors: [],
    }
  }

  // §5.1 重み付け平均
  const totalWeight = contributors.reduce((s, c) => s + c.weight, 0)
  const weightedSum = contributors.reduce((s, c) => s + c.score * c.weight, 0)
  const baseScore   = weightedSum / totalWeight

  // §5.2 一致度ボーナス（係数 0.6）
  // 設計書: 同方向に振れた占術の重み合計 / 全占術の重み合計
  // 0スコアの占術も「中立を表明している」として分母に含める
  const positiveWeight = contributors.filter(c => c.score > 0).reduce((s, c) => s + c.weight, 0)
  const negativeWeight = contributors.filter(c => c.score < 0).reduce((s, c) => s + c.weight, 0)

  // 同方向に向いた重みの割合（totalWeight は contributors の合計で確定済み）
  let agreement = 0.5
  if (totalWeight > 0) {
    const dominantWeight = Math.max(positiveWeight, negativeWeight)
    agreement = dominantWeight / totalWeight
  }

  const BONUS_COEFF = 0.6
  const bonus = BONUS_COEFF * (agreement - 0.5)
  const adjustedScore = baseScore * (1 + bonus)

  // §5.3 矛盾検出（標準偏差 σ > 4）
  const stdDev = standardDeviation(contributors.map(c => c.score))
  const isQuestionTrigger = stdDev > 4

  // §5.4 クランプ
  const finalScore = clamp(adjustedScore)

  return {
    score: Math.round(finalScore * 10) / 10,
    agreement: Math.round(agreement * 1000) / 1000,
    stdDev:    Math.round(stdDev * 100) / 100,
    isQuestionTrigger,
    contributors,
  }
}

// ---------- メインAPI ----------

/**
 * らしさプロファイルを計算する
 *
 * Server-side only (sweph 依存)
 *
 * @param input ChartInput
 * @returns Promise<RashisaProfile>
 */
export function calculateRashisaProfile(input: ChartInput): RashisaProfile {
  const { y, m, d } = parseBirthDate(input.birthDate)
  const { hour, minute } = parseBirthTime(input.birthTime)

  // JST → UTC (-9h)
  const birthDateUTC = new Date(Date.UTC(y, m - 1, d, hour - 9, minute, 0))

  const occultisms: OccultismAxisScores[] = []

  // --- 1. 西洋占星術（sweph）---
  const horoscopeData = calculateHoroscopePrecise(birthDateUTC, {
    latitude:  input.latitude,
    longitude: input.longitude,
  })
  occultisms.push(horoscopeAxes(horoscopeData))

  // --- 2. 四柱推命 ---
  const shichuuData = calculateShichuu(y, m, d, hour, minute)
  occultisms.push(shichuuAxes(shichuuData))

  // --- 3. 蔵干（四柱推命結果から独立評価）---
  occultisms.push(zokanAxes(shichuuData))

  // --- 4 & 5. Gene Keys + Human Design ---
  const designTime  = calculateDesignTime(birthDateUTC)
  const pLons       = calculatePlanetLongitudes(birthDateUTC)
  const dLons       = calculatePlanetLongitudes(designTime)
  const reportDate  = new Date().toISOString().slice(0, 10)
  const gkChart: ChartResult = calculateAllPositions(pLons, dLons, {
    name:       input.name,
    birthDate:  input.birthDate,
    birthTime:  input.birthTime,
    birthPlace: '',
    reportDate,
  })
  occultisms.push(gkAxes(gkChart))
  occultisms.push(hdAxes(gkChart.hdDerived))

  // --- 6. 易経（Life's Work ゲートから）---
  const ichingResult = calculateIching({ birthDate: input.birthDate, geneKeyGate: gkChart.lifesWork.gate })
  occultisms.push(ichingAxes(ichingResult))

  // --- 7. マヤ暦 ---
  occultisms.push(mayanAxes(y, m, d))

  // --- 8. 数秘術 ---
  occultisms.push(numerologyAxes(y, m, d))

  // --- 9. 算命学 ---
  const sanmeiData = calculateSanmei(y, m, d, hour, minute)
  occultisms.push(sanmeiAxes(sanmeiData))

  // --- 10. 宿曜 ---
  const sukuyoData = calculateSukuyo(y, m, d)
  occultisms.push(sukuyoAxes(sukuyoData))

  // --- 11. 九星気学 ---
  const kyuseiData = calculateKyusei(input.birthDate)
  occultisms.push(kyuseiAxes(kyuseiData))

  // --- 統合（§5.1〜§5.4）---
  const axisProfile = {} as RashisaProfile['axisProfile']
  for (const axis of AXIS_KEYS) {
    axisProfile[axis] = integrateAxis(occultisms, axis)
  }

  return {
    input,
    occultisms,
    axisProfile,
    generatedAt: new Date().toISOString(),
  }
}

// ---------- 公開プロファイル変換 ----------

/**
 * RashisaProfile → PublicProfile（占術名を含まない形式）
 */
export function toPublicProfile(profile: RashisaProfile) {
  return {
    axes: AXIS_KEYS.map(key => {
      const meta   = AXIS_META[key]
      const result = profile.axisProfile[key]
      return {
        name:          meta.name,
        polarity:      meta.polarity,
        rashisaScore:  result.score,
      }
    }),
  }
}

/** 各軸の重み合計を外部参照用にエクスポート */
export { WEIGHT_TOTALS }
