// ========================================
// タロット大アルカナ データ & マッピングロジック
// ========================================

export interface TarotCard {
  number: number
  numeral: string
  name: string
  nameEn: string
  keyword: string
  meaning: string
}

export const MAJOR_ARCANA: TarotCard[] = [
  { number: 0,  numeral: '0',    name: '愚者',   nameEn: 'The Fool',           keyword: '自由・冒険',     meaning: '無限の可能性を秘めた旅立ちの時。既成概念にとらわれず、直感を信じて踏み出すとき。' },
  { number: 1,  numeral: 'I',    name: '魔術師', nameEn: 'The Magician',       keyword: '創造・意志',     meaning: '必要なものはすべて手の中にある。あなたの意志と才能が現実を動かす力となる。' },
  { number: 2,  numeral: 'II',   name: '女教皇', nameEn: 'The High Priestess', keyword: '直感・神秘',     meaning: '静かに内なる声に耳を澄ませて。答えは外ではなく、あなたの深い部分にすでにある。' },
  { number: 3,  numeral: 'III',  name: '女帝',   nameEn: 'The Empress',        keyword: '豊穣・育む',     meaning: 'あなたの存在そのものが、周囲を温め育てる力を持っている。豊かさは内側から溢れ出す。' },
  { number: 4,  numeral: 'IV',   name: '皇帝',   nameEn: 'The Emperor',        keyword: '統率・安定',     meaning: '確固たる意志と責任感で道を切り開く。地に足をつけた判断があなたの強さとなる。' },
  { number: 5,  numeral: 'V',    name: '教皇',   nameEn: 'The Hierophant',     keyword: '叡智・導き',     meaning: '知恵と経験を人と分かち合うとき。教え導くことで、あなた自身もまた成長する。' },
  { number: 6,  numeral: 'VI',   name: '恋人',   nameEn: 'The Lovers',         keyword: '選択・調和',     meaning: '心が本当に求めるものを選ぶ勇気を。真の調和は、自分に正直であることから生まれる。' },
  { number: 7,  numeral: 'VII',  name: '戦車',   nameEn: 'The Chariot',        keyword: '前進・勝利',     meaning: '意志の力で困難を乗り越える。迷わず進めば、道は自ずと開かれる。' },
  { number: 8,  numeral: 'VIII', name: '力',     nameEn: 'Strength',           keyword: '内なる力・忍耐', meaning: '真の強さは優しさの中にある。荒ぶる感情も、静かな愛で手懐けることができる。' },
  { number: 9,  numeral: 'IX',   name: '隠者',   nameEn: 'The Hermit',         keyword: '内省・探求',     meaning: '立ち止まることも、大切な一歩。孤独の中で見つけた光が、やがて他者をも照らす。' },
  { number: 10, numeral: 'X',    name: '運命の輪', nameEn: 'Wheel of Fortune', keyword: '転機・循環',     meaning: '巡りくる運命の転換点。変化を恐れず受け入れれば、新たなステージが始まる。' },
  { number: 11, numeral: 'XI',   name: '正義',   nameEn: 'Justice',            keyword: '公正・真実',     meaning: 'ありのままの真実と向き合うとき。バランスのとれた判断が、道を正しく導く。' },
  { number: 12, numeral: 'XII',  name: '吊るされた人', nameEn: 'The Hanged Man', keyword: '視点転換・手放し', meaning: '逆さまの世界から見える景色がある。手放すことで、思いがけない解放が訪れる。' },
  { number: 13, numeral: 'XIII', name: '死神',   nameEn: 'Death',              keyword: '終わりと始まり', meaning: '古い自分との決別のとき。終わりは恐れるものではなく、再生への扉。' },
  { number: 14, numeral: 'XIV',  name: '節制',   nameEn: 'Temperance',         keyword: '調和・統合',     meaning: '相反するものを混ぜ合わせ、新たな何かを生み出す錬金術。焦らず、丁寧に。' },
  { number: 15, numeral: 'XV',   name: '悪魔',   nameEn: 'The Devil',          keyword: '執着・解放',     meaning: '縛っているのは、実は自分自身かもしれない。気づいた瞬間、鎖は外れ始める。' },
  { number: 16, numeral: 'XVI',  name: '塔',     nameEn: 'The Tower',          keyword: '崩壊・覚醒',     meaning: '築き上げたものが崩れるとき、本当に大切なものが見える。それは再構築の始まり。' },
  { number: 17, numeral: 'XVII', name: '星',     nameEn: 'The Star',           keyword: '希望・インスピレーション', meaning: '嵐の後に輝く星のように。希望は静かに、しかし確実にあなたを照らしている。' },
  { number: 18, numeral: 'XVIII',name: '月',     nameEn: 'The Moon',           keyword: '幻想・潜在意識', meaning: '見えないものへの不安は自然なこと。月明かりの中でゆっくりと、真実が姿を現す。' },
  { number: 19, numeral: 'XIX',  name: '太陽',   nameEn: 'The Sun',            keyword: '成功・喜び',     meaning: '生命力に満ちた輝きの時。あなたの存在そのものが、周囲に温かさと喜びをもたらす。' },
  { number: 20, numeral: 'XX',   name: '審判',   nameEn: 'Judgement',          keyword: '復活・覚醒',     meaning: '魂の目覚めのとき。過去を受け入れ、新たな使命に応える準備ができている。' },
  { number: 21, numeral: 'XXI',  name: '世界',   nameEn: 'The World',          keyword: '完成・統合',     meaning: 'すべてが一つに繋がる完成の瞬間。あなたは今、一つの大きな物語を完結させようとしている。' },
]

// ========================================
// 5枚のスプレッド（配置）定義
// ========================================

export interface TarotSpreadPosition {
  position: string
  label: string
  description: string
}

export const SPREAD_POSITIONS: TarotSpreadPosition[] = [
  { position: 'core',     label: 'あなたの本質',  description: '生まれ持った魂の性質' },
  { position: 'current',  label: '今の流れ',      description: '今あなたに働いている力' },
  { position: 'guidance', label: '導き',           description: '星々からのメッセージ' },
]

// ========================================
// 占術結果 → タロットカード マッピング
// ========================================

export interface TarotSpreadCard {
  card: TarotCard
  position: TarotSpreadPosition
}

/**
 * ライフパスナンバーから大アルカナを決定（本質）
 */
function mapLifePathToArcana(lp: string): TarotCard {
  const n = parseInt(lp)
  if (n === 11) return MAJOR_ARCANA[11] // 正義
  if (n === 22) return MAJOR_ARCANA[0]  // 愚者（超越）
  if (n === 33) return MAJOR_ARCANA[21] // 世界
  return MAJOR_ARCANA[n % 22]
}

/**
 * マヤ暦の紋章から大アルカナを決定（内なる力）
 */
function mapGlyphToArcana(glyph: string): TarotCard {
  const glyphMap: Record<string, number> = {
    '赤い竜': 3,       // 女帝 - 母性・創造
    '白い風': 2,       // 女教皇 - 直感・精神
    '青い夜': 18,      // 月 - 夢・潜在意識
    '黄色い種': 1,     // 魔術師 - 可能性・開花
    '赤い蛇': 8,       // 力 - 本能・生命力
    '白い世界の橋渡し': 13, // 死神 - 変容・橋渡し
    '青い手': 14,      // 節制 - 癒し・調和
    '黄色い星': 17,    // 星 - 美・芸術
    '赤い月': 18,      // 月 - 浄化・感情
    '白い犬': 6,       // 恋人 - 愛・忠誠
    '青い猿': 0,       // 愚者 - 遊び・自由
    '黄色い人': 9,     // 隠者 - 自由意志・知恵
    '赤い空歩く人': 20, // 審判 - 使命・覚醒
    '白い魔法使い': 1, // 魔術師 - 魔法・永遠
    '青い鷲': 15,      // 悪魔（逆説的洞察）
    '黄色い戦士': 7,   // 戦車 - 挑戦・前進
    '赤い地球': 21,    // 世界 - つながり・統合
    '白い鏡': 11,      // 正義 - 映す・秩序
    '青い嵐': 16,      // 塔 - 変革・エネルギー
    '黄色い太陽': 19,  // 太陽 - 生命・普遍
  }
  const idx = glyphMap[glyph]
  return MAJOR_ARCANA[idx !== undefined ? idx : 17]
}

/**
 * 算命学の中心星から大アルカナを決定（行動）
 */
function mapMainStarToArcana(weapon: string): TarotCard {
  const starMap: Record<string, number> = {
    '貫索星': 9,   // 隠者 - 独立・自分の道
    '石門星': 5,   // 教皇 - 社交・協調
    '鳳閣星': 19,  // 太陽 - 楽観・表現
    '調舒星': 18,  // 月 - 感性・繊細
    '禄存星': 3,   // 女帝 - 引力・魅力
    '司禄星': 4,   // 皇帝 - 堅実・蓄積
    '車騎星': 7,   // 戦車 - 行動・突進
    '牽牛星': 11,  // 正義 - 名誉・責任
    '龍高星': 0,   // 愚者 - 冒険・知的好奇心
    '玉堂星': 2,   // 女教皇 - 学び・母性的知性
  }
  const idx = starMap[weapon]
  return MAJOR_ARCANA[idx !== undefined ? idx : 10]
}

/**
 * 西洋占星術の星座から大アルカナを決定（課題）
 */
function mapSignToArcana(sign: string): TarotCard {
  const signMap: Record<string, number> = {
    '牡羊座': 4,    // 皇帝
    '牡牛座': 5,    // 教皇
    '双子座': 6,    // 恋人
    '蟹座': 7,      // 戦車
    '獅子座': 8,    // 力
    '乙女座': 9,    // 隠者
    '天秤座': 11,   // 正義
    '蠍座': 13,     // 死神
    '射手座': 14,   // 節制
    '山羊座': 15,   // 悪魔
    '水瓶座': 17,   // 星
    '魚座': 18,     // 月
  }
  const idx = signMap[sign]
  return MAJOR_ARCANA[idx !== undefined ? idx : 10]
}

/**
 * KIN番号から大アルカナを決定（導き）
 */
function mapKinToArcana(kin: number): TarotCard {
  return MAJOR_ARCANA[kin % 22]
}

/**
 * 占術結果から3枚のタロットスプレッドを生成
 * 本質 / 今の流れ / 導き の3枚構成
 */
export function generateTarotSpread(data: {
  maya: { kin: number; glyph: string }
  numerology: { lp: string }
  bazi: { weapon: string }
}): TarotSpreadCard[] {
  const cards: TarotCard[] = [
    mapLifePathToArcana(data.numerology.lp),   // 本質: 数秘術
    mapGlyphToArcana(data.maya.glyph),          // 今の流れ: マヤ暦
    mapMainStarToArcana(data.bazi.weapon),      // 導き: 算命学
  ]

  // 重複排除
  const usedNumbers = new Set<number>()
  for (let i = 0; i < cards.length; i++) {
    if (usedNumbers.has(cards[i].number)) {
      let next = (cards[i].number + 1) % 22
      while (usedNumbers.has(next)) next = (next + 1) % 22
      cards[i] = MAJOR_ARCANA[next]
    }
    usedNumbers.add(cards[i].number)
  }

  return cards.map((card, i) => ({
    card,
    position: SPREAD_POSITIONS[i],
  }))
}
