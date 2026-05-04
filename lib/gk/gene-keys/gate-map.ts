/**
 * Human Design / Gene Keys ゲートマッピング
 *
 * Rave Mandala (Rave I Ching Wheel) の黄経→ゲート変換
 *
 * 計算規則:
 * - Gate 25 が Pisces 28°15' (= 黄経 358.25°) から始まる
 * - 各ゲートは 5.625度 (= 360/64) の幅を持つ
 * - ゲートの並び順は Rave I Ching Wheel の順序に従う
 * - 各ゲート内を 6等分して Line 1-6 を割り当て (各 0.9375度)
 *
 * 参考: Human Design International (Jovian Archive) の公式仕様
 */

// Rave Mandala の64ゲートを春分点(黄経0°)付近から順に並べた配列
// Gate 25 が Pisces 28°15' = 黄経 358.25° から始まる
const GATE_ORDER: number[] = [
  25, 17, 21, 51, 42, 3, 27, 24, 2, 23, 8,
  20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
  31, 33, 7, 4, 29, 59, 40, 64, 47, 6,
  46, 18, 48, 57, 32, 50, 28, 44, 1, 43, 14,
  34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60,
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36
]

const GATE25_START_LON = 358.25  // Pisces 28°15' = 330 + 28.25
const GATE_WIDTH = 360 / 64       // 5.625度
const LINE_WIDTH = GATE_WIDTH / 6  // 0.9375度

// ゲートの開始黄経マップを構築
const gateStartLon = new Map<number, number>()
let currentLon = GATE25_START_LON
for (const gate of GATE_ORDER) {
  gateStartLon.set(gate, ((currentLon % 360) + 360) % 360)
  currentLon += GATE_WIDTH
}

/**
 * 黄経度数からゲート番号とライン番号を算出
 * @param longitude 黄経 0-360度
 * @returns { gate: number, line: number }
 */
export function longitudeToGateLine(longitude: number): { gate: number; line: number } {
  const lon = ((longitude % 360) + 360) % 360

  for (const gate of GATE_ORDER) {
    const start = gateStartLon.get(gate)!
    const end = (start + GATE_WIDTH) % 360

    let inSegment: boolean
    if (start < end) {
      inSegment = lon >= start && lon < end
    } else {
      // 360度をまたぐセグメント（Gate 25: 358.25° - 3.875°）
      inSegment = lon >= start || lon < end
    }

    if (inSegment) {
      let posWithinGate = lon - start
      if (posWithinGate < 0) posWithinGate += 360

      const lineIndex = Math.floor(posWithinGate / LINE_WIDTH)
      const line = Math.min(Math.max(lineIndex + 1, 1), 6)
      return { gate, line }
    }
  }

  // フォールバック（通常は発生しない）
  return { gate: 1, line: 1 }
}

export { gateStartLon, GATE_ORDER, GATE_WIDTH, LINE_WIDTH }
