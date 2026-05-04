'use server'

/**
 * multi-divination.ts
 *
 * 追加5占術の Server-side 計算 Server Action
 * （既存6占術は fortune-calc.ts 側で計算済みのため、ここでは追加5占術のみ）
 *
 * Gene Keys / Human Design: sweph 依存 → Server-side only
 * 九星気学 / 易経 / 蔵干: 純 TS → 同じく Server 側に寄せる
 */

import type { DivinationId, ExtraDivinationData } from './divination-config'

/**
 * 選択された追加占術（Gene Keys / HD / 九星気学 / 易経 / 蔵干）を計算する。
 */
export async function calculateExtraDivinations(
  year: number,
  month: number,
  day: number,
  selected: DivinationId[]
): Promise<ExtraDivinationData> {
  const result: ExtraDivinationData = {}

  const needsGK      = selected.includes('genekeys')
  const needsHD      = selected.includes('humandesign')
  const needsKyusei  = selected.includes('kyusei')
  const needsIching  = selected.includes('iching')
  const needsZokan   = selected.includes('zokan')

  // Gene Keys / Human Design は sweph 依存 → 同じ天体計算を共有する
  if (needsGK || needsHD) {
    try {
      const { calculatePlanetLongitudes } = await import('./gk/astro/calculate')
      const { calculateAllPositions }     = await import('./gk/gene-keys/positions')

      // 出生日の正午 JST → UTC（9h 引く）
      const birthDate  = new Date(Date.UTC(year, month - 1, day, 3, 0, 0)) // 正午JST = 03:00 UTC
      // Human Design の Design 天体は出生の約88日前
      const designDate = new Date(birthDate.getTime() - 88 * 24 * 60 * 60 * 1000)

      const personalityLons = calculatePlanetLongitudes(birthDate)
      const designLons      = calculatePlanetLongitudes(designDate)

      const chart = calculateAllPositions(personalityLons, designLons, {
        name: '',
        birthDate: `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
        birthTime: '12:00',
        birthPlace: '',
        reportDate: new Date().toISOString().slice(0, 10),
      })

      if (needsGK) {
        result.genekeys = {
          lifesWork: {
            gate:    chart.lifesWork.gate,
            hexName: chart.lifesWork.hexName,
            shadow:  chart.lifesWork.shadow,
            gift:    chart.lifesWork.gift,
            siddhi:  chart.lifesWork.siddhi,
          },
          evolution: {
            gate:    chart.evolution.gate,
            hexName: chart.evolution.hexName,
            shadow:  chart.evolution.shadow,
            gift:    chart.evolution.gift,
            siddhi:  chart.evolution.siddhi,
          },
          radiance: {
            gate:    chart.radiance.gate,
            hexName: chart.radiance.hexName,
            shadow:  chart.radiance.shadow,
            gift:    chart.radiance.gift,
            siddhi:  chart.radiance.siddhi,
          },
          purpose: {
            gate:    chart.purpose.gate,
            hexName: chart.purpose.hexName,
            shadow:  chart.purpose.shadow,
            gift:    chart.purpose.gift,
            siddhi:  chart.purpose.siddhi,
          },
        }
      }

      if (needsHD) {
        const hd = chart.hdDerived
        result.humandesign = {
          type:         hd.type,
          typeJa:       hd.typeJa,
          authority:    hd.authority,
          authorityJa:  hd.authorityJa,
          strategy:     hd.strategy,
          strategyJa:   hd.strategyJa,
          profile:      chart.hdProfile,
          definition:   hd.definition,
          definitionJa: hd.definitionJa,
        }
      }
    } catch (e) {
      console.error('[multi-divination/genekeys-humandesign]', e)
    }
  }

  if (needsKyusei) {
    try {
      const { calculateKyusei } = await import('./kyusei/calc')
      const birthStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      const kyusei = calculateKyusei(birthStr)
      result.kyusei = {
        honmei:         kyusei.honmei,
        honmeiNumber:   kyusei.honmeiNumber,
        getsumei:       kyusei.getsumei,
        getsumeiNumber: kyusei.getsumeiNumber,
      }
    } catch (e) {
      console.error('[multi-divination/kyusei]', e)
    }
  }

  if (needsIching) {
    try {
      const { calculateIching } = await import('./iching/calc')

      let geneKeyGate: number | undefined

      // Gene Keys が計算済みであればそこから gate を取得
      if (result.genekeys) {
        geneKeyGate = result.genekeys.lifesWork.gate
      } else {
        // Gene Keys が未計算の場合は sweph で Life's Work ゲートを独立計算
        try {
          const { calculatePlanetLongitudes } = await import('./gk/astro/calculate')
          const { calculateAllPositions }     = await import('./gk/gene-keys/positions')
          const birthDate  = new Date(Date.UTC(year, month - 1, day, 3, 0, 0))
          const designDate = new Date(birthDate.getTime() - 88 * 24 * 60 * 60 * 1000)
          const chart = calculateAllPositions(
            calculatePlanetLongitudes(birthDate),
            calculatePlanetLongitudes(designDate),
            { name: '', birthDate: `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`, birthTime: '12:00', birthPlace: '', reportDate: '' }
          )
          geneKeyGate = chart.lifesWork.gate
        } catch (e) {
          console.error('[multi-divination/iching-sweph-fallback]', e)
        }
      }

      if (geneKeyGate !== undefined) {
        const iching = calculateIching({ birthDate: `${year}-${month}-${day}`, geneKeyGate })
        result.iching = {
          gateNumber:  iching.benKa.number,
          hexName:     iching.benKa.name,
          nature:      iching.benKa.nature,
          description: iching.benKa.description,
        }
      }
    } catch (e) {
      console.error('[multi-divination/iching]', e)
    }
  }

  if (needsZokan) {
    try {
      const { ZOKAN_TABLE, calculateShichuu } = await import('./shichuu/calc')

      // calculateShichuu を使って月支・蔵干を取得（節入り補正済み）。
      // shichuu 占術が選択されている場合でも、ここで1回だけ呼ぶ（重複してもコストは軽微）。
      const shichuuResult = calculateShichuu(year, month, day)

      const dayBranch   = shichuuResult.day.branch
      const monthBranch = shichuuResult.month.branch

      const dayZokanEntry   = ZOKAN_TABLE[dayBranch]

      result.zokan = {
        dayBranch,
        mainZokan:  dayZokanEntry?.[4] ?? '',
        monthBranch,
        monthZokan: shichuuResult.month.zokan,
      }
    } catch (e) {
      console.error('[multi-divination/zokan]', e)
    }
  }

  return result
}
