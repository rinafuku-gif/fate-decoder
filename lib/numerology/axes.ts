/**
 * 数秘術 → 12軸スコア変換
 * 設計書 §4 準拠
 *
 * 数秘術は重みが低め（全軸 0.4〜0.6）のため補助的な寄与に留める。
 * ライフパス数（LP）を既存の fortune-calc.ts ロジックで算出。
 */

import type { OccultismAxisScores } from '../rashisa/types'

function clamp(v: number): number {
  return Math.max(-10, Math.min(10, Math.round(v * 10) / 10))
}

export interface NumerologyData {
  lifePathNumber: number  // 1〜9、11、22、33
  lifePathStr: string     // "1"〜"9"、"11"、"22"、"33"
}

/**
 * ライフパス数を算出（fortune-calc.ts の reduce ロジックを移植）
 */
export function calculateNumerology(y: number, m: number, d: number): NumerologyData {
  const s = '' + y + m + d

  function reduce(str: string): string {
    if (['11', '22', '33'].includes(str)) return str
    if (str.length === 1) return str
    let sum = 0
    for (const c of str) sum += parseInt(c, 10)
    return reduce('' + sum)
  }

  const lpStr = reduce(s)
  const lpNum = parseInt(lpStr, 10)

  return {
    lifePathNumber: lpNum,
    lifePathStr: lpStr,
  }
}

// ---------- 軸計算 ----------

/** ライフパス数のスコアマッピング（設計書 §4 の数秘術は軽量記述のため、
 *  各数の伝統的特性から初期値を設定） */

const LP_SCORES: Record<number, {
  judgment: number         // 論理↔感情
  energyDirection: number  // 内向↔外向
  interpersonalDistance: number // 協調↔独立
  socialNature: number     // 個↔群
  changeAttitude: number   // 保守↔革新
  lifeFocus: number        // 在り方↔やり方
  selfExpression: number   // 受容↔主張
  creativity: number       // 再現↔創造
}> = {
  1:  { judgment: -1, energyDirection: 2,  interpersonalDistance: 2,  socialNature: -1, changeAttitude: 2,  lifeFocus: 1,  selfExpression: 2,  creativity: 2 },
  2:  { judgment: 1,  energyDirection: -2, interpersonalDistance: -2, socialNature: 1,  changeAttitude: -1, lifeFocus: -1, selfExpression: -2, creativity: 0 },
  3:  { judgment: 1,  energyDirection: 2,  interpersonalDistance: 0,  socialNature: 1,  changeAttitude: 1,  lifeFocus: 0,  selfExpression: 2,  creativity: 2 },
  4:  { judgment: -2, energyDirection: 0,  interpersonalDistance: -1, socialNature: -1, changeAttitude: -2, lifeFocus: 1,  selfExpression: -1, creativity: -1 },
  5:  { judgment: 0,  energyDirection: 2,  interpersonalDistance: 1,  socialNature: 0,  changeAttitude: 2,  lifeFocus: 1,  selfExpression: 1,  creativity: 2 },
  6:  { judgment: 1,  energyDirection: -1, interpersonalDistance: -2, socialNature: 2,  changeAttitude: -1, lifeFocus: -1, selfExpression: 0,  creativity: 0 },
  7:  { judgment: -2, energyDirection: -2, interpersonalDistance: 1,  socialNature: -2, changeAttitude: 0,  lifeFocus: -2, selfExpression: -1, creativity: 1 },
  8:  { judgment: -1, energyDirection: 1,  interpersonalDistance: 1,  socialNature: 0,  changeAttitude: 0,  lifeFocus: 2,  selfExpression: 2,  creativity: 0 },
  9:  { judgment: 1,  energyDirection: 1,  interpersonalDistance: -1, socialNature: 2,  changeAttitude: 1,  lifeFocus: -1, selfExpression: 1,  creativity: 1 },
  11: { judgment: 2,  energyDirection: -2, interpersonalDistance: -1, socialNature: 1,  changeAttitude: 1,  lifeFocus: -2, selfExpression: 0,  creativity: 2 },
  22: { judgment: -2, energyDirection: 0,  interpersonalDistance: -1, socialNature: 2,  changeAttitude: 0,  lifeFocus: 1,  selfExpression: 1,  creativity: 2 },
  33: { judgment: 2,  energyDirection: -1, interpersonalDistance: -2, socialNature: 2,  changeAttitude: 0,  lifeFocus: -2, selfExpression: -1, creativity: 1 },
}

function getScore<K extends keyof typeof LP_SCORES[number]>(data: NumerologyData, key: K): number {
  const entry = LP_SCORES[data.lifePathNumber]
  if (!entry) return 0
  return clamp(entry[key])
}

// ---------- メインAPI ----------

/**
 * 数秘術データを12軸スコアに変換
 */
export function toAxisScores(y: number, m: number, d: number): OccultismAxisScores {
  const data = calculateNumerology(y, m, d)

  return {
    occultism: '数秘術',
    rawData: data,
    axisScores: {
      judgment:              getScore(data, 'judgment'),
      energyDirection:       getScore(data, 'energyDirection'),
      informationStyle:      0,  // 数秘術は軸3への具体的な寄与設計なし
      actionStyle:           0,
      interpersonalDistance: getScore(data, 'interpersonalDistance'),
      socialNature:          getScore(data, 'socialNature'),
      changeAttitude:        getScore(data, 'changeAttitude'),
      lifeFocus:             getScore(data, 'lifeFocus'),
      selfExpression:        getScore(data, 'selfExpression'),
      otherUnderstanding:    0,
      sensitivity:           0,
      creativity:            getScore(data, 'creativity'),
    },
  }
}
