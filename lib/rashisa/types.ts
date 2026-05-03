/**
 * 12軸スコア統合エンジン — 型定義
 * 設計書 §6 準拠
 */

// 統合エンジンへの入力
export interface ChartInput {
  name: string
  birthDate: string   // YYYY-MM-DD
  birthTime: string   // HH:MM
  latitude: number
  longitude: number
  timezone?: string
}

// ---------- §6.1 各占術の中間出力 ----------

/**
 * 12軸スコア（各軸 -10〜+10）
 * キー名は §6.1 の axisScores フィールド名に一致
 */
export interface AxisScores {
  judgment: number               // 軸1: 判断（論理↔感情）
  energyDirection: number        // 軸2: エネルギー方向（内向↔外向）
  informationStyle: number       // 軸3: 情報の捉え方（直感↔現実）
  actionStyle: number            // 軸4: 行動様式（構造↔流動）
  interpersonalDistance: number  // 軸5: 対人距離（協調↔独立）
  socialNature: number           // 軸6: 社会性（個↔群）
  changeAttitude: number         // 軸7: 変化への姿勢（保守↔革新）
  lifeFocus: number              // 軸8: 生き方の重心（在り方↔やり方）
  selfExpression: number         // 軸9: 自己表現（受容↔主張）
  otherUnderstanding: number     // 軸10: 他者理解（共感↔客観）
  sensitivity: number            // 軸11: 感性（粗↔繊細）
  creativity: number             // 軸12: 創造性（再現↔創造）
}

/** 占術識別子 — §6.1 の文字列リテラル型 */
export type OccultismName =
  | '西洋占星術'
  | '四柱推命'
  | '蔵干'
  | 'Gene Keys'
  | 'Human Design'
  | '易経'
  | 'マヤ暦'
  | '数秘術'
  | '算命学'
  | '宿曜'
  | '九星気学'

/** 軸キー型 */
export type AxisKey = keyof AxisScores

/** 各占術の中間出力 — §6.1 OccultismAxisScores */
export interface OccultismAxisScores {
  occultism: OccultismName
  rawData: object  // 占術固有の生データ（裏で保持、UIには出さない）
  axisScores: AxisScores
}

// ---------- §6.2 統合出力（らしさプロファイル） ----------

/** 各軸への占術寄与（裏ロジック） */
export interface AxisContributor {
  occultism: OccultismName
  score: number
  weight: number
}

/** 各軸の統合結果 */
export interface AxisResult {
  score: number              // 最終らしさスコア（-10〜+10）
  agreement: number          // 一致度（0〜1）
  stdDev: number             // 標準偏差
  isQuestionTrigger: boolean // 問いの起点フラグ（σ > 4）
  contributors: AxisContributor[]
}

/** らしさプロファイル — §6.2 RashisaProfile */
export interface RashisaProfile {
  input: ChartInput
  occultisms: OccultismAxisScores[]  // 11占術分の中間出力
  axisProfile: Record<AxisKey, AxisResult>
  generatedAt: string
}

// ---------- §6.3 UIに出すデータ（公開） ----------

/** 公開用プロファイル — 占術名を含めない */
export interface PublicProfile {
  axes: {
    name: string
    polarity: [string, string]
    rashisaScore: number
    imaScore?: number
  }[]
}

// ---------- 軸メタデータ ----------

/** 12軸の表示情報 */
export const AXIS_META: Record<AxisKey, { name: string; polarity: [string, string] }> = {
  judgment:              { name: '判断',           polarity: ['論理', '感情'] },
  energyDirection:       { name: 'エネルギー方向', polarity: ['内向', '外向'] },
  informationStyle:      { name: '情報の捉え方',   polarity: ['直感', '現実'] },
  actionStyle:           { name: '行動様式',       polarity: ['構造', '流動'] },
  interpersonalDistance: { name: '対人距離',       polarity: ['協調', '独立'] },
  socialNature:          { name: '社会性',         polarity: ['個', '群'] },
  changeAttitude:        { name: '変化への姿勢',   polarity: ['保守', '革新'] },
  lifeFocus:             { name: '生き方の重心',   polarity: ['在り方', 'やり方'] },
  selfExpression:        { name: '自己表現',       polarity: ['受容', '主張'] },
  otherUnderstanding:    { name: '他者理解',       polarity: ['共感', '客観'] },
  sensitivity:           { name: '感性',           polarity: ['粗', '繊細'] },
  creativity:            { name: '創造性',         polarity: ['再現', '創造'] },
}

export const AXIS_KEYS: AxisKey[] = [
  'judgment', 'energyDirection', 'informationStyle', 'actionStyle',
  'interpersonalDistance', 'socialNature', 'changeAttitude', 'lifeFocus',
  'selfExpression', 'otherUnderstanding', 'sensitivity', 'creativity',
]
