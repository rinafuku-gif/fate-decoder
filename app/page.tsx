'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { generateStory } from './actions'
import { fetchStoryFromNotion } from './notion-actions'
import { calculateAll, calculateCompatibility, type CompatibilityScore, type CompatibilityType, type FortuneResult } from '../lib/fortune-calc'
import { generateTarotSpread, type TarotSpreadCard } from '../lib/tarot-data'


// ========================================
// 2. React UI - モダン・ミニマルデザイン
// ========================================

export type ReadingMode = 'full' | 'tarot' | 'short' | 'compatibility'

const MODE_CONFIG: Record<ReadingMode, { label: string; subtitle: string; description: string; available: boolean }> = {
  full: {
    label: 'Full Reading',
    subtitle: '6占術 + AI物語',
    description: 'マヤ暦・算命学・数秘術・西洋占星術・宿曜・四柱推命の6つの占術で、あなただけの詳細レポートをAIが執筆します。',
    available: true,
  },
  tarot: {
    label: 'Tarot Reading',
    subtitle: 'タロット演出 + メッセージ',
    description: '6占術の結果をタロットカードの演出とともにお届け。直感的に響くメッセージで、あなたの今を映し出します。',
    available: true,
  },
  short: {
    label: 'Short Reading',
    subtitle: 'サクッと診断',
    description: '3分でわかる、あなたの本質。6占術の核心だけをコンパクトにまとめた要約版リーディング。',
    available: true,
  },
  compatibility: {
    label: 'Compatibility',
    subtitle: 'ふたりの相性診断',
    description: '2人の生年月日から6占術で相性を総合診断。恋愛・ビジネス・総合の3タイプから選べます。',
    available: true,
  },
}

const COMPAT_TYPE_CONFIG: Record<CompatibilityType, { label: string; icon: string; description: string }> = {
  love: { label: '恋愛・パートナー', icon: '\u2661', description: '恋愛やパートナーシップにおける相性を深く読み解きます' },
  business: { label: 'ビジネスパートナー', icon: '\u2726', description: '仕事や共同プロジェクトでの相性・役割分担を診断します' },
  general: { label: '総合相性', icon: '\u2606', description: '恋愛・仕事・友情の3軸で総合的に相性を診断します' },
}

export default function FateDecoder() {
  const [screen, setScreen] = useState<'mode-select' | 'input' | 'loading' | 'result' | 'tarot-result' | 'short-result' | 'compat-type-select' | 'compat-input' | 'compat-result'>('mode-select')
  const [readingMode, setReadingMode] = useState<ReadingMode>('full')
  const [tarotSpread, setTarotSpread] = useState<TarotSpreadCard[]>([])
  const [tarotMessages, setTarotMessages] = useState<string[]>([])
  const [flippedCards, setFlippedCards] = useState<boolean[]>([])
  const [allRevealed, setAllRevealed] = useState(false)
  const [tarotUserName, setTarotUserName] = useState('')
  const [shortResult, setShortResult] = useState<{
    data: any; name: string; oneWord: string;
    personality: string; relationships: string; talent: string;
    action: string; luckyItem: string;
  } | null>(null)
  const [compatType, setCompatType] = useState<CompatibilityType>('love')
  const [compatResult, setCompatResult] = useState<{
    name1: string; name2: string; data1: FortuneResult; data2: FortuneResult;
    score: CompatibilityScore; type: CompatibilityType;
    story: { attraction: string; caution: string; advice: string; loveStory?: string; businessStory?: string; friendStory?: string }
  } | null>(null)
  const [person2, setPerson2] = useState({ name: '', year: '', month: '1', day: '1' })
  const [formData, setFormData] = useState({
    name: '', year: '', month: '1', day: '1',
    birthHour: '', birthMinute: '',
    bloodType: 'A', birthPlace: '', concern: ''
  })
  const [consentChecked, setConsentChecked] = useState(false)
  const [resultHtml, setResultHtml] = useState('')
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)
  const [isProcessingInBackground, setIsProcessingInBackground] = useState(false)
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      const ua = navigator.userAgent
      setIsInAppBrowser(/Line|FBAV|FBAN|Instagram|Twitter|Snapchat|WeChat|WhatsApp|Telegram/i.test(ua))
    }
  }, [])

  // 占術データからNotion保存用の共通フィールドを生成
  const buildFortuneFields = (data: FortuneResult) => {
    const toneNumber = parseInt(data.maya.tone.match(/\((\d+)\)/)?.[1] || '0')
    return {
      kin: data.maya.kin, glyph: data.maya.glyph, tone: toneNumber,
      ws: data.maya.ws, stem: data.bazi.stem, weapon: data.bazi.weapon,
      lp: data.numerology.lp, sign: data.western.sign, sukuyo: data.sukuyo
    }
  }

  const saveToNotion = (payload: Record<string, any>) => {
    fetch('/api/notion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(res => res.json()).then(result => {
      if (!result.success) console.error('[Notion Save Failed]', result.error)
    }).catch(err => console.error('[Notion Save Error]', err))
  }

  useEffect(() => {
    const loadFromURL = async () => {
      const params = new URLSearchParams(window.location.search)
      const notionId = params.get('notionId')
      if (notionId) {
        setScreen('loading')
        try {
          const result = await fetchStoryFromNotion(notionId)
          if (result.success && result.story) {
            let story = result.story
            if (!story || typeof story !== 'object') story = {}
            if (!story.prologue || typeof story.prologue !== 'object') {
              story.prologue = { tag: '#はじめに', title: 'あなたの物語', text: 'あなたの性格と運命の物語が始まります。' }
            }
            if (!Array.isArray(story.chapters)) story.chapters = []
            if (!story.final || typeof story.final !== 'object') {
              story.final = { tag: '#まとめ', title: 'これからのあなたへ', text: 'あなたの可能性は、あなた自身の選択で広がっていきます。', magic: '自分を信じて一歩踏み出す' }
            }
            const name = params.get('name') || '診断結果'
            const year = params.get('year') || '1990'
            const month = params.get('month') || '1'
            const day = params.get('day') || '1'
            const data = calculateAll(parseInt(year), parseInt(month), parseInt(day))
            const concern = params.get('concern') || ''
            setResultHtml(renderNovel(name, data, story, decodeURIComponent(concern)))
            setScreen('result')
          } else {
            throw new Error('Failed to load')
          }
        } catch {
          alert('過去の診断データを読み込めませんでした。\n\nもう一度診断をお試しください。')
          setScreen('input')
        }
        return
      }
      if (typeof navigator !== 'undefined' && /Line|FBAV|FBAN|Instagram|Twitter|Snapchat|WeChat|WhatsApp|Telegram/i.test(navigator.userAgent)) return
      const name = params.get('name')
      const year = params.get('year')
      const month = params.get('month')
      const day = params.get('day')
      if (name && year && month && day) {
        setReadingMode('full')
        setFormData({
          name: decodeURIComponent(name), year, month, day,
          birthHour: params.get('birthHour') || '',
          birthMinute: params.get('birthMinute') || '',
          bloodType: params.get('bloodType') || 'A',
          birthPlace: decodeURIComponent(params.get('birthPlace') || ''),
          concern: decodeURIComponent(params.get('concern') || '')
        })
        setConsentChecked(true)
        setTimeout(() => {
          const form = document.querySelector('form')
          if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
        }, 500)
      }
    }
    loadFromURL()
  }, [])

  const handleTarotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!formData.name || !formData.year || !formData.month || !formData.day) {
      alert('お名前と生年月日を入力してください。')
      return
    }
    if (!consentChecked) {
      alert('診断結果の保存にご同意ください。')
      return
    }
    setIsSubmitting(true)
    setScreen('loading')

    try {
      const data = calculateAll(parseInt(formData.year), parseInt(formData.month), parseInt(formData.day))
      const spread = generateTarotSpread(data)
      setTarotSpread(spread)
      setTarotUserName(formData.name)
      setFlippedCards(new Array(spread.length).fill(false))
      setAllRevealed(false)

      // AI にタロット風メッセージを生成してもらう
      const tarotPrompt = `
あなたは20年の経験を持つ、鑑定実績1万人超の本物のタロットリーダーです。
6つの占術データから導かれた3枚のカードについて、クライアントが「なぜ私のことがわかるんですか？」と思わず涙ぐむような、深い洞察と具体性のあるリーディングメッセージを書いてください。

【対象者】
${formData.name} (${formData.year}年${formData.month}月${formData.day}日生まれ)

【占術データ（リーディングの根拠として活用すること）】
・マヤ暦: KIN${data.maya.kin} / 太陽の紋章:${data.maya.glyph} / 銀河の音:${data.maya.tone} / ウェイブスペル:${data.maya.ws}
・算命学: 中心星[${data.bazi.weapon}]
・四柱推命: 年柱[${data.sanmeigaku.year}] / 月柱[${data.sanmeigaku.month}] / 日柱[${data.sanmeigaku.day}] / 日干[${data.bazi.stem}]
・数秘術: ライフパスナンバー[${data.numerology.lp}]
・西洋占星術: ${data.western.sign}
・宿曜: ${data.sukuyo}

【相談内容】
「${formData.concern || '特になし'}」

【選ばれた3枚のカードと配置】
${spread.map((s, i) => `${i + 1}. 【${s.position.label}】（${s.position.description}）→ ${s.card.numeral} ${s.card.name}（${s.card.nameEn}）- キーワード: ${s.card.keyword}`).join('\n')}

【スプレッドの読み方】
- 1枚目「あなたの本質」: この人が生まれ持った魂の性質。数秘術のライフパスナンバーから導かれている
- 2枚目「今の流れ」: 今この瞬間にこの人に働いている宇宙のエネルギー。マヤ暦の太陽の紋章から導かれている
- 3枚目「導き」: 星々がこの人に伝えたいメッセージ。算命学の中心星から導かれている
- 3枚は独立した断片ではなく、1つの物語として繋がるように読む

【執筆ルール — 最重要】
1. 各メッセージは400〜500文字。3枚しかないので1枚あたりを濃く、深く書く
2. 以下の3段構成で書く:
   - 第1段: カードが「なぜあなたに現れたか」を占術データの具体的な要素と結びつけて説明する。例:「ライフパス7を持つあなたは本質的に真理を探究する魂。周囲に合わせるよりも自分なりの答えを見つけたい——だからこそ隠者のカードがあなたの本質として現れました」
   - 第2段: そこから読み取れる、その人の「あるある」な具体的行動パターンや感覚を2〜3個描写する。例:「周囲が盛り上がっている場でも、ふと一人になりたくなる瞬間がありませんか？　本を読んだり何かを調べているとき、気づけば2〜3時間が溶けていた——そんな経験はないでしょうか」
   - 第3段: 今のこの人に向けた温かく具体的なメッセージ。相談内容があればそれに対するカードからの応答を含める
3. 占術の専門用語は自然な文脈で噛み砕いて1〜2個使う（例:「マヤ暦でいう"赤い竜"の紋章を持つあなたは、母性的な創造力を宿しています」）
4. 相談内容があれば、3枚すべてのメッセージがその悩みの異なる側面に光を当てる
5. 「〜ではないでしょうか」「〜という感覚、覚えがありませんか？」など問いかけを各カードに最低1つ入れる
6. 占い本の汎用的な表現を避け、この人のデータの組み合わせだからこそ言えることを書く
7. 3枚目「導き」は、1枚目と2枚目の内容を受けて、具体的なアドバイスや行動のヒントで締める
8. **必ず純粋なJSON形式で出力**（Markdownのバッククォートは不要）

【出力フォーマット】
{ "messages": ["1枚目のメッセージ", "2枚目のメッセージ", "3枚目のメッセージ"] }
`

      let messages: string[] = []
      try {
        const resultText = await generateStory(tarotPrompt)
        let cleanJson = resultText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
        cleanJson = cleanJson.replace(/^\uFEFF/, '').replace(/^[\s\uFEFF\xA0]+/, '')
        const firstBrace = cleanJson.indexOf('{')
        if (firstBrace !== -1) cleanJson = cleanJson.substring(firstBrace)
        const lastBrace = cleanJson.lastIndexOf('}')
        if (lastBrace !== -1) cleanJson = cleanJson.substring(0, lastBrace + 1)
        const parsed = JSON.parse(cleanJson)
        messages = parsed.messages || []
      } catch {
        // AI失敗時はカードのデフォルトメッセージを使用
        messages = spread.map(s => s.card.meaning)
      }
      const finalMessages = messages.length === spread.length ? messages : spread.map(s => s.card.meaning)
      setTarotMessages(finalMessages)
      setScreen('tarot-result')
      setIsSubmitting(false)
      setTimeout(() => window.scrollTo(0, 0), 100)

      // Notion保存
      const birthDate = `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`
      saveToNotion({
        mode: 'tarot', name: formData.name, birthDate,
        ...buildFortuneFields(data),
        tarotData: {
          cards: spread.map((s, i) => ({
            position: s.position.label,
            name: `${s.card.numeral} ${s.card.name}`,
            keyword: s.card.keyword,
            message: finalMessages[i] || s.card.meaning
          }))
        }
      })

    } catch {
      alert('診断中にエラーが発生しました。もう一度お試しください。')
      setScreen('input')
      setIsSubmitting(false)
    }
  }

  const handleShortSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!formData.name || !formData.year || !formData.month || !formData.day) {
      alert('お名前と生年月日を入力してください。')
      return
    }
    if (!consentChecked) {
      alert('診断結果の保存にご同意ください。')
      return
    }
    setIsSubmitting(true)
    setScreen('loading')

    try {
      const data = calculateAll(parseInt(formData.year), parseInt(formData.month), parseInt(formData.day))

      const shortPrompt = `
あなたは鑑定実績1万人超のプロの占い師です。
6つの占術データから、この人の核心を3つの視点で鋭く、しかし温かく伝えてください。
しいたけ占いのような親しみやすい文体で「あるある」な具体例を入れてください。

【対象者】
${formData.name} (${formData.year}年${formData.month}月${formData.day}日生まれ)

【占術データ】
・マヤ暦: KIN${data.maya.kin} / 太陽の紋章:${data.maya.glyph} / 銀河の音:${data.maya.tone} / ウェイブスペル:${data.maya.ws}
・算命学: 中心星[${data.bazi.weapon}]
・四柱推命: 年柱[${data.sanmeigaku.year}] / 月柱[${data.sanmeigaku.month}] / 日柱[${data.sanmeigaku.day}] / 日干[${data.bazi.stem}]
・数秘術: ライフパスナンバー[${data.numerology.lp}]
・西洋占星術: ${data.western.sign}
・宿曜: ${data.sukuyo}

【相談内容】
「${formData.concern || '特になし'}」

【執筆ルール】
1. personality（性格の核心）: 200〜300文字。占術データを2つ以上引用し、この人の「本質的な性格」を描写。具体的な行動パターンを1〜2個入れる（例:「気づけば一人で考え込んでいた、なんてことはありませんか？」）
2. relationships（人間関係）: 200〜300文字。恋愛・友人関係での特徴やパターン。「あるある」な場面描写を入れる
3. talent（才能・仕事）: 200〜300文字。この人が輝ける分野と、その理由。相談内容があればここで回答を含める
4. oneWord: あなたを一言で表す言葉。8〜15文字で印象的に（例:「静かな炎を宿す旅人」「愛で世界を照らす太陽」）
5. action: 今日からできる具体的な行動。20〜40文字で（例:「朝5分だけ、窓を開けて空を見上げてみてください」）
6. luckyItem: ラッキーアイテム。具体的に（例:「深い青色のペン」「レモンの香りのハンドクリーム」）
7. 各セクションに「〜ではないでしょうか」「〜という感覚、ありませんか？」のような問いかけを最低1つ
8. **必ず純粋なJSON形式で出力**（Markdownバッククォート不要）

【出力フォーマット】
{
  "oneWord": "一言キーワード",
  "personality": "性格の核心テキスト",
  "relationships": "人間関係テキスト",
  "talent": "才能・仕事テキスト",
  "action": "具体的なアクション",
  "luckyItem": "ラッキーアイテム"
}
`

      let personality = ''
      let relationships = ''
      let talent = ''
      let action = '朝5分だけ、窓を開けて深呼吸してみてください'
      let oneWord = '静かな光を宿す探求者'
      let luckyItem = '温かいハーブティー'
      try {
        const resultText = await generateStory(shortPrompt)
        let cleanJson = resultText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
        cleanJson = cleanJson.replace(/^\uFEFF/, '').replace(/^[\s\uFEFF\xA0]+/, '')
        const firstBrace = cleanJson.indexOf('{')
        if (firstBrace !== -1) cleanJson = cleanJson.substring(firstBrace)
        const lastBrace = cleanJson.lastIndexOf('}')
        if (lastBrace !== -1) cleanJson = cleanJson.substring(0, lastBrace + 1)
        const parsed = JSON.parse(cleanJson)
        personality = parsed.personality || ''
        relationships = parsed.relationships || ''
        talent = parsed.talent || ''
        action = parsed.action || action
        oneWord = parsed.oneWord || oneWord
        luckyItem = parsed.luckyItem || luckyItem
      } catch {
        personality = `マヤ暦で「${data.maya.glyph}」の紋章を持つあなたは、表面的には穏やかでも内面に強い意志を宿しています。ライフパスナンバー${data.numerology.lp}が示すように、自分なりの答えを見つけたいという欲求が常にあるのではないでしょうか。周囲が盛り上がっている場でも、ふと一歩引いて全体を観察してしまう——そんな瞬間に覚えはありませんか？`
        relationships = `${data.western.sign}のあなたは、人間関係において深い絆を求める傾向があります。広く浅い付き合いよりも、本音で語り合える少数の関係を大切にするタイプ。信頼した相手にはとことん尽くす一方で、表面的な社交にはどこか疲れを感じることもあるのではないでしょうか。`
        talent = `算命学の「${data.bazi.weapon}」を持つあなたには、物事の本質を見抜く鋭さがあります。四柱推命の日柱「${data.sanmeigaku.day}」と${data.sukuyo}の影響もあり、既存のやり方にとらわれず新しい道を切り開く力を秘めています。あなたが最も輝くのは、自分の感性を信じて行動できる環境です。`
      }

      setShortResult({ data, name: formData.name, oneWord, personality, relationships, talent, action, luckyItem })
      setScreen('short-result')
      setIsSubmitting(false)
      setTimeout(() => window.scrollTo(0, 0), 100)

      // Notion保存
      const birthDate = `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`
      saveToNotion({
        mode: 'short', name: formData.name, birthDate,
        ...buildFortuneFields(data),
        shortData: { oneWord, personality, relationships, talent, action, luckyItem }
      })

    } catch {
      alert('診断中にエラーが発生しました。もう一度お試しください。')
      setScreen('input')
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (readingMode === 'tarot') {
      return handleTarotSubmit(e)
    }
    if (readingMode === 'short') {
      return handleShortSubmit(e)
    }
    if (isSubmitting) return
    if (!formData.name || !formData.year || !formData.month || !formData.day) {
      alert('お名前と生年月日を入力してください。')
      return
    }
    if (!consentChecked) {
      alert('診断結果の保存にご同意ください。')
      return
    }
    setIsSubmitting(true)
    setScreen('loading')
    let timedOut = false
    const timeoutId = setTimeout(() => {
      timedOut = true
      setIsProcessingInBackground(true)
      setScreen('input')
      alert('AIが文章を作成中です。\n\n完了したら自動的に結果が表示されます。しばらくお待ちください。')
    }, 60000)

    try {
      const data = calculateAll(parseInt(formData.year), parseInt(formData.month), parseInt(formData.day))

      const prompt = `
あなたは、複数の占術データを読み解いて「その人だけの性格分析レポート」を小説形式で書くライターです。
しいたけ占いのような親しみやすく温かい文体で、読者に深く寄り添うトーンで書いてください。

【対象者】
名前: ${formData.name} (${formData.year}年${formData.month}月${formData.day}日生まれ / ${formData.bloodType}型 / ${formData.birthPlace || '未入力'}出身)

【分析データ】
・マヤ暦: KIN${data.maya.kin} / 太陽の紋章:${data.maya.glyph} / 銀河の音:${data.maya.tone} / ウェイブスペル:${data.maya.ws}
・算命学: 中心星[${data.bazi.weapon}]
・四柱推命: 年柱[${data.sanmeigaku.year}] / 月柱[${data.sanmeigaku.month}] / 日柱[${data.sanmeigaku.day}] / 日干[${data.bazi.stem}]
・数秘術: ライフパスナンバー[${data.numerology.lp}]
・西洋占星術: ${data.western.sign}
・宿曜: ${data.sukuyo}

【相談内容】
「${formData.concern || '特になし'}」

【執筆ルール】
1. 専門用語は必ず噛み砕いて説明してください。例：「KIN93」→「KIN93（あなたの誕生日に対応するマヤ暦の番号で、魂の特性を表します）」
2. 「〜という感覚はありませんか？」のような共感・問いかけスタイルを使ってください。
3. 各章は800文字以上。全体で6000文字以上書いてください。
4. 相談内容に合わせて3〜7章を柔軟に構成してください。
5. 抽象的な表現を避け、具体的なシーンや行動例を入れてください。
6. **必ず純粋なJSON形式** で出力してください（Markdownのバッククォートは不要）。

【出力フォーマット】
{
  "prologue": {
    "tag": "#はじめに",
    "title": "序章：（相談内容に合ったタイトル）",
    "text": "悩みに対する深い共感。なぜ今その悩みを持つに至ったかの分析。800文字以上。"
  },
  "chapters": [
    {
      "tag": "#占術名 #キーワード",
      "title": "第1章：（テーマ）",
      "text": "データを使った性格分析。800文字以上。"
    }
  ],
  "final": {
    "tag": "#まとめ",
    "title": "最終章：これからのあなたへ",
    "text": "悩みへの具体的なアドバイス。800文字以上。",
    "magic": "運気を変える具体的なアクション（例：赤い靴下を履く）"
  }
}
`
      const resultText = await generateStory(prompt)
      let cleanJson = resultText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
      cleanJson = cleanJson.replace(/^\uFEFF/, '').replace(/^[\s\uFEFF\xA0]+/, '')
      const jsonStart = cleanJson.search(/^[\{\[]/)
      if (jsonStart === -1) {
        const firstBrace = cleanJson.indexOf('{')
        if (firstBrace !== -1) cleanJson = cleanJson.substring(firstBrace)
      }
      const lastBrace = cleanJson.lastIndexOf('}')
      const lastBracket = cleanJson.lastIndexOf(']')
      const jsonEnd = Math.max(lastBrace, lastBracket)
      if (jsonEnd !== -1) cleanJson = cleanJson.substring(0, jsonEnd + 1)

      let story
      try {
        story = JSON.parse(cleanJson)
      } catch {
        let repairedJson = cleanJson
        const quoteCount = (repairedJson.match(/"/g) || []).length
        if (quoteCount % 2 !== 0) repairedJson += '"'
        let braceCount = (repairedJson.match(/{/g) || []).length - (repairedJson.match(/}/g) || []).length
        let bracketCount = (repairedJson.match(/\[/g) || []).length - (repairedJson.match(/]/g) || []).length
        for (let i = 0; i < braceCount; i++) repairedJson += '}'
        for (let i = 0; i < bracketCount; i++) repairedJson += ']'
        repairedJson = repairedJson.replace(/,(\s*[\]}])/g, '$1')
        try {
          story = JSON.parse(repairedJson)
        } catch {
          throw new Error('AIの出力を解析できませんでした。')
        }
      }

      if (!story || typeof story !== 'object') story = {}
      if (!story.prologue) story.prologue = { tag: '#はじめに', title: 'あなたの物語', text: 'あなたの性格と運命の物語が始まります。' }
      if (!Array.isArray(story.chapters)) story.chapters = []
      if (!story.final) story.final = { tag: '#まとめ', title: 'これからのあなたへ', text: 'あなたの可能性は、あなた自身の選択で広がっていきます。', magic: '自分を信じて一歩踏み出す' }

      setResultHtml(renderNovel(formData.name, data, story, formData.concern))

      const params = new URLSearchParams()
      params.set('name', encodeURIComponent(formData.name))
      params.set('year', formData.year)
      params.set('month', formData.month)
      params.set('day', formData.day)
      if (formData.birthHour) params.set('birthHour', formData.birthHour)
      if (formData.birthMinute) params.set('birthMinute', formData.birthMinute)
      params.set('bloodType', formData.bloodType)
      if (formData.birthPlace) params.set('birthPlace', encodeURIComponent(formData.birthPlace))
      if (formData.concern) params.set('concern', encodeURIComponent(formData.concern))
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)

      const birthDate = `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`
      const birthTime = formData.birthHour && formData.birthMinute !== '' ? `${String(formData.birthHour).padStart(2, '0')}:${String(formData.birthMinute).padStart(2, '0')}` : ''
      const toneNumber = parseInt(data.maya.tone.match(/\((\d+)\)/)?.[1] || '0')

      clearTimeout(timeoutId)
      setIsProcessingInBackground(false)
      setIsSubmitting(false)
      setScreen('result')
      setTimeout(() => window.scrollTo(0, 0), 100)

      fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'full',
          name: formData.name, birthDate, birthTime,
          bloodType: formData.bloodType, birthPlace: formData.birthPlace,
          concern: formData.concern, kin: data.maya.kin, glyph: data.maya.glyph,
          tone: toneNumber, ws: data.maya.ws, stem: data.bazi.stem,
          weapon: data.bazi.weapon, lp: data.numerology.lp, sign: data.western.sign,
          sukuyo: data.sukuyo, story
        })
      }).then(res => res.json()).then(notionResult => {
        if (notionResult.success && notionResult.pageId) {
          const shareParams = new URLSearchParams()
          shareParams.set('notionId', notionResult.pageId)
          shareParams.set('name', encodeURIComponent(formData.name))
          shareParams.set('year', formData.year)
          shareParams.set('month', formData.month)
          shareParams.set('day', formData.day)
          window.history.replaceState({}, '', `${window.location.pathname}?${shareParams.toString()}`)
        } else {
          console.error('[Notion Save Failed]', notionResult.error)
        }
      }).catch((err) => console.error('[Notion Save Error]', err))

    } catch (e) {
      clearTimeout(timeoutId)
      setIsSubmitting(false)
      if (e instanceof Error && e.message.includes('執筆力が本日の限界')) {
        const data = calculateAll(parseInt(formData.year), parseInt(formData.month), parseInt(formData.day))
        setResultHtml(renderPreview(formData.name, data, formData.concern))
        setScreen('result')
        setIsProcessingInBackground(false)
      } else {
        alert(`${e instanceof Error ? e.message : '予期せぬエラーが発生しました。'}\n\nアプリ内ブラウザをお使いの場合は、SafariやChromeで開き直してみてください。`)
        setScreen('input')
      }
    }
  }

  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
      const script = document.createElement('script')
      script.src = src
      script.onload = () => resolve()
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  const handlePrintOrDownload = async (targetId = 'result-screen') => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const isInApp = /Line|FBAV|FBAN|Instagram|Twitter|Snapchat|WeChat|WhatsApp|Telegram/i.test(ua)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua)
    if (isInApp || isMobile) {
      setIsDownloadingPDF(true)
      try {
        if (typeof window !== 'undefined' && !(window as any).html2canvas) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
        }
        const el = document.getElementById(targetId)
        if (!el) return
        const canvas = await (window as any).html2canvas(el, { scale: 2, backgroundColor: '#ffffff' })
        const imgData = canvas.toDataURL('image/png')
        const { jsPDF } = (window as any).jspdf
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const imgWidth = 210
        const pageHeight = 297
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        let heightLeft = imgHeight
        let position = 0
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }
        let filename: string
        if (targetId === 'compat-result-screen' && compatResult) {
          filename = `${compatResult.name1}×${compatResult.name2}_相性診断.pdf`
        } else if (targetId === 'tarot-result-screen') {
          filename = `${tarotUserName || formData.name || 'FateDecoder'}_タロット診断.pdf`
        } else if (targetId === 'short-result-screen' && shortResult) {
          filename = `${shortResult.name}_ショート診断.pdf`
        } else if (shortResult && screen === 'short-result') {
          filename = `${shortResult.name}_診断結果.pdf`
        } else {
          filename = `${formData.name || 'FateDecoder'}_診断結果.pdf`
        }
        pdf.save(filename)
        setIsDownloadingPDF(false)
      } catch {
        setIsDownloadingPDF(false)
        alert('PDF保存に失敗しました。\n\nブラウザの印刷機能 (Ctrl+P / Cmd+P) から「PDFとして保存」をお試しください。')
      }
    } else {
      // ブラウザ印刷: titleを変更してファイル名に反映
      const originalTitle = document.title
      if (targetId === 'compat-result-screen' && compatResult) {
        document.title = `${compatResult.name1}×${compatResult.name2}_相性診断`
      } else if (targetId === 'tarot-result-screen') {
        document.title = `${tarotUserName || formData.name || 'FateDecoder'}_タロット診断`
      } else if (targetId === 'short-result-screen' && shortResult) {
        document.title = `${shortResult.name}_ショート診断`
      } else {
        document.title = `${formData.name || 'FateDecoder'}_診断結果`
      }
      window.print()
      document.title = originalTitle
    }
  }

  const handleShare = async () => {
    if (typeof window === 'undefined') return
    const name = formData.name || '私'
    const shareData = {
      title: 'Fate Decoder - AIパーソナルリーディング',
      text: `${name}さんの診断結果`,
      url: window.location.href
    }
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try { await navigator.share(shareData) } catch {}
    } else if (typeof navigator !== 'undefined') {
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('URLをコピーしました。')
      } catch {
        alert('URLのコピーに失敗しました。')
      }
    }
  }

  const handleFlipCard = (index: number) => {
    if (flippedCards[index]) return
    const newFlipped = [...flippedCards]
    newFlipped[index] = true
    setFlippedCards(newFlipped)
    if (newFlipped.every(Boolean)) {
      setTimeout(() => setAllRevealed(true), 800)
    }
  }

  const handleRevealAll = () => {
    const newFlipped = new Array(tarotSpread.length).fill(true)
    setFlippedCards(newFlipped)
    setTimeout(() => setAllRevealed(true), 800)
  }

  const handleModeSelect = (mode: ReadingMode) => {
    if (!MODE_CONFIG[mode].available) return
    setReadingMode(mode)
    if (mode === 'compatibility') {
      setScreen('compat-type-select')
    } else {
      setScreen('input')
    }
  }

  const handleCompatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!formData.name || !formData.year || !person2.name || !person2.year) {
      alert('2人のお名前と生年月日を入力してください。')
      return
    }
    if (!consentChecked) {
      alert('診断結果の保存にご同意ください。')
      return
    }
    setIsSubmitting(true)
    setScreen('loading')

    try {
      const data1 = calculateAll(parseInt(formData.year), parseInt(formData.month), parseInt(formData.day))
      const data2 = calculateAll(parseInt(person2.year), parseInt(person2.month), parseInt(person2.day))
      const score = calculateCompatibility(data1, data2)

      const typeLabel = COMPAT_TYPE_CONFIG[compatType].label
      const isGeneral = compatType === 'general'

      const compatPrompt = `
あなたは20年の経験を持つ、鑑定実績1万人超の本物の占い師です。
2人の6占術データと相性スコアをもとに、${typeLabel}の観点で相性を読み解いてください。
しいたけ占いのような親しみやすい文体で、「あるある」な具体例を入れてください。

【2人の情報】
■ ${formData.name}さん (${formData.year}年${formData.month}月${formData.day}日生まれ)
・マヤ暦: KIN${data1.maya.kin} / 太陽の紋章:${data1.maya.glyph} / 銀河の音:${data1.maya.tone}
・算命学: 中心星[${data1.bazi.weapon}]
・四柱推命: 年柱[${data1.sanmeigaku.year}] / 月柱[${data1.sanmeigaku.month}] / 日柱[${data1.sanmeigaku.day}] / 日干[${data1.bazi.stem}]
・数秘術: ライフパスナンバー[${data1.numerology.lp}]
・西洋占星術: ${data1.western.sign}
・宿曜: ${data1.sukuyo}

■ ${person2.name}さん (${person2.year}年${person2.month}月${person2.day}日生まれ)
・マヤ暦: KIN${data2.maya.kin} / 太陽の紋章:${data2.maya.glyph} / 銀河の音:${data2.maya.tone}
・算命学: 中心星[${data2.bazi.weapon}]
・四柱推命: 年柱[${data2.sanmeigaku.year}] / 月柱[${data2.sanmeigaku.month}] / 日柱[${data2.sanmeigaku.day}] / 日干[${data2.bazi.stem}]
・数秘術: ライフパスナンバー[${data2.numerology.lp}]
・西洋占星術: ${data2.western.sign}
・宿曜: ${data2.sukuyo}

【相性スコア（6占術の総合）】
総合: ${score.total}点
・西洋占星術: ${score.western.score}点 - ${score.western.detail}
・数秘術: ${score.numerology.score}点 - ${score.numerology.detail}
・マヤ暦: ${score.maya.score}点 - ${score.maya.detail}
・算命学: ${score.sanmeigaku.score}点 - ${score.sanmeigaku.detail}
・四柱推命: ${score.shichusuimei.score}点 - ${score.shichusuimei.detail}
・宿曜: ${score.sukuyo.score}点 - ${score.sukuyo.detail}

【診断タイプ】${typeLabel}

【執筆ルール】
1. attraction（惹かれ合うポイント）: 500〜700文字。占術データを具体的に引用し、2人が惹かれ合う理由を描写。「あるある」な場面を入れる
2. caution（すれ違いやすいポイント）: 400〜600文字。注意点を率直に、でも建設的に伝える
3. advice（ふたりへのアドバイス）: 400〜600文字。具体的なアクションを含める
${isGeneral ? `4. loveStory（恋愛相性）: 300〜400文字。恋愛面での相性を分析
5. businessStory（ビジネス相性）: 300〜400文字。仕事面での相性を分析
6. friendStory（友情相性）: 300〜400文字。友人関係での相性を分析` : ''}
7. 各セクションに「〜ではないでしょうか」「〜という感覚、ありませんか？」のような問いかけを最低1つ
8. 占術の専門用語は噛み砕いて自然に使う
9. **必ず純粋なJSON形式で出力**（Markdownバッククォート不要）

【出力フォーマット】
{
  "attraction": "惹かれ合うポイントテキスト",
  "caution": "すれ違いやすいポイントテキスト",
  "advice": "ふたりへのアドバイステキスト"${isGeneral ? `,
  "loveStory": "恋愛相性テキスト",
  "businessStory": "ビジネス相性テキスト",
  "friendStory": "友情相性テキスト"` : ''}
}
`

      let story: any = {
        attraction: '', caution: '', advice: '',
        ...(isGeneral ? { loveStory: '', businessStory: '', friendStory: '' } : {})
      }

      try {
        const resultText = await generateStory(compatPrompt)
        let cleanJson = resultText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
        cleanJson = cleanJson.replace(/^\uFEFF/, '').replace(/^[\s\uFEFF\xA0]+/, '')
        const firstBrace = cleanJson.indexOf('{')
        if (firstBrace !== -1) cleanJson = cleanJson.substring(firstBrace)
        const lastBrace = cleanJson.lastIndexOf('}')
        if (lastBrace !== -1) cleanJson = cleanJson.substring(0, lastBrace + 1)
        const parsed = JSON.parse(cleanJson)
        story = { ...story, ...parsed }
      } catch {
        story.attraction = `${data1.western.sign}の${formData.name}さんと${data2.western.sign}の${person2.name}さんは、${score.western.detail}。マヤ暦では${score.maya.detail}。数秘術からは${score.numerology.detail}。互いの存在が自然と心地よい——そんな感覚に覚えはないでしょうか？`
        story.caution = `算命学では${score.sanmeigaku.detail}。四柱推命では${score.shichusuimei.detail}。お互いの「当たり前」が少し違うことがあるかもしれません。でもそれは、視野を広げるチャンスでもあるのです。`
        story.advice = `宿曜占星術では${score.sukuyo.detail}。大切なのは、違いを「間違い」ではなく「面白さ」として受け止めること。今日からできるアクション：相手の好きなことに1つ興味を持ってみてください。`
      }

      setCompatResult({
        name1: formData.name, name2: person2.name,
        data1, data2, score, type: compatType, story
      })
      setScreen('compat-result')
      setIsSubmitting(false)
      setTimeout(() => window.scrollTo(0, 0), 100)

      // Notion保存
      const birthDate1 = `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`
      const birthDate2 = `${person2.year}-${person2.month.padStart(2, '0')}-${person2.day.padStart(2, '0')}`
      saveToNotion({
        mode: 'compatibility', name: formData.name, name2: person2.name,
        birthDate: birthDate1, birthDate2,
        ...buildFortuneFields(data1),
        compatType,
        totalScore: score.total,
        compatData: {
          name2: person2.name, type: COMPAT_TYPE_CONFIG[compatType].label,
          totalScore: score.total,
          scores: [
            { label: '西洋占星術', score: score.western.score, detail: score.western.detail },
            { label: '数秘術', score: score.numerology.score, detail: score.numerology.detail },
            { label: 'マヤ暦', score: score.maya.score, detail: score.maya.detail },
            { label: '算命学', score: score.sanmeigaku.score, detail: score.sanmeigaku.detail },
            { label: '四柱推命', score: score.shichusuimei.score, detail: score.shichusuimei.detail },
            { label: '宿曜', score: score.sukuyo.score, detail: score.sukuyo.detail },
          ],
          story
        }
      })

    } catch {
      alert('診断中にエラーが発生しました。もう一度お試しください。')
      setScreen('compat-input')
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {screen === 'mode-select' && (
        <div className="mode-select-screen">
          <div className="mode-select-header">
            <h1 className="mode-select-title">Fate Decoder</h1>
            <p className="mode-select-subtitle">あなたに合ったリーディングを選んでください</p>
          </div>
          <div className="mode-select-grid">
            {(Object.entries(MODE_CONFIG) as [ReadingMode, typeof MODE_CONFIG[ReadingMode]][]).map(([key, config]) => (
              <button
                key={key}
                className={`mode-card ${key === 'full' ? 'mode-card-primary' : ''} ${!config.available ? 'mode-card-disabled' : ''}`}
                onClick={() => handleModeSelect(key)}
                disabled={!config.available}
              >
                {!config.available && <span className="mode-badge">Coming Soon</span>}
                <span className="mode-label">{config.label}</span>
                <span className="mode-card-subtitle">{config.subtitle}</span>
                <span className="mode-description">{config.description}</span>
              </button>
            ))}
          </div>
          <p className="input-credit">produced by <a href="https://satoyama-ai-base.vercel.app" target="_blank" rel="noopener noreferrer" className="credit-link">SATOYAMA AI BASE</a></p>
        </div>
      )}

      {isProcessingInBackground && (
        <div className="bg-banner">
          <div className="bg-banner-title">AIが文章を作成しています...</div>
          <div className="bg-banner-desc">完了したら自動的に結果が表示されます</div>
        </div>
      )}

      {screen === 'loading' && readingMode === 'compatibility' && (
        <div className="loading-screen">
          <div className="loading-spinner" />
          <div className="loading-text">ふたりの星を<br />読み解いています...</div>
          <p className="loading-desc">6つの占術から相性を診断中です<br />(20〜40秒ほどかかります)</p>
        </div>
      )}

      {screen === 'loading' && readingMode === 'tarot' && (
        <div className="tarot-loading-screen">
          <div className="tarot-loading-particles" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="tarot-loading-particle" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${4 + Math.random() * 6}s`,
              }} />
            ))}
          </div>
          <div className="tarot-loading-cards" aria-hidden="true">
            <div className="tarot-loading-card tl-card-1" />
            <div className="tarot-loading-card tl-card-2" />
            <div className="tarot-loading-card tl-card-3" />
          </div>
          <div className="tarot-loading-glow" aria-hidden="true" />
          <div className="tarot-loading-text">
            カードを<br />シャッフルしています
          </div>
          <p className="tarot-loading-desc">あなたのために3枚のカードを選んでいます</p>
        </div>
      )}

      {screen === 'loading' && readingMode === 'short' && (
        <div className="loading-screen">
          <div className="loading-spinner" />
          <div className="loading-text">サクッと<br />診断中...</div>
          <p className="loading-desc">あなたの本質を読み解いています</p>
        </div>
      )}

      {screen === 'loading' && readingMode === 'full' && (
        <div className="loading-screen">
          <div className="loading-spinner" />
          <div className="loading-text">AIがあなたの<br />診断レポートを作成中...</div>
          <p className="loading-desc">あなただけのレポートを執筆しています<br />(30〜60秒ほどかかります)</p>
        </div>
      )}

      {screen === 'input' && (
        <div className="input-screen">
          {isInAppBrowser && (
            <div className="inapp-warning">
              アプリ内ブラウザでは正常に動作しない場合があります。<br />
              <strong>Safari、Chrome等の外部ブラウザで開くこと</strong>をおすすめします。
            </div>
          )}
          <div className="input-card">
            <button className="back-to-mode" onClick={() => { setScreen('mode-select'); window.scrollTo(0, 0) }}>
              &larr; リーディング選択に戻る
            </button>
            <div className="input-header">
              <h1 className="input-title">Fate Decoder</h1>
              <p className="input-subtitle">{MODE_CONFIG[readingMode].label} — {MODE_CONFIG[readingMode].subtitle}</p>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>お名前 <span className="required">*</span></label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="ニックネームでもOK" required />
              </div>
              <div className="form-group">
                <label>生年月日 <span className="required">*</span></label>
                <div className="row-3">
                  <input type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} placeholder="1995" required />
                  <select value={formData.month} onChange={(e) => setFormData({ ...formData, month: e.target.value })} required>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (<option key={m} value={m}>{m}月</option>))}
                  </select>
                  <select value={formData.day} onChange={(e) => setFormData({ ...formData, day: e.target.value })} required>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (<option key={d} value={d}>{d}日</option>))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>出生時間 <span className="optional">(任意)</span></label>
                <div className="row-time">
                  <select value={formData.birthHour} onChange={(e) => setFormData({ ...formData, birthHour: e.target.value })}>
                    <option value="">--</option>
                    {Array.from({ length: 24 }, (_, i) => i).map(h => (<option key={h} value={h}>{String(h).padStart(2, '0')}</option>))}
                  </select>
                  <span className="time-sep">時</span>
                  <select value={formData.birthMinute} onChange={(e) => setFormData({ ...formData, birthMinute: e.target.value })}>
                    <option value="">--</option>
                    {Array.from({ length: 60 }, (_, i) => i).map(m => (<option key={m} value={m}>{String(m).padStart(2, '0')}</option>))}
                  </select>
                  <span className="time-sep">分</span>
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>血液型 <span className="required">*</span></label>
                  <select value={formData.bloodType} onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })} required>
                    <option value="A">A型</option><option value="B">B型</option><option value="O">O型</option><option value="AB">AB型</option><option value="Unknown">不明</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>出生地 <span className="optional">(任意)</span></label>
                  <input type="text" value={formData.birthPlace} onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })} placeholder="例: 東京" />
                </div>
              </div>
              <div className="form-group">
                <label>今、気になっていること・相談したいこと</label>
                <textarea value={formData.concern} onChange={(e) => setFormData({ ...formData, concern: e.target.value })} rows={4} placeholder="例：今の仕事を続けるべきか迷っています..." />
              </div>
              <div className="consent-group">
                <label className="consent-label">
                  <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="consent-checkbox" />
                  <span className="consent-text">
                    診断結果の記録・保存に同意します。
                    <Link href="/privacy" className="consent-link" target="_blank">プライバシーポリシー</Link>
                  </span>
                </label>
              </div>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>{isSubmitting ? '診断中...' : '診断する'}</button>
            </form>
          </div>
          <p className="input-footer">マヤ暦・算命学・数秘術・西洋占星術・宿曜・四柱推命の6つの占術を用いてリーディングします。</p>
          <p className="input-credit">produced by <a href="https://satoyama-ai-base.vercel.app" target="_blank" rel="noopener noreferrer" className="credit-link">SATOYAMA AI BASE</a></p>
        </div>
      )}

      {screen === 'compat-type-select' && (
        <div className="mode-select-screen">
          <div className="mode-select-header">
            <button className="back-to-mode" onClick={() => { setScreen('mode-select'); window.scrollTo(0, 0) }}>
              &larr; リーディング選択に戻る
            </button>
            <h1 className="mode-select-title">Compatibility</h1>
            <p className="mode-select-subtitle">相性診断のタイプを選んでください</p>
          </div>
          <div className="mode-select-grid">
            {(Object.entries(COMPAT_TYPE_CONFIG) as [CompatibilityType, typeof COMPAT_TYPE_CONFIG[CompatibilityType]][]).map(([key, config]) => (
              <button
                key={key}
                className={`mode-card ${key === 'general' ? 'mode-card-primary' : ''}`}
                onClick={() => { setCompatType(key); setScreen('compat-input') }}
              >
                <span className="mode-label"><span className="compat-type-icon">{config.icon}</span> {config.label}</span>
                <span className="mode-description">{config.description}</span>
              </button>
            ))}
          </div>
          <p className="input-credit">produced by <a href="https://satoyama-ai-base.vercel.app" target="_blank" rel="noopener noreferrer" className="credit-link">SATOYAMA AI BASE</a></p>
        </div>
      )}

      {screen === 'compat-input' && (
        <div className="input-screen">
          {isInAppBrowser && (
            <div className="inapp-warning">
              アプリ内ブラウザでは正常に動作しない場合があります。<br />
              <strong>Safari、Chrome等の外部ブラウザで開くこと</strong>をおすすめします。
            </div>
          )}
          <div className="input-card">
            <button className="back-to-mode" onClick={() => { setScreen('compat-type-select'); window.scrollTo(0, 0) }}>
              &larr; タイプ選択に戻る
            </button>
            <div className="input-header">
              <h1 className="input-title">Fate Decoder</h1>
              <p className="input-subtitle">Compatibility — {COMPAT_TYPE_CONFIG[compatType].label}</p>
            </div>
            <form onSubmit={handleCompatSubmit}>
              <div className="compat-person-section">
                <h3 className="compat-person-label">1人目</h3>
                <div className="form-group">
                  <label>お名前 <span className="required">*</span></label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="ニックネームでもOK" required />
                </div>
                <div className="form-group">
                  <label>生年月日 <span className="required">*</span></label>
                  <div className="row-3">
                    <input type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} placeholder="1995" required />
                    <select value={formData.month} onChange={(e) => setFormData({ ...formData, month: e.target.value })} required>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (<option key={m} value={m}>{m}月</option>))}
                    </select>
                    <select value={formData.day} onChange={(e) => setFormData({ ...formData, day: e.target.value })} required>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (<option key={d} value={d}>{d}日</option>))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="compat-divider">
                <span className="compat-divider-icon">&times;</span>
              </div>

              <div className="compat-person-section">
                <h3 className="compat-person-label">2人目</h3>
                <div className="form-group">
                  <label>お名前 <span className="required">*</span></label>
                  <input type="text" value={person2.name} onChange={(e) => setPerson2({ ...person2, name: e.target.value })} placeholder="ニックネームでもOK" required />
                </div>
                <div className="form-group">
                  <label>生年月日 <span className="required">*</span></label>
                  <div className="row-3">
                    <input type="number" value={person2.year} onChange={(e) => setPerson2({ ...person2, year: e.target.value })} placeholder="1995" required />
                    <select value={person2.month} onChange={(e) => setPerson2({ ...person2, month: e.target.value })} required>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (<option key={m} value={m}>{m}月</option>))}
                    </select>
                    <select value={person2.day} onChange={(e) => setPerson2({ ...person2, day: e.target.value })} required>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (<option key={d} value={d}>{d}日</option>))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="consent-group">
                <label className="consent-label">
                  <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="consent-checkbox" />
                  <span className="consent-text">
                    診断結果の記録・保存に同意します。
                    <Link href="/privacy" className="consent-link" target="_blank">プライバシーポリシー</Link>
                  </span>
                </label>
              </div>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>{isSubmitting ? '診断中...' : '相性を診断する'}</button>
            </form>
          </div>
          <p className="input-footer">6つの占術で2人の相性を総合的に診断します。</p>
          <p className="input-credit">produced by <a href="https://satoyama-ai-base.vercel.app" target="_blank" rel="noopener noreferrer" className="credit-link">SATOYAMA AI BASE</a></p>
        </div>
      )}

      {screen === 'compat-result' && compatResult && (
        <div id="compat-result-screen" className="compat-result-screen">
          <header className="compat-header">
            <p className="result-label">Fate Decoder</p>
            <h1 className="compat-title">{compatResult.name1} &times; {compatResult.name2}</h1>
            <p className="compat-type-badge">{COMPAT_TYPE_CONFIG[compatResult.type].icon} {COMPAT_TYPE_CONFIG[compatResult.type].label}</p>
            <div className="compat-header-line" />
          </header>

          <div className="compat-score-section">
            <div className="compat-score-circle">
              <svg viewBox="0 0 120 120" className="compat-score-svg">
                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--c-border)" strokeWidth="6" />
                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--c-accent)" strokeWidth="6"
                  strokeDasharray={`${compatResult.score.total * 3.27} 327`}
                  strokeLinecap="round" transform="rotate(-90 60 60)" />
              </svg>
              <span className="compat-score-value">{compatResult.score.total}</span>
              <span className="compat-score-label">総合相性</span>
            </div>
            <div className="compat-score-bars">
              {[
                { label: '西洋占星術', score: compatResult.score.western.score },
                { label: '数秘術', score: compatResult.score.numerology.score },
                { label: 'マヤ暦', score: compatResult.score.maya.score },
                { label: '算命学', score: compatResult.score.sanmeigaku.score },
                { label: '四柱推命', score: compatResult.score.shichusuimei.score },
                { label: '宿曜', score: compatResult.score.sukuyo.score },
              ].map((item, i) => (
                <div key={i} className="compat-bar-row">
                  <span className="compat-bar-label">{item.label}</span>
                  <div className="compat-bar-track">
                    <div className="compat-bar-fill" style={{ width: `${item.score}%` }} />
                  </div>
                  <span className="compat-bar-score">{item.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="compat-data-compare">
            <h2 className="compat-section-title">ふたりの診断データ</h2>
            <div className="compat-compare-grid">
              {[
                { label: '星座', v1: compatResult.data1.western.sign, v2: compatResult.data2.western.sign },
                { label: 'ライフパス', v1: compatResult.data1.numerology.lp, v2: compatResult.data2.numerology.lp },
                { label: 'KIN番号', v1: String(compatResult.data1.maya.kin), v2: String(compatResult.data2.maya.kin) },
                { label: '太陽の紋章', v1: compatResult.data1.maya.glyph, v2: compatResult.data2.maya.glyph },
                { label: '中心星', v1: compatResult.data1.bazi.weapon, v2: compatResult.data2.bazi.weapon },
                { label: '日柱', v1: compatResult.data1.sanmeigaku.day, v2: compatResult.data2.sanmeigaku.day },
                { label: '年柱', v1: compatResult.data1.sanmeigaku.year, v2: compatResult.data2.sanmeigaku.year },
                { label: '宿曜', v1: compatResult.data1.sukuyo, v2: compatResult.data2.sukuyo },
              ].map((row, i) => (
                <div key={i} className="compat-compare-row">
                  <span className="compat-compare-v1">{row.v1}</span>
                  <span className="compat-compare-label">{row.label}</span>
                  <span className="compat-compare-v2">{row.v2}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="compat-stories">
            <section className="compat-story-card compat-attraction">
              <div className="compat-story-icon">&#x2661;</div>
              <h3 className="compat-story-title">惹かれ合うポイント</h3>
              <p className="compat-story-text">{compatResult.story.attraction}</p>
            </section>

            <section className="compat-story-card compat-caution">
              <div className="compat-story-icon">&#x26A0;</div>
              <h3 className="compat-story-title">すれ違いやすいポイント</h3>
              <p className="compat-story-text">{compatResult.story.caution}</p>
            </section>

            {compatResult.type === 'general' && compatResult.story.loveStory && (
              <>
                <section className="compat-story-card">
                  <div className="compat-story-icon">&#x2764;</div>
                  <h3 className="compat-story-title">恋愛の相性</h3>
                  <p className="compat-story-text">{compatResult.story.loveStory}</p>
                </section>
                <section className="compat-story-card">
                  <div className="compat-story-icon">&#x2726;</div>
                  <h3 className="compat-story-title">ビジネスの相性</h3>
                  <p className="compat-story-text">{compatResult.story.businessStory}</p>
                </section>
                <section className="compat-story-card">
                  <div className="compat-story-icon">&#x2606;</div>
                  <h3 className="compat-story-title">友情の相性</h3>
                  <p className="compat-story-text">{compatResult.story.friendStory}</p>
                </section>
              </>
            )}

            <section className="compat-story-card compat-advice">
              <div className="compat-story-icon">&#x2728;</div>
              <h3 className="compat-story-title">ふたりへのアドバイス</h3>
              <p className="compat-story-text">{compatResult.story.advice}</p>
            </section>
          </div>

          <div className="short-upgrade">
            <p className="short-upgrade-text">
              それぞれの詳しい性格分析は<br />
              <strong>Full Reading</strong>（6000文字超の詳細レポート）でお試しください。
            </p>
          </div>

          <footer className="result-footer">
            <p>Fate Decoder - Compatibility Reading</p>
          </footer>

          <div className="action-bar">
            <button onClick={() => { setScreen('mode-select'); window.scrollTo(0, 0) }} className="fab fab-back" title="新しく診断する">
              もう一度
            </button>
            <button onClick={() => handlePrintOrDownload('compat-result-screen')} className="fab fab-print" title={isDownloadingPDF ? 'PDF生成中...' : '印刷/PDF保存'} disabled={isDownloadingPDF}>
              {isDownloadingPDF ? 'PDF生成中' : '印刷/PDF'}
            </button>
            <button onClick={handleShare} className="fab fab-share" title="シェア">
              共有
            </button>
          </div>
        </div>
      )}

      {screen === 'tarot-result' && (
        <div id="tarot-result-screen" className="tarot-result-screen">
          {/* 浮遊パーティクル背景 */}
          <div className="tarot-particles" aria-hidden="true">
            {Array.from({ length: 20 }).map((_, i) => (
              <span key={i} className="tarot-particle" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${6 + Math.random() * 8}s`,
              }} />
            ))}
          </div>

          <header className="tarot-header">
            <div className="tarot-header-ornament" aria-hidden="true">&#x2726; &#x2727; &#x2726;</div>
            <p className="result-label">Fate Decoder</p>
            <h1 className="tarot-title">{tarotUserName} さんへの<br />Tarot Reading</h1>
            <div className="tarot-header-line" aria-hidden="true" />
            <p className="tarot-instruction">
              {allRevealed
                ? '3枚のカードがすべて開かれました'
                : 'カードに触れて、あなたへのメッセージを受け取ってください'}
            </p>
            {!allRevealed && (
              <button className="reveal-all-btn" onClick={handleRevealAll}>
                <span className="reveal-all-icon">&#x2728;</span> すべて開く
              </button>
            )}
          </header>

          <div className="tarot-spread">
            {tarotSpread.map((item, i) => (
              <div
                key={i}
                className={`tarot-slot ${flippedCards[i] ? 'tarot-slot-revealed' : ''}`}
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className="tarot-position-badge">
                  <span className="tarot-position-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="tarot-position-label">{item.position.label}</span>
                  <span className="tarot-position-desc">{item.position.description}</span>
                </div>

                <div
                  className={`tarot-card-container ${flippedCards[i] ? 'is-flipped' : ''}`}
                  onClick={() => handleFlipCard(i)}
                >
                  {/* フリップ時の光のバースト */}
                  {flippedCards[i] && <div className="tarot-flip-burst" />}

                  <div className="tarot-card-inner">
                    <div className="tarot-card-back">
                      <div className="tarot-card-back-design">
                        <div className="tarot-back-star" aria-hidden="true" />
                        <div className="tarot-back-ring tarot-back-ring-1" aria-hidden="true" />
                        <div className="tarot-back-ring tarot-back-ring-2" aria-hidden="true" />
                        <span className="tarot-card-back-symbol">&#x2726;</span>
                      </div>
                    </div>
                    <div className="tarot-card-front">
                      <div className="tarot-card-front-corner tl" aria-hidden="true" />
                      <div className="tarot-card-front-corner tr" aria-hidden="true" />
                      <div className="tarot-card-front-corner bl" aria-hidden="true" />
                      <div className="tarot-card-front-corner br" aria-hidden="true" />
                      <span className="tarot-card-numeral">{item.card.numeral}</span>
                      <div className="tarot-card-divider" aria-hidden="true" />
                      <span className="tarot-card-name">{item.card.name}</span>
                      <span className="tarot-card-name-en">{item.card.nameEn}</span>
                      <span className="tarot-card-keyword">{item.card.keyword}</span>
                    </div>
                  </div>
                </div>

                {flippedCards[i] && (
                  <div className="tarot-message-box">
                    <div className="tarot-message-ornament" aria-hidden="true">&#x2726;</div>
                    <p className="tarot-message">{tarotMessages[i] || item.card.meaning}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {allRevealed && (
            <div className="tarot-summary">
              <div className="tarot-summary-inner">
                <div className="tarot-summary-ornament" aria-hidden="true">&#x2726; &#x2727; &#x2726;</div>
                <h2 className="tarot-summary-title">3枚のカードが語るもの</h2>
                <p className="tarot-summary-text">
                  あなたの本質、今の流れ、そして導き。<br />
                  6つの占術が選んだ3枚のカードが、<br />
                  ひとつの物語としてあなたの今を映し出しています。
                </p>
                <div className="tarot-summary-divider" />
                <p className="tarot-summary-cta">
                  より深い解読は <strong>Full Reading</strong> モードで。<br />
                  AIが6000文字超の詳細レポートを執筆します。
                </p>
              </div>
            </div>
          )}

          <footer className="result-footer">
            <p>Fate Decoder - Tarot Reading</p>
          </footer>

          <div className="action-bar">
            <button onClick={() => { setScreen('mode-select'); window.scrollTo(0, 0) }} className="fab fab-back" title="新しく診断する">
              もう一度
            </button>
            <button onClick={() => handlePrintOrDownload('tarot-result-screen')} className="fab fab-print" title={isDownloadingPDF ? 'PDF生成中...' : '印刷/PDF保存'} disabled={isDownloadingPDF}>
              {isDownloadingPDF ? 'PDF生成中' : '印刷/PDF'}
            </button>
            <button onClick={handleShare} className="fab fab-share" title="シェア">
              共有
            </button>
          </div>
        </div>
      )}

      {screen === 'short-result' && shortResult && (
        <div id="short-result-screen" className="short-result-screen">
          <header className="short-header">
            <p className="result-label">Fate Decoder</p>
            <h1 className="short-title">{shortResult.name} さんの<br />Short Reading</h1>
            <div className="short-header-line" />
          </header>

          <div className="short-oneword">
            <span className="short-oneword-label">あなたを一言で表すなら</span>
            <span className="short-oneword-value">{shortResult.oneWord}</span>
          </div>

          <section className="short-data">
            <h2 className="short-section-title">あなたの診断データ</h2>
            <div className="data-grid">
              <div className="data-card"><span className="data-label">KIN番号</span><span className="data-sublabel">マヤ暦</span><span className="data-value">{shortResult.data.maya.kin}</span></div>
              <div className="data-card"><span className="data-label">太陽の紋章</span><span className="data-sublabel">表の自分</span><span className="data-value">{shortResult.data.maya.glyph}</span></div>
              <div className="data-card"><span className="data-label">ウェイブスペル</span><span className="data-sublabel">内なる自分</span><span className="data-value">{shortResult.data.maya.ws}</span></div>
              <div className="data-card"><span className="data-label">銀河の音</span><span className="data-sublabel">役割・才能</span><span className="data-value">{shortResult.data.maya.tone}</span></div>
              <div className="data-card"><span className="data-label">ライフパス</span><span className="data-sublabel">数秘術</span><span className="data-value">{shortResult.data.numerology.lp}</span></div>
              <div className="data-card"><span className="data-label">中心星</span><span className="data-sublabel">算命学</span><span className="data-value">{shortResult.data.bazi.weapon}</span></div>
              <div className="data-card"><span className="data-label">日柱</span><span className="data-sublabel">四柱推命</span><span className="data-value">{shortResult.data.sanmeigaku.day}</span></div>
              <div className="data-card"><span className="data-label">月柱</span><span className="data-sublabel">四柱推命</span><span className="data-value">{shortResult.data.sanmeigaku.month}</span></div>
              <div className="data-card"><span className="data-label">年柱</span><span className="data-sublabel">四柱推命</span><span className="data-value">{shortResult.data.sanmeigaku.year}</span></div>
              <div className="data-card"><span className="data-label">星座</span><span className="data-sublabel">西洋占星術</span><span className="data-value">{shortResult.data.western.sign}</span></div>
              <div className="data-card"><span className="data-label">宿曜</span><span className="data-sublabel">東洋の星座</span><span className="data-value">{shortResult.data.sukuyo}</span></div>
            </div>
          </section>

          <div className="short-readings">
            <section className="short-reading-card">
              <div className="short-reading-icon">&#x2726;</div>
              <h3 className="short-reading-title">性格の核心</h3>
              <p className="short-reading-text">{shortResult.personality}</p>
            </section>

            <section className="short-reading-card">
              <div className="short-reading-icon">&#x2661;</div>
              <h3 className="short-reading-title">人間関係</h3>
              <p className="short-reading-text">{shortResult.relationships}</p>
            </section>

            <section className="short-reading-card">
              <div className="short-reading-icon">&#x2605;</div>
              <h3 className="short-reading-title">才能・仕事</h3>
              <p className="short-reading-text">{shortResult.talent}</p>
            </section>
          </div>

          <div className="short-bottom-cards">
            <section className="short-action">
              <div className="short-action-inner">
                <span className="short-action-label">今日からできるアクション</span>
                <span className="short-action-value">{shortResult.action}</span>
              </div>
            </section>

            <section className="short-lucky">
              <div className="short-lucky-inner">
                <span className="short-lucky-label">ラッキーアイテム</span>
                <span className="short-lucky-value">{shortResult.luckyItem}</span>
              </div>
            </section>
          </div>

          <div className="short-upgrade">
            <p className="short-upgrade-text">
              もっと深く知りたい方は<br />
              <strong>Full Reading</strong>（6000文字超の詳細レポート）や<br />
              <strong>Tarot Reading</strong>（カード演出付き）もお試しください。
            </p>
          </div>

          <footer className="result-footer">
            <p>Fate Decoder - Short Reading</p>
          </footer>

          <div className="action-bar">
            <button onClick={() => { setScreen('mode-select'); window.scrollTo(0, 0) }} className="fab fab-back" title="新しく診断する">
              もう一度
            </button>
            <button onClick={() => handlePrintOrDownload('short-result-screen')} className="fab fab-print" title={isDownloadingPDF ? 'PDF生成中...' : '印刷/PDF保存'} disabled={isDownloadingPDF}>
              {isDownloadingPDF ? 'PDF生成中' : '印刷/PDF'}
            </button>
            <button onClick={handleShare} className="fab fab-share" title="シェア">
              共有
            </button>
          </div>
        </div>
      )}

      {screen === 'result' && (
        <>
          <div id="result-screen" dangerouslySetInnerHTML={{ __html: resultHtml }} />
          <div className="action-bar">
            <button onClick={() => { setScreen('mode-select'); window.scrollTo(0, 0) }} className="fab fab-back" title="新しく診断する">
              もう一度
            </button>
            <button onClick={() => handlePrintOrDownload()} className="fab fab-print" title={isDownloadingPDF ? 'PDF生成中...' : '印刷/PDF保存'} disabled={isDownloadingPDF}>
              {isDownloadingPDF ? 'PDF生成中' : '印刷/PDF'}
            </button>
            <button onClick={handleShare} className="fab fab-share" title="シェア">
              共有
            </button>
          </div>
        </>
      )}
    </>
  )
}

// ========================================
// 3. レンダリング関数
// ========================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function renderNovel(name: string, data: any, story: any, concern: string): string {
  const safeName = escapeHtml(name)
  const safeConcern = escapeHtml(concern)
  return `
    <div class="result-container">
      <header class="result-header">
        <p class="result-label">Fate Decoder</p>
        <h1 class="result-name">${safeName} さんへの<br>Grand Master's Reading</h1>
      </header>

      <section class="data-section">
        <h2 class="section-title">あなたの診断データ</h2>
        ${safeConcern ? `<div class="concern-box">
          <div class="concern-label">ご相談内容</div>
          <div class="concern-text">「${safeConcern}」</div>
        </div>` : ''}
        <div class="data-grid">
          <div class="data-card">
            <span class="data-label">KIN番号</span>
            <span class="data-sublabel">マヤ暦</span>
            <span class="data-value">${data.maya.kin}</span>
          </div>
          <div class="data-card">
            <span class="data-label">太陽の紋章</span>
            <span class="data-sublabel">表の自分</span>
            <span class="data-value">${data.maya.glyph}</span>
          </div>
          <div class="data-card">
            <span class="data-label">ウェイブスペル</span>
            <span class="data-sublabel">内なる自分</span>
            <span class="data-value">${data.maya.ws}</span>
          </div>
          <div class="data-card">
            <span class="data-label">銀河の音</span>
            <span class="data-sublabel">役割・才能</span>
            <span class="data-value">${data.maya.tone}</span>
          </div>
          <div class="data-card">
            <span class="data-label">ライフパス</span>
            <span class="data-sublabel">数秘術</span>
            <span class="data-value">${data.numerology.lp}</span>
          </div>
          <div class="data-card">
            <span class="data-label">中心星</span>
            <span class="data-sublabel">算命学</span>
            <span class="data-value">${data.bazi.weapon}</span>
          </div>
          <div class="data-card">
            <span class="data-label">日柱</span>
            <span class="data-sublabel">四柱推命</span>
            <span class="data-value">${data.sanmeigaku.day}</span>
          </div>
          <div class="data-card">
            <span class="data-label">月柱</span>
            <span class="data-sublabel">四柱推命</span>
            <span class="data-value">${data.sanmeigaku.month}</span>
          </div>
          <div class="data-card">
            <span class="data-label">年柱</span>
            <span class="data-sublabel">四柱推命</span>
            <span class="data-value">${data.sanmeigaku.year}</span>
          </div>
          <div class="data-card">
            <span class="data-label">星座</span>
            <span class="data-sublabel">西洋占星術</span>
            <span class="data-value">${data.western.sign}</span>
          </div>
          <div class="data-card">
            <span class="data-label">宿曜</span>
            <span class="data-sublabel">東洋の星座</span>
            <span class="data-value">${data.sukuyo}</span>
          </div>
        </div>
      </section>

      ${renderSection(story.prologue)}
      ${story.chapters ? story.chapters.map((chapter: any) => renderSection(chapter)).join('\n') : ''}

      <section class="chapter-section final-section">
        <span class="chapter-tag">${escapeHtml(story.final?.tag || '#まとめ')}</span>
        <h2 class="chapter-title">${escapeHtml(story.final?.title || 'これからのあなたへ')}</h2>
        <div class="chapter-text">
          <p>${escapeHtml(story.final?.text || 'あなたの可能性は、あなた自身の選択で広がっていきます。').replace(/\n/g, '<br>')}</p>
          <div class="magic-box">
            <span class="magic-title">今日からできるアクション</span>
            <strong>${escapeHtml(story.final?.magic || '自分を信じて一歩踏み出す')}</strong>
          </div>
        </div>
      </section>

      <footer class="result-footer">
        <p>Fate Decoder - AIパーソナルリーディング</p>
      </footer>
    </div>
  `
}

function renderSection(part: any) {
  if (!part) return ""
  return `
    <section class="chapter-section">
      <span class="chapter-tag">${escapeHtml(part.tag || '#章')}</span>
      <h2 class="chapter-title">${escapeHtml(part.title || '章')}</h2>
      <div class="chapter-text"><p>${escapeHtml(part.text || '').replace(/\n/g, '<br>')}</p></div>
    </section>`
}

function renderPreview(name: string, data: any, concern: string): string {
  const safeName = escapeHtml(name)
  const safeConcern = escapeHtml(concern)
  return `
    <div class="result-container">
      <header class="result-header">
        <p class="result-label">Fate Decoder</p>
        <h1 class="result-name">${safeName} さんの<br>診断データ</h1>
        ${safeConcern ? `<p class="preview-concern">「${safeConcern}」</p>` : ''}
      </header>

      <div class="preview-notice">
        <h2>診断データの算出が完了しました</h2>
        <p>AIによるレポート作成は現在利用上限に達しています。<br/>以下の指標は正常に計算されています。</p>
        <div class="preview-cta">
          <p><strong>明日以降に再度お試しいただくと、</strong><br/>これらのデータをもとにAIが6000文字超の詳細レポートを作成します。</p>
        </div>
      </div>

      <section class="data-section">
        <div class="data-grid">
          <div class="data-card"><span class="data-label">KIN番号</span><span class="data-sublabel">マヤ暦</span><span class="data-value">${data.maya.kin}</span></div>
          <div class="data-card"><span class="data-label">太陽の紋章</span><span class="data-sublabel">表の自分</span><span class="data-value">${data.maya.glyph}</span></div>
          <div class="data-card"><span class="data-label">ウェイブスペル</span><span class="data-sublabel">内なる自分</span><span class="data-value">${data.maya.ws}</span></div>
          <div class="data-card"><span class="data-label">銀河の音</span><span class="data-sublabel">役割・才能</span><span class="data-value">${data.maya.tone}</span></div>
          <div class="data-card"><span class="data-label">ライフパス</span><span class="data-sublabel">数秘術</span><span class="data-value">${data.numerology.lp}</span></div>
          <div class="data-card"><span class="data-label">中心星</span><span class="data-sublabel">算命学</span><span class="data-value">${data.bazi.weapon}</span></div>
          <div class="data-card"><span class="data-label">日柱</span><span class="data-sublabel">四柱推命</span><span class="data-value">${data.sanmeigaku.day}</span></div>
          <div class="data-card"><span class="data-label">月柱</span><span class="data-sublabel">四柱推命</span><span class="data-value">${data.sanmeigaku.month}</span></div>
          <div class="data-card"><span class="data-label">年柱</span><span class="data-sublabel">四柱推命</span><span class="data-value">${data.sanmeigaku.year}</span></div>
          <div class="data-card"><span class="data-label">星座</span><span class="data-sublabel">西洋占星術</span><span class="data-value">${data.western.sign}</span></div>
          <div class="data-card"><span class="data-label">宿曜</span><span class="data-sublabel">東洋の星座</span><span class="data-value">${data.sukuyo}</span></div>
        </div>
      </section>

      <footer class="result-footer">
        <p>Fate Decoder - AIパーソナルリーディング</p>
      </footer>
    </div>
  `
}
