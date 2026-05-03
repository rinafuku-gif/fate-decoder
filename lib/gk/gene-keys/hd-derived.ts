/**
 * Human Design 派生計算
 * 26ゲート（13天体 × P/D）から、Type/Authority/Definition/Strategy/Signature/Not-Self を導出
 *
 * 公式仕様準拠:
 * - センター定義 = チャネル両端ルール
 * - Type = Sacral定義 + Motor→Throat 繋がりの組み合わせ
 * - Authority = 階層判定（Emotional > Sacral > Splenic > Ego > Self-Projected > Mental > Lunar）
 * - Definition = 定義センターのグループ数（Union-Find）
 */

import type { HDGates, HDType, HDAuthority, HDDefinition, HDDerived } from '../types'
import channelsData from '../../../data/hd-channels.json'

interface Channel {
  name: string
  gates: [number, number]
  centers: [string, string]
}

const CHANNELS: Channel[] = (channelsData as Array<{ name: string; gates: number[]; centers: string[] }>).map(c => ({
  name: c.name,
  gates: [c.gates[0], c.gates[1]],
  centers: [c.centers[0], c.centers[1]],
}))

const ALL_CENTERS = ['Head', 'Ajna', 'Throat', 'G', 'Heart', 'SolarPlexus', 'Spleen', 'Sacral', 'Root'] as const
const MOTOR_CENTERS = new Set(['Heart', 'SolarPlexus', 'Sacral', 'Root'])

// =====================================================
// 基礎判定
// =====================================================

function getAllGates(hdGates: HDGates): Set<number> {
  return new Set([...hdGates.personality, ...hdGates.design])
}

function getActiveChannels(allGates: Set<number>): Channel[] {
  return CHANNELS.filter(ch => allGates.has(ch.gates[0]) && allGates.has(ch.gates[1]))
}

function getDefinedCenters(activeChannels: Channel[]): Set<string> {
  const defined = new Set<string>()
  for (const ch of activeChannels) {
    defined.add(ch.centers[0])
    defined.add(ch.centers[1])
  }
  return defined
}

// =====================================================
// Union-Find でセンターをグループ化
// =====================================================

class UnionFind {
  private parent = new Map<string, string>()

  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x)
      return x
    }
    let root = x
    while (this.parent.get(root)! !== root) {
      root = this.parent.get(root)!
    }
    // 経路圧縮
    let cur = x
    while (this.parent.get(cur)! !== root) {
      const next = this.parent.get(cur)!
      this.parent.set(cur, root)
      cur = next
    }
    return root
  }

  union(a: string, b: string): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }

  groupCount(items: Iterable<string>): number {
    const roots = new Set<string>()
    for (const item of items) roots.add(this.find(item))
    return roots.size
  }

  isSameGroup(a: string, b: string): boolean {
    if (!this.parent.has(a) || !this.parent.has(b)) return false
    return this.find(a) === this.find(b)
  }
}

function buildUnionFind(definedCenters: Set<string>, activeChannels: Channel[]): UnionFind {
  const uf = new UnionFind()
  for (const c of definedCenters) uf.find(c)  // 初期化
  for (const ch of activeChannels) {
    uf.union(ch.centers[0], ch.centers[1])
  }
  return uf
}

// =====================================================
// Type 判定
// =====================================================

function isMotorConnectedToThroat(definedCenters: Set<string>, uf: UnionFind): boolean {
  if (!definedCenters.has('Throat')) return false
  for (const motor of MOTOR_CENTERS) {
    if (definedCenters.has(motor) && uf.isSameGroup(motor, 'Throat')) return true
  }
  return false
}

function determineType(definedCenters: Set<string>, uf: UnionFind): HDType {
  if (definedCenters.size === 0) return 'Reflector'

  const sacralDefined = definedCenters.has('Sacral')
  const motorToThroat = isMotorConnectedToThroat(definedCenters, uf)

  if (sacralDefined && motorToThroat) return 'Manifesting Generator'
  if (sacralDefined) return 'Generator'
  if (motorToThroat) return 'Manifestor'
  return 'Projector'
}

// =====================================================
// Authority 判定（階層）
// =====================================================

function determineAuthority(definedCenters: Set<string>, type: HDType): HDAuthority {
  if (type === 'Reflector') return 'Lunar'
  if (definedCenters.has('SolarPlexus')) return 'Emotional'
  if (definedCenters.has('Sacral')) return 'Sacral'
  if (definedCenters.has('Spleen')) return 'Splenic'
  if (definedCenters.has('Heart') && definedCenters.has('Throat')) return 'Ego Manifested'
  if (definedCenters.has('Heart') && definedCenters.has('G')) return 'Ego Projected'
  if (definedCenters.has('G') && definedCenters.has('Throat')) return 'Self-Projected'
  return 'Mental'
}

// =====================================================
// Definition Type 判定
// =====================================================

function determineDefinition(definedCenters: Set<string>, uf: UnionFind): HDDefinition {
  if (definedCenters.size === 0) return 'No Definition'
  const groupCount = uf.groupCount(definedCenters)
  switch (groupCount) {
    case 1: return 'Single'
    case 2: return 'Split'
    case 3: return 'Triple Split'
    case 4: return 'Quadruple Split'
    default: return 'Single'
  }
}

// =====================================================
// Type 別プロパティ（公式準拠）
// =====================================================

const TYPE_PROPERTIES: Record<HDType, { strategy: string; strategyJa: string; signature: string; signatureJa: string; notSelf: string; notSelfJa: string }> = {
  'Manifestor':            { strategy: 'To Inform',          strategyJa: '伝える',             signature: 'Peace',        signatureJa: '平和', notSelf: 'Anger',         notSelfJa: '怒り' },
  'Generator':             { strategy: 'To Respond',          strategyJa: '反応する',           signature: 'Satisfaction', signatureJa: '満足', notSelf: 'Frustration',   notSelfJa: 'フラストレーション' },
  'Manifesting Generator': { strategy: 'To Respond',          strategyJa: '反応する',           signature: 'Satisfaction', signatureJa: '満足', notSelf: 'Frustration',   notSelfJa: 'フラストレーション' },
  'Projector':             { strategy: 'Wait for Invitation', strategyJa: '招待を待つ',         signature: 'Success',      signatureJa: '成功', notSelf: 'Bitterness',    notSelfJa: '苦々しさ' },
  'Reflector':             { strategy: 'Wait a Lunar Cycle',  strategyJa: '月のサイクルを待つ', signature: 'Surprise',     signatureJa: '驚き', notSelf: 'Disappointment', notSelfJa: '失望' },
}

const TYPE_JA: Record<HDType, string> = {
  'Manifestor':            'マニフェスター',
  'Generator':             'ジェネレーター',
  'Manifesting Generator': 'マニフェスティング・ジェネレーター',
  'Projector':             'プロジェクター',
  'Reflector':             'リフレクター',
}

const AUTHORITY_JA: Record<HDAuthority, string> = {
  'Emotional':       '太陽神経叢',
  'Sacral':          '仙骨',
  'Splenic':         '脾臓',
  'Ego Manifested':  '自我顕在',
  'Ego Projected':   '自我投影',
  'Self-Projected':  '自己投影',
  'Mental':          'メンタル（外的環境）',
  'Lunar':           '月のサイクル',
  'None':            'なし',
}

const DEFINITION_JA: Record<HDDefinition, string> = {
  'Single':           'シングル定義',
  'Split':            'スプリット定義',
  'Triple Split':     'トリプルスプリット定義',
  'Quadruple Split':  'クアドラプルスプリット定義',
  'No Definition':    '無定義',
}

// =====================================================
// 公開API
// =====================================================

export function deriveHD(hdGates: HDGates): HDDerived {
  const allGates = getAllGates(hdGates)
  const activeChannels = getActiveChannels(allGates)
  const definedCenters = getDefinedCenters(activeChannels)
  const uf = buildUnionFind(definedCenters, activeChannels)

  const type = determineType(definedCenters, uf)
  const authority = determineAuthority(definedCenters, type)
  const definition = determineDefinition(definedCenters, uf)
  const props = TYPE_PROPERTIES[type]

  return {
    type,
    typeJa: TYPE_JA[type],
    authority,
    authorityJa: AUTHORITY_JA[authority],
    definition,
    definitionJa: DEFINITION_JA[definition],
    strategy: props.strategy,
    strategyJa: props.strategyJa,
    signature: props.signature,
    signatureJa: props.signatureJa,
    notSelfTheme: props.notSelf,
    notSelfThemeJa: props.notSelfJa,
    definedCenters: ALL_CENTERS.filter(c => definedCenters.has(c)),
  }
}
