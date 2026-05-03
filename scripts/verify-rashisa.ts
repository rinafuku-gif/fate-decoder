/**
 * Phase C 検証スクリプト
 * Ryoのデータ（1989-10-24 5:58 大阪）で12軸プロファイルを計算して出力
 *
 * 実行: npx tsx scripts/verify-rashisa.ts
 *
 * Server-side のみ（sweph 依存）
 */

import { calculateRashisaProfile, toPublicProfile } from '../lib/rashisa/engine'
import type { ChartInput } from '../lib/rashisa/types'
import { AXIS_META, AXIS_KEYS } from '../lib/rashisa/types'

// ---------- Ryo のデータ ----------
const RYO_INPUT: ChartInput = {
  name:      'Ryo',
  birthDate: '1989-10-24',
  birthTime: '05:58',
  latitude:  34.76,
  longitude: 135.52,
  timezone:  'Asia/Tokyo',
}

// ---------- 検証実行 ----------

function main() {
  process.stdout.write('=== FateDecoder Phase C 検証 ===\n')
  process.stdout.write(`対象: ${RYO_INPUT.name} (${RYO_INPUT.birthDate} ${RYO_INPUT.birthTime} 大阪)\n\n`)

  let profile
  try {
    profile = calculateRashisaProfile(RYO_INPUT)
  } catch (err) {
    process.stderr.write(`ERROR: ${err}\n`)
    process.exit(1)
  }

  // ---------- 各占術の生スコア表示 ----------
  process.stdout.write('--- 各占術の軸スコア（生データ）---\n')

  const header = ['占術'.padEnd(14), ...AXIS_KEYS.map(k => AXIS_META[k].name.slice(0, 4).padStart(5))].join(' ')
  process.stdout.write(header + '\n')
  process.stdout.write('-'.repeat(header.length) + '\n')

  for (const o of profile.occultisms) {
    const row = [
      o.occultism.padEnd(14),
      ...AXIS_KEYS.map(k => {
        const v = o.axisScores[k]
        return String(v).padStart(5)
      })
    ].join(' ')
    process.stdout.write(row + '\n')
  }

  // ---------- 統合結果 ----------
  process.stdout.write('\n--- 統合結果（らしさプロファイル）---\n')

  for (const key of AXIS_KEYS) {
    const meta   = AXIS_META[key]
    const result = profile.axisProfile[key]
    const bar    = buildBar(result.score)
    const trigger = result.isQuestionTrigger ? ' [問いの起点]' : ''
    process.stdout.write(
      `${meta.name.padEnd(12)} [${meta.polarity[0].padStart(4)} ←→ ${meta.polarity[1].padEnd(4)}] ` +
      `${bar} ${String(result.score).padStart(5)} (一致度:${(result.agreement * 100).toFixed(0)}% σ:${result.stdDev.toFixed(1)})${trigger}\n`
    )
  }

  // ---------- 矛盾フラグ ----------
  const questionTriggers = AXIS_KEYS.filter(k => profile.axisProfile[k].isQuestionTrigger)
  if (questionTriggers.length > 0) {
    process.stdout.write(`\n問いの起点フラグが立った軸: ${questionTriggers.map(k => AXIS_META[k].name).join(', ')}\n`)
  } else {
    process.stdout.write('\n問いの起点フラグ: なし\n')
  }

  // ---------- 公開プロファイル ----------
  process.stdout.write('\n--- 公開プロファイル（PublicProfile）---\n')
  const pub = toPublicProfile(profile)
  for (const ax of pub.axes) {
    process.stdout.write(`${ax.name.padEnd(12)} [${ax.polarity[0]} ↔ ${ax.polarity[1]}]: ${ax.rashisaScore}\n`)
  }

  process.stdout.write(`\n生成日時: ${profile.generatedAt}\n`)
}

function buildBar(score: number): string {
  const total = 21
  const mid   = Math.floor(total / 2)  // 10
  const pos   = Math.round((score / 10) * mid) + mid
  const bar   = Array(total).fill('─')
  bar[mid] = '│'
  if (pos >= 0 && pos < total) bar[pos] = '●'
  return bar.join('')
}

main()
