/**
 * Phase E 最終検証スクリプト
 *
 * 以下を検証し、/tmp/phase-e-verification.md に出力する:
 *   1. 検証データ8件で 日干 / 中心星 / 宿曜 が期待値と一致するか
 *   2. Ryo データ（1989-10-24 5:58 大阪）で12軸プロファイル出力
 *
 * 実行: npx tsx scripts/verify-final.ts
 */

import * as fs from 'fs'
import { calculateShichuu } from '../lib/shichuu/calc'
import { calculateSanmei } from '../lib/sanmei/calc'
import { calculateSukuyo } from '../lib/sukuyo/calc'
import { calculateRashisaProfile, toPublicProfile } from '../lib/rashisa/engine'
import type { ChartInput } from '../lib/rashisa/types'
import { AXIS_KEYS, AXIS_META } from '../lib/rashisa/types'
import { calculateMayan } from '../lib/mayan/axes'

// ---------- 検証データ8件 ----------

interface VerificationCase {
  label: string
  y: number
  m: number
  d: number
  expected: {
    kin?: number          // マヤ暦 KIN
    stem?: string         // 日干（四柱推命）
    centralStar?: string  // 中心星（算命学）
    sukuyo?: string       // 宿曜
  }
}

const VERIFICATION_DATA: VerificationCase[] = [
  {
    label: '1979-11-22',
    y: 1979, m: 11, d: 22,
    expected: { kin: 93, stem: '癸', centralStar: '石門星', sukuyo: '箕宿' },
  },
  {
    label: '1982-11-06',
    y: 1982, m: 11, d: 6,
    expected: { stem: '癸', centralStar: '牽牛星', sukuyo: '柳宿' },
  },
  {
    label: '1983-06-04',
    y: 1983, m: 6, d: 4,
    expected: { stem: '癸', centralStar: '司禄星', sukuyo: '壁宿' },
  },
  {
    label: '1983-06-29',
    y: 1983, m: 6, d: 29,
    expected: { stem: '戊', centralStar: '玉堂星', sukuyo: '危宿' },
  },
  {
    label: '1986-09-03',
    y: 1986, m: 9, d: 3,
    expected: { stem: '庚', centralStar: '貫索星', sukuyo: '翼宿' },
  },
  {
    label: '1989-10-24 (Ryo)',
    y: 1989, m: 10, d: 24,
    expected: { stem: '丁', centralStar: '調舒星', sukuyo: '軫宿' },
  },
  {
    label: '2000-01-01',
    y: 2000, m: 1, d: 1,
    expected: { stem: '戊', centralStar: '司禄星', sukuyo: '心宿' },
  },
  {
    label: '1988-02-20',
    y: 1988, m: 2, d: 20,
    expected: { kin: 243, stem: '乙', centralStar: '石門星', sukuyo: '奎宿' },
  },
]

// ---------- 検証実行 ----------

interface CaseResult {
  label: string
  results: { field: string; expected: string; actual: string; pass: boolean }[]
}

function verifyCase(c: VerificationCase): CaseResult {
  const results: CaseResult['results'] = []

  // 日干（四柱推命）
  if (c.expected.stem !== undefined) {
    const shichuu = calculateShichuu(c.y, c.m, c.d)
    const actual = shichuu.dayStem
    results.push({
      field: '日干',
      expected: c.expected.stem,
      actual,
      pass: actual === c.expected.stem,
    })
  }

  // 中心星（算命学）
  if (c.expected.centralStar !== undefined) {
    const sanmei = calculateSanmei(c.y, c.m, c.d)
    const actual = sanmei.centralStar
    results.push({
      field: '中心星',
      expected: c.expected.centralStar,
      actual,
      pass: actual === c.expected.centralStar,
    })
  }

  // 宿曜
  if (c.expected.sukuyo !== undefined) {
    const sukuyo = calculateSukuyo(c.y, c.m, c.d)
    const actual = sukuyo.name
    results.push({
      field: '宿曜',
      expected: c.expected.sukuyo,
      actual,
      pass: actual === c.expected.sukuyo,
    })
  }

  // KIN（マヤ暦）
  if (c.expected.kin !== undefined) {
    const mayan = calculateMayan(c.y, c.m, c.d)
    const actual = mayan.kin
    results.push({
      field: 'KIN',
      expected: String(c.expected.kin),
      actual: String(actual),
      pass: actual === c.expected.kin,
    })
  }

  return { label: c.label, results }
}

// ---------- Ryo プロファイル ----------

const RYO_INPUT: ChartInput = {
  name:      'Ryo',
  birthDate: '1989-10-24',
  birthTime: '05:58',
  latitude:  34.6937,
  longitude: 135.5023,
  timezone:  'Asia/Tokyo',
}

function calcRyoProfile() {
  const profile = calculateRashisaProfile(RYO_INPUT)
  const pub = toPublicProfile(profile)
  return { profile, pub }
}

// ---------- メイン ----------

function main() {
  process.stdout.write('Phase E 検証開始...\n')

  const caseResults: CaseResult[] = []
  let totalPass = 0
  let totalFail = 0

  for (const c of VERIFICATION_DATA) {
    const r = verifyCase(c)
    caseResults.push(r)
    for (const item of r.results) {
      if (item.pass) totalPass++
      else totalFail++
    }
    const status = r.results.every(x => x.pass) ? 'PASS' : 'FAIL'
    process.stdout.write(`  ${status} ${c.label}\n`)
  }

  process.stdout.write(`\n検証合計: ${totalPass}件 PASS / ${totalFail}件 FAIL\n`)

  // Ryo プロファイル計算
  process.stdout.write('\nRyo プロファイル計算中...\n')
  const { profile: ryoProfile, pub: ryoPub } = calcRyoProfile()
  process.stdout.write('Ryo プロファイル計算完了\n')

  // Markdown 生成
  const lines: string[] = []

  lines.push('# Phase E 最終検証レポート')
  lines.push('')
  lines.push(`生成日時: ${new Date().toISOString()}`)
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 1. 検証データ8件')
  lines.push('')

  const allPass = totalFail === 0
  lines.push(`**総合結果: ${allPass ? 'ALL PASS' : `${totalFail}件 FAIL`}**`)
  lines.push('')
  lines.push('| 日付 | 項目 | 期待値 | 実際値 | 判定 |')
  lines.push('|------|------|--------|--------|------|')

  for (const cr of caseResults) {
    for (const item of cr.results) {
      const mark = item.pass ? 'PASS' : 'FAIL'
      lines.push(`| ${cr.label} | ${item.field} | ${item.expected} | ${item.actual} | ${mark} |`)
    }
  }

  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 2. Ryo データ（1989-10-24 5:58 大阪）')
  lines.push('')
  lines.push('### 12軸プロファイル（PublicProfile）')
  lines.push('')
  lines.push('| 軸 | 左極 | 右極 | スコア |')
  lines.push('|----|------|------|--------|')

  for (const ax of ryoPub.axes) {
    lines.push(`| ${ax.name} | ${ax.polarity[0]} | ${ax.polarity[1]} | ${ax.rashisaScore} |`)
  }

  lines.push('')
  lines.push('### 各占術の軸スコア（生データ）')
  lines.push('')
  lines.push('| 占術 | 判断 | エネ方向 | 情報 | 行動 | 対人 | 社会性 | 変化 | 生き方 | 自己表現 | 他者理解 | 感性 | 創造性 |')
  lines.push('|------|------|----------|------|------|------|--------|------|--------|----------|----------|------|--------|')

  for (const o of ryoProfile.occultisms) {
    const s = o.axisScores
    lines.push(
      `| ${o.occultism} | ${s.judgment} | ${s.energyDirection} | ${s.informationStyle} | ${s.actionStyle} | ${s.interpersonalDistance} | ${s.socialNature} | ${s.changeAttitude} | ${s.lifeFocus} | ${s.selfExpression} | ${s.otherUnderstanding} | ${s.sensitivity} | ${s.creativity} |`
    )
  }

  lines.push('')
  lines.push('### 統合結果（詳細）')
  lines.push('')
  lines.push('| 軸 | スコア | 一致度 | σ | 問いの起点 |')
  lines.push('|----|--------|--------|---|----------|')

  for (const key of AXIS_KEYS) {
    const meta = AXIS_META[key]
    const result = ryoProfile.axisProfile[key]
    const trigger = result.isQuestionTrigger ? 'あり' : '-'
    lines.push(`| ${meta.name} | ${result.score} | ${(result.agreement * 100).toFixed(0)}% | ${result.stdDev} | ${trigger} |`)
  }

  lines.push('')
  lines.push(`生成日時: ${ryoProfile.generatedAt}`)
  lines.push('')

  const md = lines.join('\n')

  const outPath = '/tmp/phase-e-verification.md'
  fs.writeFileSync(outPath, md, 'utf-8')
  process.stdout.write(`\n出力先: ${outPath}\n`)

  // 終了ステータス
  if (totalFail > 0) {
    process.stderr.write(`\n警告: ${totalFail}件の検証が失敗しました\n`)
    process.exit(1)
  } else {
    process.stdout.write('\n全件 PASS\n')
  }
}

main()
