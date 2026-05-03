/**
 * 九星気学 計算モジュール
 *
 * 理論:
 * - 本命星: 生年（立春起算）の各桁の和を一桁になるまで加算し、11から引く。
 *   結果が0なら9、10なら1として1〜9に正規化する。
 * - 月命星: 本命星の番号を使った月ごとのマッピングで算出。
 * - 立春境界: 毎年2月4日前後（古典法では固定で2/4を使用。
 *   厳密な立春時刻による補正は Phase B 以降の sweph 精密化で対応）
 *
 * 入力: 生年月日（YYYY-MM-DD）
 * 出力: 本命星・月命星（1〜9の数字と和名）
 */

export interface KyuseiResult {
  /** 本命星の名称（例: "一白水星"） */
  honmei: string
  /** 本命星の番号（1〜9） */
  honmeiNumber: number
  /** 月命星の名称（例: "八白土星"） */
  getsumei: string
  /** 月命星の番号（1〜9） */
  getsumeiNumber: number
}

/** 九星の名称テーブル（インデックス0は未使用） */
const STAR_NAMES: Record<number, string> = {
  1: '一白水星',
  2: '二黒土星',
  3: '三碧木星',
  4: '四緑木星',
  5: '五黄土星',
  6: '六白金星',
  7: '七赤金星',
  8: '八白土星',
  9: '九紫火星',
}

/**
 * 数の各桁を1桁になるまで繰り返し加算する（数字根）
 */
function digitalRoot(n: number): number {
  while (n > 9) {
    n = String(n)
      .split('')
      .reduce((sum, d) => sum + parseInt(d, 10), 0)
  }
  return n
}

/**
 * 生年月日文字列をパースし、年・月・日を返す。
 * 不正なフォーマットや存在しない日付の場合は例外を投げる。
 * （例: '1989-13-32', 'abc', ''）
 */
function parseBirthDate(birthDate: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  if (!match) throw new Error(`Invalid birthDate format: ${birthDate} (expected YYYY-MM-DD)`)
  const y = Number(match[1]), m = Number(match[2]), d = Number(match[3])
  if (m < 1 || m > 12) throw new Error(`Invalid month: ${m}`)
  if (d < 1 || d > 31) throw new Error(`Invalid day: ${d}`)
  const daysInMonth = new Date(y, m, 0).getDate()
  if (d > daysInMonth) throw new Error(`Invalid day ${d} for ${y}-${m}`)
  return { y, m, d }
}

/**
 * 立春前後の判定
 * 古典法では毎年2月4日を立春の境界として扱う。
 * 2/4 当年扱い、2/3 以前（1/1〜2/3）は前年扱い。
 * 古典の節入りは2/4 朝が多いため 2/4=当年扱いが妥当とされる。
 * 厳密な立春時刻による補正は Phase B 以降で sweph を使って実施する。
 *
 * @returns 気学上の年（立春前なら前年扱い）
 */
function getKyuseiYear(birthDate: string): number {
  const { y, m, d } = parseBirthDate(birthDate)
  // 2/3 以前（1/1〜2/3）は前年扱い、2/4 以降は当年扱い
  if (m < 2 || (m === 2 && d <= 3)) {
    return y - 1
  }
  return y
}

/**
 * 本命星番号を算出する（1〜9）
 * 計算式: (11 - 各桁の和を1桁になるまで加算) mod 9
 * 結果が0の場合は9として扱う
 */
function calcHonmeiNumber(year: number): number {
  const root = digitalRoot(year)
  const result = (11 - root) % 9
  return result === 0 ? 9 : result
}

/**
 * 月命星番号を算出する（1〜9）
 *
 * 月命星は本命星の番号により始点が決まり、1年で9宮を一巡する。
 * 本命星ごとの「寅月（3月節入り）の月命星」から逆算する。
 *
 * 月命星の起点（各本命星の寅月の月命星）:
 *   本命星 1 → 寅月=8（八白土星）
 *   本命星 2 → 寅月=5（五黄土星）
 *   本命星 3 → 寅月=2（二黒土星）
 *   本命星 4 → 寅月=8（八白土星）
 *   本命星 5 → 寅月=5（五黄土星）
 *   本命星 6 → 寅月=2（二黒土星）
 *   本命星 7 → 寅月=8（八白土星）
 *   本命星 8 → 寅月=5（五黄土星）
 *   本命星 9 → 寅月=2（二黒土星）
 *
 * 月は節入り（古典法では固定日）で切り替わる。
 * 節入り固定値（各月の節入りおおよそ日）:
 *   1月: 6日(小寒), 2月: 4日(立春), 3月: 6日(啓蟄), 4月: 5日(清明),
 *   5月: 6日(立夏), 6月: 6日(芒種), 7月: 7日(小暑), 8月: 8日(立秋),
 *   9月: 8日(白露), 10月: 8日(寒露), 11月: 7日(立冬), 12月: 7日(大雪)
 */
function calcGetsumeiNumber(honmeiNumber: number, birthDate: string): number {
  const [, m, d] = birthDate.split('-').map(Number)

  // 月節入り日（固定法）—— 月の気学番号（寅月=1, 卯月=2, ... 丑月=12）を求める
  const SETSUIRI: number[] = [6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7]

  // 気学月番号（0-indexed）: 寅月(2月節)=0, 卯月=1, ... 丑月=11
  // ある月mの節入り日以降なら「月m」、節入り前なら「月m-1」
  let kyuseiMonth: number
  if (d < SETSUIRI[m - 1]) {
    // 節入り前 → 前の気学月
    kyuseiMonth = ((m - 2 - 1 + 12) % 12) // 0-indexed, 前月
  } else {
    kyuseiMonth = (m - 1 - 1 + 12) % 12    // 0-indexed, 当月（1月始まり→寅月=2月を0番とするため -1-1）
  }
  // 修正: 気学月は寅月(2月節)を月0として12ヶ月巡る
  // m=2, d>=4: 寅月(0), m=3, d>=6: 卯月(1), ..., m=1, d>=6: 丑月(11)
  // 上記を正しく再計算
  // 気学月番号(0-indexed): 寅月(月番号=2)から始まり、1月節は丑月(11番)
  const KYUSEI_MONTH_START = 2 // 寅月は太陽暦2月
  // 節入り後の実際の気学月を計算
  let base: number
  if (d >= SETSUIRI[m - 1]) {
    base = (m - KYUSEI_MONTH_START + 12) % 12
  } else {
    base = (m - 1 - KYUSEI_MONTH_START + 12) % 12
  }

  // 本命星ごとの寅月（base=0）の月命星
  const TORA_GETSUMEI: Record<number, number> = {
    1: 8, 2: 5, 3: 2,
    4: 8, 5: 5, 6: 2,
    7: 8, 8: 5, 9: 2,
  }

  const toraBase = TORA_GETSUMEI[honmeiNumber]
  // 寅月から base ヶ月進む。月命星は逆行（毎月 -1 ずつ進む）
  // 九宮は9で一巡するため: (toraBase - base - 1 + 90) % 9 + 1
  const result = ((toraBase - base - 1 + 90) % 9) + 1
  return result
}

/**
 * 九星気学を計算する
 * @param birthDate 生年月日（YYYY-MM-DD 形式）
 * @throws 不正フォーマット・存在しない日付の場合
 * @returns KyuseiResult
 */
export function calculateKyusei(birthDate: string): KyuseiResult {
  // バリデーション: 不正入力は例外で弾く（デタラメな結果を返さない）
  parseBirthDate(birthDate)
  const kyuseiYear = getKyuseiYear(birthDate)
  const honmeiNumber = calcHonmeiNumber(kyuseiYear)
  const getsumeiNumber = calcGetsumeiNumber(honmeiNumber, birthDate)

  return {
    honmei: STAR_NAMES[honmeiNumber],
    honmeiNumber,
    getsumei: STAR_NAMES[getsumeiNumber],
    getsumeiNumber,
  }
}
