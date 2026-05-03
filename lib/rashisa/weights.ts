/**
 * 11占術 × 12軸 重みマッピング定数
 * 設計書 §3 準拠（初期値。実装後に Ryo が調整する）
 *
 * 列順: 西洋占星術 / 四柱推命 / 蔵干 / Gene Keys / Human Design /
 *       易経 / マヤ暦 / 数秘術 / 算命学 / 宿曜 / 九星気学
 */

import type { OccultismName, AxisKey } from './types'

/** 占術名の配列（重みテーブルの列順と一致） */
export const OCCULTISM_NAMES: OccultismName[] = [
  '西洋占星術',
  '四柱推命',
  '蔵干',
  'Gene Keys',
  'Human Design',
  '易経',
  'マヤ暦',
  '数秘術',
  '算命学',
  '宿曜',
  '九星気学',
]

/**
 * 重みマッピングテーブル
 * weights[occultism][axis] = 0.0〜1.0
 */
export const WEIGHTS: Record<OccultismName, Record<AxisKey, number>> = {
  '西洋占星術': {
    judgment:              1.0,
    energyDirection:       1.0,
    informationStyle:      1.0,
    actionStyle:           0.8,
    interpersonalDistance: 0.7,
    socialNature:          0.7,
    changeAttitude:        1.0,
    lifeFocus:             0.9,
    selfExpression:        0.8,
    otherUnderstanding:    0.9,
    sensitivity:           0.9,
    creativity:            0.9,
  },
  '四柱推命': {
    judgment:              0.9,
    energyDirection:       0.9,
    informationStyle:      0.7,
    actionStyle:           0.9,
    interpersonalDistance: 0.9,
    socialNature:          0.6,
    changeAttitude:        0.7,
    lifeFocus:             0.5,
    selfExpression:        0.9,
    otherUnderstanding:    0.6,
    sensitivity:           0.7,
    creativity:            0.7,
  },
  '蔵干': {
    judgment:              0.5,
    energyDirection:       0.3,
    informationStyle:      0.7,
    actionStyle:           0.5,
    interpersonalDistance: 0.4,
    socialNature:          0.3,
    changeAttitude:        0.4,
    lifeFocus:             0.7,
    selfExpression:        0.5,
    otherUnderstanding:    0.3,
    sensitivity:           0.8,
    creativity:            0.4,
  },
  'Gene Keys': {
    judgment:              0.7,
    energyDirection:       0.5,
    informationStyle:      0.9,
    actionStyle:           0.6,
    interpersonalDistance: 0.7,
    socialNature:          0.8,
    changeAttitude:        0.9,
    lifeFocus:             1.0,
    selfExpression:        0.6,
    otherUnderstanding:    0.8,
    sensitivity:           0.9,
    creativity:            0.9,
  },
  'Human Design': {
    judgment:              0.8,
    energyDirection:       0.9,
    informationStyle:      0.7,
    actionStyle:           0.9,
    interpersonalDistance: 1.0,
    socialNature:          0.9,
    changeAttitude:        0.6,
    lifeFocus:             0.9,
    selfExpression:        0.8,
    otherUnderstanding:    0.8,
    sensitivity:           0.7,
    creativity:            0.6,
  },
  '易経': {
    judgment:              0.4,
    energyDirection:       0.3,
    informationStyle:      0.6,
    actionStyle:           0.8,
    interpersonalDistance: 0.4,
    socialNature:          0.5,
    changeAttitude:        1.0,
    lifeFocus:             0.9,
    selfExpression:        0.5,
    otherUnderstanding:    0.4,
    sensitivity:           0.5,
    creativity:            0.9,
  },
  'マヤ暦': {
    judgment:              0.3,
    energyDirection:       0.5,
    informationStyle:      0.4,
    actionStyle:           0.4,
    interpersonalDistance: 0.5,
    socialNature:          0.6,
    changeAttitude:        0.4,
    lifeFocus:             0.4,
    selfExpression:        0.5,
    otherUnderstanding:    0.4,
    sensitivity:           0.4,
    creativity:            0.4,
  },
  '数秘術': {
    judgment:              0.5,
    energyDirection:       0.5,
    informationStyle:      0.5,
    actionStyle:           0.5,
    interpersonalDistance: 0.4,
    socialNature:          0.4,
    changeAttitude:        0.4,
    lifeFocus:             0.6,
    selfExpression:        0.4,
    otherUnderstanding:    0.4,
    sensitivity:           0.4,
    creativity:            0.5,
  },
  '算命学': {
    judgment:              0.9,
    energyDirection:       0.7,
    informationStyle:      0.7,
    actionStyle:           0.7,
    interpersonalDistance: 0.9,
    socialNature:          0.6,
    changeAttitude:        0.6,
    lifeFocus:             0.5,
    selfExpression:        1.0,
    otherUnderstanding:    0.7,
    sensitivity:           0.6,
    creativity:            0.8,
  },
  '宿曜': {
    judgment:              0.3,
    energyDirection:       0.6,
    informationStyle:      0.4,
    actionStyle:           0.6,
    interpersonalDistance: 0.8,
    socialNature:          0.7,
    changeAttitude:        0.4,
    lifeFocus:             0.5,
    selfExpression:        0.7,
    otherUnderstanding:    0.7,
    sensitivity:           0.6,
    creativity:            0.4,
  },
  '九星気学': {
    judgment:              0.4,
    energyDirection:       0.8,
    informationStyle:      0.4,
    actionStyle:           0.5,
    interpersonalDistance: 0.6,
    socialNature:          1.0,
    changeAttitude:        0.8,
    lifeFocus:             0.4,
    selfExpression:        0.7,
    otherUnderstanding:    0.4,
    sensitivity:           0.5,
    creativity:            0.7,
  },
}

/**
 * 軸ごとの重み合計（正規化用）
 * Σ(重み) per axis
 */
export const WEIGHT_TOTALS: Record<AxisKey, number> = (() => {
  const totals = {} as Record<AxisKey, number>
  const axes: AxisKey[] = [
    'judgment', 'energyDirection', 'informationStyle', 'actionStyle',
    'interpersonalDistance', 'socialNature', 'changeAttitude', 'lifeFocus',
    'selfExpression', 'otherUnderstanding', 'sensitivity', 'creativity',
  ]
  for (const axis of axes) {
    totals[axis] = OCCULTISM_NAMES.reduce((sum, name) => sum + WEIGHTS[name][axis], 0)
  }
  return totals
})()
