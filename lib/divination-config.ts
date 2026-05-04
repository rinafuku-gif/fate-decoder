/**
 * divination-config.ts
 *
 * 11占術の設定・定数・型定義・ユーティリティ
 * クライアント/サーバー両方から import 可能（'use server' なし）
 */

// ========================================
// 1. 占術 ID 定義
// ========================================

export const DIVINATION_IDS = [
  'western',        // 西洋占星術
  'shichuu',        // 四柱推命
  'sanmei',         // 算命学
  'numerology',     // 数秘術
  'sukuyo',         // 宿曜占星術
  'maya',           // マヤ暦
  'genekeys',       // Gene Keys
  'humandesign',    // Human Design
  'kyusei',         // 九星気学
  'iching',         // 易経
  'zokan',          // 蔵干
] as const

export type DivinationId = typeof DIVINATION_IDS[number]

// デフォルトで ON になる既存6占術
export const DEFAULT_ON: DivinationId[] = ['western', 'shichuu', 'sanmei', 'numerology', 'sukuyo', 'maya']

// 追加5占術（デフォルト OFF）
export const EXTRA_DIVINATIONS: DivinationId[] = ['genekeys', 'humandesign', 'kyusei', 'iching', 'zokan']

// 占術の日本語名 + 説明文（UI 表示用）
export const DIVINATION_META: Record<DivinationId, { name: string; description: string }> = {
  western:     { name: '西洋占星術',   description: '天体配置から本質と人生のテーマを読み解く' },
  shichuu:     { name: '四柱推命',     description: '天干地支から性格と運命の傾向を見る' },
  sanmei:      { name: '算命学',       description: '十大主星と人体星図から性質と人生プログラムを読む' },
  numerology:  { name: '数秘術',       description: '数字に込められた意味からライフパスと運命数を導く' },
  sukuyo:      { name: '宿曜占星術',   description: '月の運行に基づく27宿から気質を見る' },
  maya:        { name: 'マヤ暦',       description: '銀河の音と太陽の紋章から魂の役割と才能を読む' },
  genekeys:    { name: 'Gene Keys',    description: '64の遺伝鍵から影・贈り物・シッディの道筋を見る' },
  humandesign: { name: 'Human Design', description: 'タイプ・権威・センターから自分らしい在り方を知る' },
  kyusei:      { name: '九星気学',     description: '本命星と月命星から気質と相性傾向を見る' },
  iching:      { name: '易経',         description: '64卦の象意から状況と変化の指針を読む' },
  zokan:       { name: '蔵干',         description: '地支に隠れた天干から内面に秘めた性質を見る' },
}

// ========================================
// 2. 追加占術データ型
// ========================================

export interface GeneKeysData {
  lifesWork: { gate: number; hexName: string; shadow: string; gift: string; siddhi: string }
  evolution: { gate: number; hexName: string; shadow: string; gift: string; siddhi: string }
  radiance:  { gate: number; hexName: string; shadow: string; gift: string; siddhi: string }
  purpose:   { gate: number; hexName: string; shadow: string; gift: string; siddhi: string }
}

export interface HumanDesignData {
  type: string
  typeJa: string
  authority: string
  authorityJa: string
  strategy: string
  strategyJa: string
  profile: string
  definition: string
  definitionJa: string
}

export interface KyuseiData {
  honmei: string
  honmeiNumber: number
  getsumei: string
  getsumeiNumber: number
}

export interface IchingData {
  gateNumber: number
  hexName: string
  nature: string
  description: string
}

export interface ZokanData {
  dayBranch: string
  mainZokan: string
  monthBranch: string
  monthZokan: string
}

export interface ExtraDivinationData {
  genekeys?:    GeneKeysData
  humandesign?: HumanDesignData
  kyusei?:      KyuseiData
  iching?:      IchingData
  zokan?:       ZokanData
}

// ========================================
// 3. AIプロンプト用ユーティリティ（クライアント/サーバー両用）
// ========================================

/**
 * 選択された追加占術データをAIプロンプトに挿入するテキストを生成する
 */
export function buildExtraDivinationPromptText(
  extra: ExtraDivinationData,
  selected: DivinationId[]
): string {
  const lines: string[] = []

  if (selected.includes('genekeys') && extra.genekeys) {
    const gk = extra.genekeys
    lines.push(`・Gene Keys:`)
    lines.push(`  Life's Work（太陽）: ゲート${gk.lifesWork.gate}「${gk.lifesWork.hexName}」 — 影:${gk.lifesWork.shadow} / 贈り物:${gk.lifesWork.gift} / シッディ:${gk.lifesWork.siddhi}`)
    lines.push(`  Evolution（地球）: ゲート${gk.evolution.gate}「${gk.evolution.hexName}」 — 影:${gk.evolution.shadow} / 贈り物:${gk.evolution.gift} / シッディ:${gk.evolution.siddhi}`)
    lines.push(`  Radiance（太陽Design）: ゲート${gk.radiance.gate}「${gk.radiance.hexName}」 — 贈り物:${gk.radiance.gift}`)
    lines.push(`  Purpose（地球Design）: ゲート${gk.purpose.gate}「${gk.purpose.hexName}」 — 贈り物:${gk.purpose.gift}`)
  }

  if (selected.includes('humandesign') && extra.humandesign) {
    const hd = extra.humandesign
    lines.push(`・Human Design: タイプ:${hd.typeJa} / 権威:${hd.authorityJa} / プロファイル:${hd.profile} / 定義:${hd.definitionJa} / 戦略:${hd.strategyJa}`)
  }

  if (selected.includes('kyusei') && extra.kyusei) {
    const ky = extra.kyusei
    lines.push(`・九星気学: 本命星:${ky.honmei}（${ky.honmeiNumber}）/ 月命星:${ky.getsumei}（${ky.getsumeiNumber}）`)
  }

  if (selected.includes('iching') && extra.iching) {
    const ic = extra.iching
    lines.push(`・易経（本命卦）: 第${ic.gateNumber}卦「${ic.hexName}」— ${ic.description}`)
  }

  if (selected.includes('zokan') && extra.zokan) {
    const zk = extra.zokan
    lines.push(`・蔵干: 日支「${zk.dayBranch}」の本気:${zk.mainZokan} / 月支「${zk.monthBranch}」の本気:${zk.monthZokan}`)
  }

  return lines.join('\n')
}

/**
 * 選択された占術の名称リストをプロンプトに挿入するテキストを生成する
 */
export function buildSelectedDivinationLabel(selected: DivinationId[]): string {
  return selected.map(id => DIVINATION_META[id].name).join('・')
}
