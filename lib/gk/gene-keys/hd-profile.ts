/**
 * HD Profile 算出
 * Life's Work の Line と Radiance の Line を組み合わせる
 */

export function buildHDProfile(lwLine: number, raLine: number): string {
  const lineNames: Record<number, string> = {
    1: 'Investigator',
    2: 'Hermit',
    3: 'Martyr',
    4: 'Opportunist',
    5: 'Heretic',
    6: 'Role Model',
  }
  const lwName = lineNames[lwLine] ?? `L${lwLine}`
  const raName = lineNames[raLine] ?? `L${raLine}`
  return `${lwLine}/${raLine} ${lwName} / ${raName}`
}
