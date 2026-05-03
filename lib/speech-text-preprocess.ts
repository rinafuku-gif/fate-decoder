// Web Speech API の読み誤り対策。
// クライアント・サーバ両方で使えるピュア関数。

// 占術・専門用語の読み辞書（漢字 → ひらがな）
// 並び順は重要: 長いキーを先に置換しないと部分一致で壊れる
const TERM_DICT: Array<[string, string]> = [
  ['宿曜占星術', 'すくようせんせいじゅつ'],
  ['西洋占星術', 'せいようせんせいじゅつ'],
  ['四柱推命', 'しちゅうすいめい'],
  ['数秘術', 'すうひじゅつ'],
  ['算命学', 'さんめいがく'],
  ['宿曜', 'すくよう'],
  ['占星術', 'せんせいじゅつ'],
  ['マヤ暦', 'まやれき'],
  ['中心星', 'ちゅうしんぼし'],
  ['日柱', 'にっちゅう'],
  ['月柱', 'げっちゅう'],
  ['年柱', 'ねんちゅう'],
  ['天干', 'てんかん'],
  ['地支', 'ちし'],
  ['日干', 'にっかん'],
  ['月相', 'げっそう'],
  ['逆行', 'ぎゃっこう'],
  ['天体', 'てんたい'],
  ['星座', 'せいざ'],
]

// ローマ字（ヘボン式・訓令式混在対応）→ カタカナ
// 長いパターンを先にマッチさせる
const ROMAJI_PAIRS: Array<[RegExp, string]> = [
  // 拗音 3文字
  [/kya/g, 'キャ'], [/kyu/g, 'キュ'], [/kyo/g, 'キョ'],
  [/sha/g, 'シャ'], [/shu/g, 'シュ'], [/sho/g, 'ショ'],
  [/cha/g, 'チャ'], [/chu/g, 'チュ'], [/cho/g, 'チョ'],
  [/nya/g, 'ニャ'], [/nyu/g, 'ニュ'], [/nyo/g, 'ニョ'],
  [/hya/g, 'ヒャ'], [/hyu/g, 'ヒュ'], [/hyo/g, 'ヒョ'],
  [/mya/g, 'ミャ'], [/myu/g, 'ミュ'], [/myo/g, 'ミョ'],
  [/rya/g, 'リャ'], [/ryu/g, 'リュ'], [/ryo/g, 'リョ'],
  [/gya/g, 'ギャ'], [/gyu/g, 'ギュ'], [/gyo/g, 'ギョ'],
  [/bya/g, 'ビャ'], [/byu/g, 'ビュ'], [/byo/g, 'ビョ'],
  [/pya/g, 'ピャ'], [/pyu/g, 'ピュ'], [/pyo/g, 'ピョ'],
  [/jya/g, 'ジャ'], [/jyu/g, 'ジュ'], [/jyo/g, 'ジョ'],
  // 2文字（特殊）
  [/shi/g, 'シ'], [/chi/g, 'チ'], [/tsu/g, 'ツ'], [/fu/g, 'フ'], [/ji/g, 'ジ'],
  [/ja/g, 'ジャ'], [/ju/g, 'ジュ'], [/jo/g, 'ジョ'],
  // か行
  [/ka/g, 'カ'], [/ki/g, 'キ'], [/ku/g, 'ク'], [/ke/g, 'ケ'], [/ko/g, 'コ'],
  // さ行
  [/sa/g, 'サ'], [/su/g, 'ス'], [/se/g, 'セ'], [/so/g, 'ソ'],
  // た行
  [/ta/g, 'タ'], [/te/g, 'テ'], [/to/g, 'ト'],
  // な行
  [/na/g, 'ナ'], [/ni/g, 'ニ'], [/nu/g, 'ヌ'], [/ne/g, 'ネ'], [/no/g, 'ノ'],
  // は行
  [/ha/g, 'ハ'], [/hi/g, 'ヒ'], [/he/g, 'ヘ'], [/ho/g, 'ホ'],
  // ま行
  [/ma/g, 'マ'], [/mi/g, 'ミ'], [/mu/g, 'ム'], [/me/g, 'メ'], [/mo/g, 'モ'],
  // や行
  [/ya/g, 'ヤ'], [/yu/g, 'ユ'], [/yo/g, 'ヨ'],
  // ら行
  [/ra/g, 'ラ'], [/ri/g, 'リ'], [/ru/g, 'ル'], [/re/g, 'レ'], [/ro/g, 'ロ'],
  // わ行
  [/wa/g, 'ワ'], [/wo/g, 'ヲ'],
  // 濁音
  [/ga/g, 'ガ'], [/gi/g, 'ギ'], [/gu/g, 'グ'], [/ge/g, 'ゲ'], [/go/g, 'ゴ'],
  [/za/g, 'ザ'], [/zu/g, 'ズ'], [/ze/g, 'ゼ'], [/zo/g, 'ゾ'],
  [/da/g, 'ダ'], [/di/g, 'ディ'], [/du/g, 'デュ'], [/de/g, 'デ'], [/do/g, 'ド'],
  [/ba/g, 'バ'], [/bi/g, 'ビ'], [/bu/g, 'ブ'], [/be/g, 'ベ'], [/bo/g, 'ボ'],
  [/pa/g, 'パ'], [/pi/g, 'ピ'], [/pu/g, 'プ'], [/pe/g, 'ペ'], [/po/g, 'ポ'],
  // 単独母音
  [/a/g, 'ア'], [/i/g, 'イ'], [/u/g, 'ウ'], [/e/g, 'エ'], [/o/g, 'オ'],
  // 撥音
  [/n/g, 'ン'],
  // 促音（前文字との組み合わせは雑だが残った t/k/s/p をッに）
  [/[tkspc]/g, 'ッ'],
]

function isLikelyEnglishWord(word: string): boolean {
  // よく出る英単語は変換しない
  const ENGLISH_WHITELIST = new Set([
    'a', 'i', 'an', 'the', 'is', 'are', 'and', 'or', 'of', 'in', 'on', 'to', 'for', 'with', 'by',
    'kin', 'ws', 'ai',
  ])
  return ENGLISH_WHITELIST.has(word.toLowerCase())
}

function romajiToKatakana(romaji: string): string {
  if (!romaji) return ''
  let result = romaji.toLowerCase()
  for (const [pat, kata] of ROMAJI_PAIRS) {
    result = result.replace(pat, kata)
  }
  return result
}

export function preprocessForSpeech(text: string): string {
  if (!text) return ''
  let result = text
  // 1. 専門用語を辞書置換
  for (const [k, v] of TERM_DICT) {
    if (result.includes(k)) {
      result = result.split(k).join(v)
    }
  }
  // 2. 英字の連続をカタカナ化（人名対策）
  //    変換後に英字が残るなら英単語と判断して原文を返す
  result = result.replace(/[A-Za-z]+/g, (match) => {
    if (isLikelyEnglishWord(match)) return match
    if (match.length < 2) return match
    const converted = romajiToKatakana(match)
    if (/[A-Za-z]/.test(converted)) return match
    return converted
  })
  return result
}
