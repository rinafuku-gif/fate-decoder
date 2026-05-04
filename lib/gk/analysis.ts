/**
 * Gene Keys チャート分析ユーティリティ
 */

import type { ChartResult } from './types'

export interface DuplicateGateResult {
  gate: number
  positions: string[]
  gift: string
}

/**
 * 重複ゲート検出（16ポジション全て対象）
 */
export function detectDuplicateGatesCore(chart: ChartResult): DuplicateGateResult[] {
  const positions: { pos: string; gate: number; gift: string }[] = [
    { pos: "Life's Work", gate: chart.lifesWork.gate, gift: chart.lifesWork.gift },
    { pos: 'Evolution', gate: chart.evolution.gate, gift: chart.evolution.gift },
    { pos: 'Radiance', gate: chart.radiance.gate, gift: chart.radiance.gift },
    { pos: 'Purpose', gate: chart.purpose.gate, gift: chart.purpose.gift },
    { pos: 'Attraction', gate: chart.attraction.gate, gift: chart.attraction.gift },
    { pos: 'IQ', gate: chart.iq.gate, gift: chart.iq.gift },
    { pos: 'EQ', gate: chart.eq.gate, gift: chart.eq.gift },
    { pos: 'SQ', gate: chart.sq.gate, gift: chart.sq.gift },
    { pos: 'Core', gate: chart.core.gate, gift: chart.core.gift },
    { pos: 'Vocation', gate: chart.vocation.gate, gift: chart.vocation.gift },
    { pos: 'Culture', gate: chart.culture.gate, gift: chart.culture.gift },
    { pos: 'Pearl', gate: chart.pearl.gate, gift: chart.pearl.gift },
    { pos: 'Brand', gate: chart.brand.gate, gift: chart.brand.gift },
    { pos: 'Creativity', gate: chart.creativity.gate, gift: chart.creativity.gift },
    { pos: 'Relationship', gate: chart.relationship.gate, gift: chart.relationship.gift },
    { pos: 'Stability', gate: chart.stability.gate, gift: chart.stability.gift },
  ]

  const gateMap = new Map<number, { positions: string[]; gift: string }>()
  for (const p of positions) {
    const existing = gateMap.get(p.gate)
    if (existing) {
      existing.positions.push(p.pos)
    } else {
      gateMap.set(p.gate, { positions: [p.pos], gift: p.gift })
    }
  }

  const result: DuplicateGateResult[] = []
  gateMap.forEach((val, gate) => {
    if (val.positions.length > 1) {
      result.push({ gate, positions: val.positions, gift: val.gift })
    }
  })
  return result
}

/**
 * ライン構成サマリ（16ポジション）
 */
export function summarizeLinesCore(chart: ChartResult): Record<number, number> {
  const lines = [
    chart.lifesWork.line, chart.evolution.line, chart.radiance.line, chart.purpose.line,
    chart.attraction.line, chart.iq.line, chart.eq.line, chart.sq.line, chart.core.line,
    chart.vocation.line, chart.culture.line, chart.pearl.line, chart.brand.line,
    chart.creativity.line, chart.relationship.line, chart.stability.line,
  ]
  const count: Record<number, number> = {}
  for (const l of lines) count[l] = (count[l] ?? 0) + 1
  return count
}
