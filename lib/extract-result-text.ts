// クライアントサイド専用。SSR/RSC で呼ぶと document が存在せず空文字を返す。
// 入力 HTML は app/page.tsx の renderNovel が escapeHtml 経由で生成しているため XSS 安全。
export function htmlToPlainText(html: string): string {
  if (!html) return ''
  if (typeof document === 'undefined') return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  tmp.querySelectorAll('script, style, svg, button, .action-bar').forEach(n => n.remove())
  const text = tmp.innerText || tmp.textContent || ''
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

interface ShortReadingLike {
  name: string
  oneWord: string
  personality: string
  relationships: string
  talent: string
  action: string
  luckyItem: string
}

export function buildShortReadingText(r: ShortReadingLike): string {
  return [
    `${r.name}さんのショートリーディングです。`,
    `あなたを一言で表すなら、${r.oneWord}。`,
    `性格の核心。${r.personality}`,
    `人間関係について。${r.relationships}`,
    `才能と仕事について。${r.talent}`,
    `今日からできるアクション。${r.action}`,
    `ラッキーアイテムは、${r.luckyItem}です。`,
  ].join('\n\n')
}

interface CompatStoryLike {
  name1: string
  name2: string
  type: 'love' | 'business' | 'general'
  story: {
    attraction: string
    caution: string
    advice: string
    loveStory?: string
    businessStory?: string
    friendStory?: string
  }
}

export function buildCompatText(c: CompatStoryLike): string {
  const parts: string[] = [
    `${c.name1}さんと${c.name2}さんの相性診断です。`,
    `惹かれ合うポイント。${c.story.attraction}`,
    `すれ違いやすいポイント。${c.story.caution}`,
  ]
  if (c.type === 'general') {
    if (c.story.loveStory) parts.push(`恋愛の相性。${c.story.loveStory}`)
    if (c.story.businessStory) parts.push(`ビジネスの相性。${c.story.businessStory}`)
    if (c.story.friendStory) parts.push(`友情の相性。${c.story.friendStory}`)
  }
  parts.push(`ふたりへのアドバイス。${c.story.advice}`)
  return parts.join('\n\n')
}

interface TarotLike {
  userName: string
  spread: Array<{ position: { label: string; description: string }; card: { name: string; keyword: string; meaning: string } }>
  messages: string[]
  allRevealed: boolean
}

export function buildTarotText(t: TarotLike): string {
  if (!t.allRevealed) return ''
  const parts: string[] = [`${t.userName}さんへのタロットリーディングです。`]
  t.spread.forEach((slot, i) => {
    const msg = t.messages[i] || slot.card.meaning
    parts.push(`${i + 1}枚目、${slot.position.label}。カードは${slot.card.name}、${slot.card.keyword}。${msg}`)
  })
  parts.push(`${t.spread.length}枚のカードが、あなたの本質、今の流れ、そして導きを語っています。`)
  return parts.join('\n\n')
}
