/**
 * ゲートデータの取得
 */

import type { GateData } from '../types'
import gatesJson from '../../../data/gates.json'

const gateMap = new Map<number, GateData>(
  (gatesJson as { gates: Array<{ gate: number; hexName: string; shadow: string; gift: string; siddhi: string }> }).gates.map(g => [g.gate, {
    gate: g.gate,
    hexName: g.hexName,
    shadow: g.shadow,
    gift: g.gift,
    siddhi: g.siddhi,
  }])
)

export function getGateData(gate: number): GateData {
  const data = gateMap.get(gate)
  if (!data) {
    return {
      gate,
      hexName: `Gate ${gate}`,
      shadow: '—',
      gift: '—',
      siddhi: '—',
    }
  }
  return data
}

export function getLineDescription(line: number): string {
  const descs: Record<number, string> = {
    1: 'Investigator — 地に足つけて基礎を固める位置',
    2: 'Hermit — マイペース／呼ばれて出てくる位置',
    3: 'Martyr — 試行錯誤で学ぶ実験家の位置',
    4: 'Opportunist — 近しい輪を深める内向型の位置',
    5: 'Heretic — 表に立たなくても常に見られる投影者の位置',
    6: 'Role Model — 40代以降に成熟する伝達者の位置',
  }
  return descs[line] ?? `Line ${line}`
}
