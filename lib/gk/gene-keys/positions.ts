/**
 * 15ポジション + Star Pearl 3ポジションの計算
 *
 * 惑星マッピング:
 * === Activation Sequence ===
 * Life's Work : Sun Personality
 * Evolution   : Earth Personality
 * Radiance    : Sun Design
 * Purpose     : Earth Design
 *
 * === Venus Sequence ===
 * Attraction  : Moon Design
 * IQ          : Venus Personality
 * EQ          : Mars Personality
 * SQ          : Venus Design
 * Core        : Mars Design
 *
 * === Pearl Sequence ===
 * Vocation    : Mars Design (Core と同じ)
 * Culture     : Jupiter Design
 * Pearl       : Jupiter Personality
 * Brand       : Sun Personality (Life's Work と同じ)
 *
 * === Star Pearl (2025年公式拡張) ===
 * Creativity  : Uranus Design
 * Relationship: Mercury Personality
 * Stability   : Saturn Design
 */

import type { ChartResult, PositionResult, HDGates, HDPositions, HDPositionEntry } from '../types'
import type { PlanetLongitudes } from '../astro/calculate'
import { longitudeToGateLine } from './gate-map'
import { getGateData, getLineDescription } from './lines'
import { deriveHD } from './hd-derived'

/** HD公式の天体表示順（公式チャート両サイドと同じ） */
const HD_PLANET_ORDER: Array<{ key: keyof PlanetLongitudes; name: string; symbol: string }> = [
  { key: 'sun',       name: 'Sun',        symbol: '☉' },
  { key: 'earth',     name: 'Earth',      symbol: '⊕' },
  { key: 'moon',      name: 'Moon',       symbol: '☽' },
  { key: 'northNode', name: 'North Node', symbol: '☊' },
  { key: 'southNode', name: 'South Node', symbol: '☋' },
  { key: 'mercury',   name: 'Mercury',    symbol: '☿' },
  { key: 'venus',     name: 'Venus',      symbol: '♀' },
  { key: 'mars',      name: 'Mars',       symbol: '♂' },
  { key: 'jupiter',   name: 'Jupiter',    symbol: '♃' },
  { key: 'saturn',    name: 'Saturn',     symbol: '♄' },
  { key: 'uranus',    name: 'Uranus',     symbol: '♅' },
  { key: 'neptune',   name: 'Neptune',    symbol: '♆' },
  { key: 'pluto',     name: 'Pluto',      symbol: '♇' },
]

/**
 * HD Bodygraph 用：13天体すべてのゲート/ライン情報
 */
function calculateHDPositions(p: PlanetLongitudes, d: PlanetLongitudes): { hdGates: HDGates; hdPositions: HDPositions } {
  const buildEntries = (lons: PlanetLongitudes): HDPositionEntry[] =>
    HD_PLANET_ORDER.map(({ key, name, symbol }) => {
      const { gate, line } = longitudeToGateLine(lons[key])
      return { planet: name, symbol, gate, line }
    })

  const pEntries = buildEntries(p)
  const dEntries = buildEntries(d)

  return {
    hdGates: {
      personality: pEntries.map(e => e.gate),
      design:      dEntries.map(e => e.gate),
    },
    hdPositions: {
      personality: pEntries,
      design:      dEntries,
    },
  }
}

/**
 * Incarnation Cross 種別判定
 * Personality Sun line（lifesWork.line）から決定:
 *   Line 1-3: Right Angle Cross
 *   Line 4:   Juxtaposition Cross
 *   Line 5-6: Left Angle Cross
 */
function getCrossType(personalitySunLine: number): string {
  if (personalitySunLine <= 3) return 'Right Angle'
  if (personalitySunLine === 4) return 'Juxtaposition'
  return 'Left Angle'  // 5 or 6
}

/**
 * 黄経からPositionResultを作成
 */
function makePosition(longitude: number): PositionResult {
  const { gate, line } = longitudeToGateLine(longitude)
  const gateData = getGateData(gate)

  return {
    gate,
    line,
    hexName: gateData.hexName,
    shadow: gateData.shadow,
    gift: gateData.gift,
    siddhi: gateData.siddhi,
    lineDesc: getLineDescription(line),
  }
}

function getProfileName(line: number): string {
  const names: Record<number, string> = {
    1: 'Investigator',
    2: 'Hermit',
    3: 'Martyr',
    4: 'Opportunist',
    5: 'Heretic',
    6: 'Role Model',
  }
  return names[line] ?? `Line ${line}`
}

/**
 * 全ポジションを計算
 */
export function calculateAllPositions(
  personalityLons: PlanetLongitudes,
  designLons: PlanetLongitudes,
  meta: { name: string; birthDate: string; birthTime: string; birthPlace: string; reportDate: string }
): ChartResult {
  // Activation Sequence
  const lifesWork = makePosition(personalityLons.sun)
  const evolution = makePosition(personalityLons.earth)
  const radiance  = makePosition(designLons.sun)
  const purpose   = makePosition(designLons.earth)

  // Venus Sequence
  const attraction = makePosition(designLons.moon)
  const iq         = makePosition(personalityLons.venus)
  const eq         = makePosition(personalityLons.mars)
  const sq         = makePosition(designLons.venus)
  const core       = makePosition(designLons.mars)

  // Pearl Sequence
  const vocation = makePosition(designLons.mars)           // Core と同じ
  const culture  = makePosition(designLons.jupiter)
  const pearl    = makePosition(personalityLons.jupiter)
  const brand    = makePosition(personalityLons.sun)        // Life's Work と同じ

  // Star Pearl (2025年公式拡張)
  const creativity   = makePosition(designLons.uranus)
  const relationship = makePosition(personalityLons.mercury)
  const stability    = makePosition(designLons.saturn)

  // HD Profile = Personality Sun line / Design Sun line
  const hdProfile = `${lifesWork.line}/${radiance.line} ${getProfileName(lifesWork.line)} / ${getProfileName(radiance.line)}`

  // Incarnation Cross = Personality Sun/Earth | Design Sun/Earth, 種別はP-Sun lineから
  const crossType = getCrossType(lifesWork.line)
  const hdCross = `${crossType} Cross (${lifesWork.gate}/${evolution.gate} | ${radiance.gate}/${purpose.gate})`

  // HD Bodygraph 用 全26ゲート（13天体 × P/D）+ ライン情報
  const { hdGates, hdPositions } = calculateHDPositions(personalityLons, designLons)
  const hdDerived = deriveHD(hdGates)

  return {
    lifesWork, evolution, radiance, purpose,
    attraction, iq, eq, sq, core,
    vocation, culture, pearl, brand,
    creativity, relationship, stability,
    hdProfile,
    hdCross,
    hdGates,
    hdPositions,
    hdDerived,
    ...meta,
  }
}
