export interface GatePosition {
  gate: number
  line: number
}

export interface PositionResult {
  gate: number
  line: number
  hexName: string
  shadow: string
  gift: string
  siddhi: string
  lineDesc: string
}

/**
 * HD Bodygraph 計算用の全アクティブゲート
 * 13天体 × 2層（Personality/Design）= 各層13ゲート（重複あり可）
 * センター定義のチャネル両端ルール判定に使用
 */
export interface HDGates {
  personality: number[]  // [Sun, Earth, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, NorthNode, SouthNode]
  design: number[]
}

export interface HDPositionEntry {
  planet: string         // 天体名（英）
  symbol: string         // 天体シンボル（☉ ⊕ ☽ ☿ ♀ ♂ ♃ ♄ ♅ ♆ ♇ ☊ ☋）
  gate: number
  line: number
}

/** HD Bodygraph 両サイド表示用の13天体エントリ（ライン付き） */
export interface HDPositions {
  personality: HDPositionEntry[]
  design: HDPositionEntry[]
}

export type HDType = 'Manifestor' | 'Generator' | 'Manifesting Generator' | 'Projector' | 'Reflector'
export type HDAuthority = 'Emotional' | 'Sacral' | 'Splenic' | 'Ego Manifested' | 'Ego Projected' | 'Self-Projected' | 'Mental' | 'Lunar' | 'None'
export type HDDefinition = 'Single' | 'Split' | 'Triple Split' | 'Quadruple Split' | 'No Definition'

export interface HDDerived {
  type: HDType
  typeJa: string
  authority: HDAuthority
  authorityJa: string
  definition: HDDefinition
  definitionJa: string
  strategy: string
  strategyJa: string
  signature: string
  signatureJa: string
  notSelfTheme: string
  notSelfThemeJa: string
  definedCenters: string[]
}

export interface ChartResult {
  // Activation Sequence
  lifesWork: PositionResult    // Sun Personality
  evolution: PositionResult    // Earth Personality
  radiance: PositionResult     // Sun Design
  purpose: PositionResult      // Earth Design

  // Venus Sequence
  attraction: PositionResult   // Moon Design
  iq: PositionResult           // Venus Personality
  eq: PositionResult           // Mars Personality
  sq: PositionResult           // Venus Design
  core: PositionResult         // Mars Design

  // Pearl Sequence
  vocation: PositionResult     // Mars Design (same as Core)
  culture: PositionResult      // Jupiter Design
  pearl: PositionResult        // Jupiter Personality
  brand: PositionResult        // Sun Personality (same as Life's Work)

  // Star Pearl
  creativity: PositionResult   // Uranus Personality
  relationship: PositionResult // Mercury Personality
  stability: PositionResult    // Saturn Personality

  // HD
  hdProfile: string
  hdCross: string
  hdGates: HDGates
  hdPositions: HDPositions
  hdDerived: HDDerived

  // Meta
  name: string
  birthDate: string
  birthTime: string
  birthPlace: string
  reportDate: string
}

export interface GateData {
  gate: number
  hexName: string
  shadow: string
  gift: string
  siddhi: string
}

export interface CliOptions {
  date: string
  time: string
  lat: number
  lon: number
  name: string
  output?: string
  tz?: string
  birthPlace?: string
}
