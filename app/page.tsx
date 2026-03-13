'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { generateStory } from './actions'
import { fetchStoryFromNotion } from './notion-actions'
import { calculateAll } from '../lib/fortune-calc'
import { generateTarotSpread, type TarotSpreadCard } from '../lib/tarot-data'


// ========================================
// 2. React UI - モダン・ミニマルデザイン
// ========================================

export type ReadingMode = 'full' | 'tarot' | 'short'

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
}

export default function FateDecoder() {
  const [screen, setScreen] = useState<'mode-select' | 'input' | 'loading' | 'result' | 'tarot-result' | 'short-result'>('mode-select')
  const [readingMode, setReadingMode] = useState<ReadingMode>('full')
  const [tarotSpread, setTarotSpread] = useState<TarotSpreadCard[]>([])
  const [tarotMessages, setTarotMessages] = useState<string[]>([])
  const [flippedCards, setFlippedCards] = useState<boolean[]>([])
  const [allRevealed, setAllRevealed] = useState(false)
  const [tarotUserName, setTarotUserName] = useState('')
  const [shortResult, setShortResult] = useState<{ data: any; name: string; summary: string; action: string; oneWord: string } | null>(null)
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

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      const ua = navigator.userAgent
      setIsInAppBrowser(/Line|FBAV|FBAN|Instagram|Twitter|Snapchat|WeChat|WhatsApp|Telegram/i.test(ua))
    }
  }, [])

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
    if (!formData.name || !formData.year || !formData.month || !formData.day) {
      alert('お名前と生年月日を入力してください。')
      return
    }
    if (!consentChecked) {
      alert('診断結果の保存にご同意ください。')
      return
    }
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
・算命学: 日干[${data.bazi.stem}] / 中心星[${data.bazi.weapon}]
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
      setTarotMessages(messages.length === spread.length ? messages : spread.map(s => s.card.meaning))
      setScreen('tarot-result')
      setTimeout(() => window.scrollTo(0, 0), 100)

    } catch {
      alert('診断中にエラーが発生しました。もう一度お試しください。')
      setScreen('input')
    }
  }

  const handleShortSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.year || !formData.month || !formData.day) {
      alert('お名前と生年月日を入力してください。')
      return
    }
    if (!consentChecked) {
      alert('診断結果の保存にご同意ください。')
      return
    }
    setScreen('loading')

    try {
      const data = calculateAll(parseInt(formData.year), parseInt(formData.month), parseInt(formData.day))

      const shortPrompt = `
あなたは占術データを読み解くプロの鑑定士です。
6つの占術データから、この人の「核心」だけを短く鋭く伝えてください。

【対象者】
${formData.name} (${formData.year}年${formData.month}月${formData.day}日生まれ)

【占術データ】
・マヤ暦: KIN${data.maya.kin} / 太陽の紋章:${data.maya.glyph} / 銀河の音:${data.maya.tone} / ウェイブスペル:${data.maya.ws}
・算命学: 日干[${data.bazi.stem}] / 中心星[${data.bazi.weapon}]
・数秘術: ライフパスナンバー[${data.numerology.lp}]
・西洋占星術: ${data.western.sign}
・宿曜: ${data.sukuyo}

【相談内容】
「${formData.concern || '特になし'}」

【執筆ルール】
1. summaryは300〜400文字。この人の本質を3つの視点（性格の核心・人間関係の特徴・仕事/才能の方向性）で簡潔に伝える
2. 「〜ではないでしょうか」のような問いかけを1つ入れる
3. 占術データの具体的な要素を自然に2〜3個織り込む（例：「マヤ暦の"赤い竜"を持つあなたは…」）
4. 相談内容があればそれに対する短い回答を含める
5. actionは「今日からできる具体的な行動」を1つ、15〜30文字で
6. oneWordは「あなたを一言で表すなら」を10文字以内で
7. **必ず純粋なJSON形式で出力**

【出力フォーマット】
{ "summary": "要約テキスト", "action": "具体的なアクション", "oneWord": "一言キーワード" }
`

      let summary = ''
      let action = '自分を信じて一歩踏み出す'
      let oneWord = '探求者'
      try {
        const resultText = await generateStory(shortPrompt)
        let cleanJson = resultText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
        cleanJson = cleanJson.replace(/^\uFEFF/, '').replace(/^[\s\uFEFF\xA0]+/, '')
        const firstBrace = cleanJson.indexOf('{')
        if (firstBrace !== -1) cleanJson = cleanJson.substring(firstBrace)
        const lastBrace = cleanJson.lastIndexOf('}')
        if (lastBrace !== -1) cleanJson = cleanJson.substring(0, lastBrace + 1)
        const parsed = JSON.parse(cleanJson)
        summary = parsed.summary || ''
        action = parsed.action || action
        oneWord = parsed.oneWord || oneWord
      } catch {
        summary = `${data.maya.glyph}の紋章と${data.western.sign}を持つあなたは、${data.bazi.weapon}の力で道を切り開く人。直感と論理のバランスが取れた、稀有な存在です。`
      }

      setShortResult({ data, name: formData.name, summary, action, oneWord })
      setScreen('short-result')
      setTimeout(() => window.scrollTo(0, 0), 100)

    } catch {
      alert('診断中にエラーが発生しました。もう一度お試しください。')
      setScreen('input')
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
    if (!formData.name || !formData.year || !formData.month || !formData.day) {
      alert('お名前と生年月日を入力してください。')
      return
    }
    if (!consentChecked) {
      alert('診断結果の保存にご同意ください。')
      return
    }
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
・算命学: 日干[${data.bazi.stem}] / 中心星[${data.bazi.weapon}]
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
      setScreen('result')
      setTimeout(() => window.scrollTo(0, 0), 100)

      fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name, birthDate, birthTime,
          bloodType: formData.bloodType, birthPlace: formData.birthPlace,
          concern: formData.concern, kin: data.maya.kin, glyph: data.maya.glyph,
          tone: toneNumber, ws: data.maya.ws, stem: data.bazi.stem,
          weapon: data.bazi.weapon, lp: data.numerology.lp, sign: data.western.sign,
          sukuyo: data.sukuyo, story
        })
      }).then(res => res.json()).then(notionResult => {
        if (notionResult.success && notionResult.pageId) {
          window.history.replaceState({}, '', `${window.location.pathname}?notionId=${notionResult.pageId}`)
        } else {
          console.error('[Notion Save Failed]', notionResult.error)
        }
      }).catch((err) => console.error('[Notion Save Error]', err))

    } catch (e) {
      clearTimeout(timeoutId)
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

  const handlePrintOrDownload = async () => {
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
        const el = document.getElementById('result-screen')
        if (!el) return
        const canvas = await (window as any).html2canvas(el, { scale: 2 })
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
        pdf.save('fate-decoder-result.pdf')
        setIsDownloadingPDF(false)
      } catch {
        setIsDownloadingPDF(false)
        alert('PDF保存に失敗しました。\n\nブラウザの印刷機能 (Ctrl+P / Cmd+P) から「PDFとして保存」をお試しください。')
      }
    } else {
      window.print()
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
    setScreen('input')
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
          <p className="input-credit">produced by SATOYAMA AI BASE</p>
        </div>
      )}

      {isProcessingInBackground && (
        <div className="bg-banner">
          <div className="bg-banner-title">AIが文章を作成しています...</div>
          <div className="bg-banner-desc">完了したら自動的に結果が表示されます</div>
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
              <button type="submit" className="submit-btn">診断する</button>
            </form>
          </div>
          <p className="input-footer">マヤ暦・算命学・数秘術・西洋占星術・宿曜・四柱推命の6つの占術を用いてリーディングします。</p>
          <p className="input-credit">produced by SATOYAMA AI BASE</p>
        </div>
      )}

      {screen === 'tarot-result' && (
        <div className="tarot-result-screen">
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
            <button onClick={handleShare} className="fab fab-share" title="シェア">
              共有
            </button>
          </div>
        </div>
      )}

      {screen === 'short-result' && shortResult && (
        <div className="short-result-screen">
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
              <div className="data-card"><span className="data-label">日干</span><span className="data-sublabel">生まれ持った性質</span><span className="data-value">{shortResult.data.bazi.stem}</span></div>
              <div className="data-card"><span className="data-label">中心星</span><span className="data-sublabel">行動パターン</span><span className="data-value">{shortResult.data.bazi.weapon}</span></div>
              <div className="data-card"><span className="data-label">星座</span><span className="data-sublabel">西洋占星術</span><span className="data-value">{shortResult.data.western.sign}</span></div>
              <div className="data-card"><span className="data-label">宿曜</span><span className="data-sublabel">東洋の星座</span><span className="data-value">{shortResult.data.sukuyo}</span></div>
            </div>
          </section>

          <section className="short-summary">
            <div className="short-summary-inner">
              <h2 className="short-summary-title">あなたの本質</h2>
              <p className="short-summary-text">{shortResult.summary}</p>
            </div>
          </section>

          <section className="short-action">
            <div className="short-action-inner">
              <span className="short-action-label">今日からできるアクション</span>
              <span className="short-action-value">{shortResult.action}</span>
            </div>
          </section>

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
            <button onClick={handlePrintOrDownload} className="fab fab-print" title={isDownloadingPDF ? 'PDF生成中...' : '印刷/PDF保存'} disabled={isDownloadingPDF}>
              {isDownloadingPDF ? '...' : '印刷'}
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

function renderNovel(name: string, data: any, story: any, concern: string): string {
  return `
    <div class="result-container">
      <header class="result-header">
        <p class="result-label">Fate Decoder</p>
        <h1 class="result-name">${name} さんへの<br>Grand Master's Reading</h1>
      </header>

      <section class="data-section">
        <h2 class="section-title">あなたの診断データ</h2>
        ${concern ? `<div class="concern-box">
          <div class="concern-label">ご相談内容</div>
          <div class="concern-text">「${concern}」</div>
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
            <span class="data-label">日干</span>
            <span class="data-sublabel">生まれ持った性質</span>
            <span class="data-value">${data.bazi.stem}</span>
          </div>
          <div class="data-card">
            <span class="data-label">中心星</span>
            <span class="data-sublabel">行動パターン</span>
            <span class="data-value">${data.bazi.weapon}</span>
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
        <span class="chapter-tag">${story.final?.tag || '#まとめ'}</span>
        <h2 class="chapter-title">${story.final?.title || 'これからのあなたへ'}</h2>
        <div class="chapter-text">
          <p>${(story.final?.text || 'あなたの可能性は、あなた自身の選択で広がっていきます。').replace(/\n/g, '<br>')}</p>
          <div class="magic-box">
            <span class="magic-title">今日からできるアクション</span>
            <strong>${story.final?.magic || '自分を信じて一歩踏み出す'}</strong>
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
      <span class="chapter-tag">${part.tag || '#章'}</span>
      <h2 class="chapter-title">${part.title || '章'}</h2>
      <div class="chapter-text"><p>${(part.text || '').replace(/\n/g, '<br>')}</p></div>
    </section>`
}

function renderPreview(name: string, data: any, concern: string): string {
  return `
    <div class="result-container">
      <header class="result-header">
        <p class="result-label">Fate Decoder</p>
        <h1 class="result-name">${name} さんの<br>診断データ</h1>
        ${concern ? `<p class="preview-concern">「${concern}」</p>` : ''}
      </header>

      <div class="preview-notice">
        <h2>診断データの算出が完了しました</h2>
        <p>AIによるレポート作成は現在利用上限に達しています。<br/>以下の9つの指標は正常に計算されています。</p>
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
          <div class="data-card"><span class="data-label">日干</span><span class="data-sublabel">生まれ持った性質</span><span class="data-value">${data.bazi.stem}</span></div>
          <div class="data-card"><span class="data-label">中心星</span><span class="data-sublabel">行動パターン</span><span class="data-value">${data.bazi.weapon}</span></div>
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
