/**
 * Human Design → 12軸スコア変換
 * 設計書 §4 準拠
 */

import type { OccultismAxisScores } from '../rashisa/types'
import type { HDDerived } from './types'

function clamp(v: number): number {
  return Math.max(-10, Math.min(10, Math.round(v * 10) / 10))
}

// ---------- 軸計算 ----------

/** 軸1: 判断（論理↔感情）
 * 頭+Ajna定義 → 論理(-)、感情センター定義 → 感情(+)
 */
function calcJudgment(hd: HDDerived): number {
  const centers = new Set(hd.definedCenters)
  const headAjna = centers.has('Head') && centers.has('Ajna')
  const emotional = centers.has('SolarPlexus')

  if (headAjna && emotional) return clamp(-1)
  if (headAjna)              return clamp(-3)
  if (emotional)             return clamp(3)
  return 0
}

/** 軸2: エネルギー方向（内向↔外向）
 * Reflector/Projector → 内向(-)、Manifestor/Mani-Gen → 外向(+)
 */
function calcEnergyDirection(hd: HDDerived): number {
  switch (hd.type) {
    case 'Reflector':             return clamp(-3)
    case 'Projector':             return clamp(-3)
    case 'Generator':             return clamp(0)
    case 'Manifestor':            return clamp(3)
    case 'Manifesting Generator': return clamp(3)
  }
}

/** 軸3: 情報の捉え方（直感↔現実）
 * Ajna定義あり → 直感的思考(-2)、未定義 → 現実的(+1)
 */
function calcInformationStyle(hd: HDDerived): number {
  const centers = new Set(hd.definedCenters)
  if (centers.has('Ajna'))  return clamp(-2)
  if (centers.has('Head'))  return clamp(-1)
  return clamp(1)
}

/** 軸4: 行動様式（構造↔流動）
 * 仙骨定義 → リズム(-1)、脾臓定義 → 流動(+1)
 */
function calcActionStyle(hd: HDDerived): number {
  const centers = new Set(hd.definedCenters)
  let score = 0
  if (centers.has('Sacral')) score += -1
  if (centers.has('Spleen')) score += 1
  return clamp(score)
}

/** 軸5: 対人距離（協調↔独立）
 * Generator → 協調(-)、Manifestor → 独立(+)、Projector → 中立
 */
function calcInterpersonalDistance(hd: HDDerived): number {
  switch (hd.type) {
    case 'Generator':             return clamp(-2)
    case 'Manifesting Generator': return clamp(-1)
    case 'Projector':             return clamp(0)
    case 'Manifestor':            return clamp(3)
    case 'Reflector':             return clamp(-1)
  }
}

/** 軸6: 社会性（個↔群）
 * Reflector → コミュニティ反映(+3)、Generator → 個人の満足(+1)
 * Manifestor → 個人行動(-2)、Projector → 0
 */
function calcSocialNature(hd: HDDerived): number {
  switch (hd.type) {
    case 'Reflector':             return clamp(3)
    case 'Generator':             return clamp(1)
    case 'Manifesting Generator': return clamp(1)
    case 'Projector':             return clamp(0)
    case 'Manifestor':            return clamp(-2)
  }
}

/** 軸7: 変化への姿勢 */
function calcChangeAttitude(hd: HDDerived): number {
  // Manifestor（革新的行動）→ +2、Reflector（保守的観察）→ -2
  switch (hd.type) {
    case 'Manifestor':            return clamp(2)
    case 'Manifesting Generator': return clamp(1)
    case 'Generator':             return clamp(0)
    case 'Projector':             return clamp(0)
    case 'Reflector':             return clamp(-2)
  }
}

/** 軸8: 生き方の重心（在り方↔やり方）
 * 内的権威 → 在り方(-)、外的権威 → やり方(+)
 */
function calcLifeFocus(hd: HDDerived): number {
  const innerAuthorities  = new Set(['Sacral', 'Splenic', 'Emotional', 'Ego Manifested', 'Ego Projected', 'Self-Projected'])
  const outerAuthorities = new Set(['Mental', 'Lunar'])

  if (innerAuthorities.has(hd.authority)) return clamp(-2)
  if (outerAuthorities.has(hd.authority)) return clamp(2)
  return 0
}

/** 軸9: 自己表現（受容↔主張）
 * スロート定義 → 主張(+2)、未定義 → 受容(-1)
 */
function calcSelfExpression(hd: HDDerived): number {
  const centers = new Set(hd.definedCenters)
  if (centers.has('Throat')) return clamp(2)
  return clamp(-1)
}

/** 軸10: 他者理解（共感↔客観）
 * 感情センター定義 → 共感(-)、脾臓定義 → 直感的読解(+1)
 */
function calcOtherUnderstanding(hd: HDDerived): number {
  const centers = new Set(hd.definedCenters)
  let score = 0
  if (centers.has('SolarPlexus')) score += -2
  if (centers.has('Spleen'))      score += 1
  return clamp(score)
}

/** 軸11: 感性（粗↔繊細）
 * 感情・脾臓ともに定義 → 繊細(-3)
 */
function calcSensitivity(hd: HDDerived): number {
  const centers = new Set(hd.definedCenters)
  if (centers.has('SolarPlexus') && centers.has('Spleen')) return clamp(-3)
  if (centers.has('SolarPlexus')) return clamp(-2)
  if (centers.has('Spleen'))      return clamp(-1)
  return 0
}

/** 軸12: 創造性（再現↔創造） */
function calcCreativity(hd: HDDerived): number {
  // Manifestor（発動型）→ 創造寄り
  switch (hd.type) {
    case 'Manifestor':            return clamp(2)
    case 'Manifesting Generator': return clamp(1)
    default:                      return 0
  }
}

// ---------- メインAPI ----------

/**
 * Human Design データを12軸スコアに変換
 */
export function toAxisScores(hd: HDDerived): OccultismAxisScores {
  return {
    occultism: 'Human Design',
    rawData: {
      type: hd.type,
      authority: hd.authority,
      definition: hd.definition,
      definedCenters: hd.definedCenters,
    },
    axisScores: {
      judgment:              calcJudgment(hd),
      energyDirection:       calcEnergyDirection(hd),
      informationStyle:      calcInformationStyle(hd),
      actionStyle:           calcActionStyle(hd),
      interpersonalDistance: calcInterpersonalDistance(hd),
      socialNature:          calcSocialNature(hd),
      changeAttitude:        calcChangeAttitude(hd),
      lifeFocus:             calcLifeFocus(hd),
      selfExpression:        calcSelfExpression(hd),
      otherUnderstanding:    calcOtherUnderstanding(hd),
      sensitivity:           calcSensitivity(hd),
      creativity:            calcCreativity(hd),
    },
  }
}
