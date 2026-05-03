/**
 * 易経（I Ching）計算モジュール
 *
 * 設計方針（MVP仕様）:
 * - 本命卦: Gene Keys の Life's Work ゲート番号を卦番号として流用する。
 *   Gene Keys の64ゲートと易経の64卦は Rave I Ching を介して1対1対応する。
 *   Gene Keys ゲートが利用できない場合は生年月日から伝統法で算出する。
 * - 動爻: MVP では空配列（Phase C 以降の精密化で実装）
 *
 * 伝統法（Gene Keys ゲートなしの場合）:
 * - 上卦（外卦）: 生年 + 月 + 日の和を8で割った余り（1〜8）
 * - 下卦（内卦）: (生年 + 月 + 日 + 時) の和を8で割った余り（時は0を使用）
 * - 卦番号: 易経64卦マッピングで上卦×下卦から卦番号を決定
 *
 * 注意: 動爻の完全実装と伝統法の精密化は Phase B 以降で対応。
 */

/** 64卦のメタデータ */
export interface HexagramData {
  /** 卦番号（1〜64） */
  number: number
  /** 卦名（漢字） */
  name: string
  /** 卦の性質 */
  nature: 'stable' | 'change'
  /** 卦辞の要約 */
  description: string
}

export interface IchingResult {
  /** 本命卦 */
  benKa: HexagramData
  /** 動爻の位置（1〜6）— MVP では空配列 */
  activeLines: number[]
}

/**
 * 64卦データテーブル
 * 卦番号（易経の伝統的番号）→ メタデータ
 * nature: stable（坤・艮・坎など安定傾向）/ change（震・巽・離など変化傾向）
 */
const HEXAGRAM_DATA: Record<number, HexagramData> = {
  1:  { number: 1,  name: '乾',  nature: 'stable',  description: '天の力。強健・創造・先導の象' },
  2:  { number: 2,  name: '坤',  nature: 'stable',  description: '地の従順。受容・包容・忍耐の象' },
  3:  { number: 3,  name: '屯',  nature: 'change',  description: '始まりの困難。可能性の芽生え' },
  4:  { number: 4,  name: '蒙',  nature: 'stable',  description: '蒙昧。学びの始まり・師弟関係' },
  5:  { number: 5,  name: '需',  nature: 'stable',  description: '待つ力。好機を待って行動する' },
  6:  { number: 6,  name: '訟',  nature: 'change',  description: '争い。調停と誠実さの必要性' },
  7:  { number: 7,  name: '師',  nature: 'stable',  description: '軍勢・組織力。統率と規律' },
  8:  { number: 8,  name: '比',  nature: 'stable',  description: '親しみ・協調。絆を深める' },
  9:  { number: 9,  name: '小畜', nature: 'change', description: '小さな蓄積。準備と自制' },
  10: { number: 10, name: '履',  nature: 'change',  description: '礼節・慎重な進み方' },
  11: { number: 11, name: '泰',  nature: 'stable',  description: '平和・調和。天地の交わり' },
  12: { number: 12, name: '否',  nature: 'stable',  description: '行き詰まり。退いて内省する' },
  13: { number: 13, name: '同人', nature: 'change', description: '共同・協力。仲間との連帯' },
  14: { number: 14, name: '大有', nature: 'change', description: '大いなる所有。豊かさと責任' },
  15: { number: 15, name: '謙',  nature: 'stable',  description: '謙虚。実力を隠して成就する' },
  16: { number: 16, name: '豫',  nature: 'change',  description: '喜び・準備。自然な熱意' },
  17: { number: 17, name: '随',  nature: 'change',  description: '従う・適応。状況への柔軟性' },
  18: { number: 18, name: '蠱',  nature: 'change',  description: '腐敗の修復。刷新と改革' },
  19: { number: 19, name: '臨',  nature: 'stable',  description: '近づく。監督と指導の時' },
  20: { number: 20, name: '観',  nature: 'stable',  description: '観察・洞察。本質を見抜く' },
  21: { number: 21, name: '噬嗑', nature: 'change', description: '決断・咬み合わせ。障害を除く' },
  22: { number: 22, name: '賁',  nature: 'change',  description: '飾り・美。形を整える' },
  23: { number: 23, name: '剥',  nature: 'stable',  description: '剥落・解体。老いたものの去り際' },
  24: { number: 24, name: '復',  nature: 'change',  description: '回帰・復活。新たなサイクルの始まり' },
  25: { number: 25, name: '無妄', nature: 'change', description: '純粋・自然。作為なき行動' },
  26: { number: 26, name: '大畜', nature: 'stable', description: '大きな蓄積。内面の充実' },
  27: { number: 27, name: '頤',  nature: 'stable',  description: '養育・栄養。養うものと養われるもの' },
  28: { number: 28, name: '大過', nature: 'change', description: '過剰・限界。重荷を担う' },
  29: { number: 29, name: '坎',  nature: 'stable',  description: '険しい水路。危険の中の流れ' },
  30: { number: 30, name: '離',  nature: 'change',  description: '炎・明晰さ。光と依存' },
  31: { number: 31, name: '咸',  nature: 'change',  description: '感応・引き寄せ。相互吸引' },
  32: { number: 32, name: '恒',  nature: 'stable',  description: '持続・恒久。変わらぬ本質' },
  33: { number: 33, name: '遯',  nature: 'stable',  description: '退く・遠ざかる。賢明な撤退' },
  34: { number: 34, name: '大壮', nature: 'change', description: '強大な力。力の正しい使い方' },
  35: { number: 35, name: '晋',  nature: 'change',  description: '前進・昇進。光の如く進む' },
  36: { number: 36, name: '明夷', nature: 'stable', description: '光の傷。内に光を秘める' },
  37: { number: 37, name: '家人', nature: 'stable', description: '家族・共同体。内なる秩序' },
  38: { number: 38, name: '睽',  nature: 'change',  description: '対立・相違。異なるものの調和' },
  39: { number: 39, name: '蹇',  nature: 'stable',  description: '障害・跛行。困難の意味を問う' },
  40: { number: 40, name: '解',  nature: 'change',  description: '解放・解消。緊張の弛緩' },
  41: { number: 41, name: '損',  nature: 'stable',  description: '減らす・簡素化。本質への集中' },
  42: { number: 42, name: '益',  nature: 'change',  description: '増やす・充実。与えることの豊かさ' },
  43: { number: 43, name: '夬',  nature: 'change',  description: '決断・打破。断固たる行動' },
  44: { number: 44, name: '姤',  nature: 'change',  description: '出会い・遭遇。意図せぬ接触' },
  45: { number: 45, name: '萃',  nature: 'stable',  description: '集まる・結集。共同の目的' },
  46: { number: 46, name: '升',  nature: 'change',  description: '上昇・成長。着実な前進' },
  47: { number: 47, name: '困',  nature: 'stable',  description: '困窮・閉塞。制約の中の真価' },
  48: { number: 48, name: '井',  nature: 'stable',  description: '井戸・源泉。尽きない本質' },
  49: { number: 49, name: '革',  nature: 'change',  description: '革命・変革。根本的な転換' },
  50: { number: 50, name: '鼎',  nature: 'stable',  description: '鼎・変容。新しいものを生み出す' },
  51: { number: 51, name: '震',  nature: 'change',  description: '雷・衝撃。覚醒と反省' },
  52: { number: 52, name: '艮',  nature: 'stable',  description: '山・静止。止まることの力' },
  53: { number: 53, name: '漸',  nature: 'stable',  description: '漸進・段階。着実な発展' },
  54: { number: 54, name: '帰妹', nature: 'change', description: '嫁ぐ・従属。立場を知る' },
  55: { number: 55, name: '豊',  nature: 'change',  description: '豊かさ・充実。絶頂の瞬間' },
  56: { number: 56, name: '旅',  nature: 'change',  description: '旅人・異邦。流動する存在' },
  57: { number: 57, name: '巽',  nature: 'change',  description: '風・浸透。柔らかな影響力' },
  58: { number: 58, name: '兌',  nature: 'change',  description: '喜び・悦楽。開かれた心' },
  59: { number: 59, name: '渙',  nature: 'change',  description: '散らす・解放。障壁を溶かす' },
  60: { number: 60, name: '節',  nature: 'stable',  description: '節制・制限。適切な境界線' },
  61: { number: 61, name: '中孚', nature: 'stable', description: '内なる真実。誠実な共鳴' },
  62: { number: 62, name: '小過', nature: 'change', description: '小さな過剰。細部への注意' },
  63: { number: 63, name: '既済', nature: 'stable', description: '完成・達成。完結後の注意' },
  64: { number: 64, name: '未済', nature: 'change', description: '未完成・過渡。次へ向かう力' },
}

/**
 * 三才法による卦番号の算出（Gene Keys ゲートなしの場合の伝統法）
 * 上卦・下卦をそれぞれ8卦（乾兌離震巽坎艮坤）に対応させて64卦番号を求める
 *
 * 8卦の基本:
 *   1=乾 2=兌 3=離 4=震 5=巽 6=坎 7=艮 8=坤
 *
 * 64卦番号マッピング（行=上卦 1-8、列=下卦 1-8）
 */
const HEXAGRAM_TABLE: number[][] = [
  // 下卦→  乾  兌  離  震  巽  坎  艮  坤
  /* 乾（上） */ [1,  43, 14, 34, 9,  5,  26, 11],
  /* 兌（上） */ [10, 58, 38, 54, 61, 60, 41, 19],
  /* 離（上） */ [13, 49, 30, 55, 37, 63, 22, 36],
  /* 震（上） */ [25, 17, 21, 51, 42, 3,  27, 24],
  /* 巽（上） */ [44, 28, 50, 32, 57, 48, 18, 46],
  /* 坎（上） */ [6,  47, 64, 40, 59, 29, 4,  7],
  /* 艮（上） */ [33, 31, 56, 62, 53, 39, 52, 15],
  /* 坤（上） */ [12, 45, 35, 16, 20, 8,  23, 2],
]

/**
 * 上卦・下卦番号（1〜8）から易経の卦番号（1〜64）を求める
 */
function getHexagramNumber(upperTrigram: number, lowerTrigram: number): number {
  const row = upperTrigram - 1
  const col = lowerTrigram - 1
  return HEXAGRAM_TABLE[row][col]
}

/**
 * 生年月日から三才法で上卦・下卦を算出する
 * 上卦: (year + month + day) % 8 → 0 の場合は 8
 * 下卦: (year + month + day + 1) % 8 → 0 の場合は 8（時干支の代わりに+1）
 */
function calcTrigramFromBirthDate(birthDate: string): { upper: number; lower: number } {
  const [y, m, d] = birthDate.split('-').map(Number)
  const sum = y + m + d
  const upper = sum % 8 || 8
  const lower = (sum + 1) % 8 || 8
  return { upper, lower }
}

/**
 * Gene Keys ゲート番号を易経の卦番号に変換する
 * Gene Keys の64ゲートと易経64卦は Rave I Ching 経由で1対1対応する。
 * Gene Keys ゲート番号 = 易経卦番号（Rave Mandala の並び順）
 *
 * 注意: ゲート番号と卦番号は直接一致するわけではなく、
 * King Wen sequence の番号付けと対応している。
 * MVP では Gene Keys のゲート番号をそのまま卦番号として使用する。
 */
function geneKeyGateToHexagram(gate: number): HexagramData {
  const data = HEXAGRAM_DATA[gate]
  if (data) return data
  // フォールバック（通常は発生しない）
  return {
    number: gate,
    name: `第${gate}卦`,
    nature: 'stable',
    description: '—',
  }
}

/**
 * 易経を計算する
 *
 * @param input.birthDate 生年月日（YYYY-MM-DD）
 * @param input.geneKeyGate Gene Keys の Life's Work ゲート番号（省略可）
 * @returns IchingResult
 */
export function calculateIching(input: { birthDate: string; geneKeyGate?: number }): IchingResult {
  let benKa: HexagramData

  if (input.geneKeyGate !== undefined && input.geneKeyGate >= 1 && input.geneKeyGate <= 64) {
    // Gene Keys ゲートを本命卦の番号として使用（MVP方式）
    benKa = geneKeyGateToHexagram(input.geneKeyGate)
  } else {
    // 伝統法: 生年月日から三才法で卦番号を算出
    const { upper, lower } = calcTrigramFromBirthDate(input.birthDate)
    const hexNum = getHexagramNumber(upper, lower)
    benKa = HEXAGRAM_DATA[hexNum] ?? {
      number: hexNum,
      name: `第${hexNum}卦`,
      nature: 'stable',
      description: '—',
    }
  }

  return {
    benKa,
    // MVP: 動爻は空配列。Phase C 以降で生年月日 + 出生時刻から算出する予定。
    activeLines: [],
  }
}
