import { NextRequest, NextResponse } from 'next/server'

interface StoryChapter {
  tag: string
  title: string
  text: string
  magic?: string
}

interface StoryData {
  prologue?: StoryChapter
  chapters?: StoryChapter[]
  final?: StoryChapter
}

function createStoryBlocks(story: StoryData) {
  const blocks: any[] = []

  const addChapter = (chapter: StoryChapter | undefined) => {
    if (!chapter) return

    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [{ type: 'text', text: { content: chapter.tag } }],
        icon: { type: 'emoji', emoji: '⭐' },
        color: 'yellow_background'
      }
    })

    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: chapter.title }, annotations: { bold: true } }],
        color: 'default'
      }
    })

    const paragraphs = chapter.text.split('\n\n').filter(p => p.trim())
    paragraphs.forEach(para => {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: para.trim() } }]
        }
      })
    })

    if (chapter.magic) {
      blocks.push({
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{ type: 'text', text: { content: `🔮 魔法のアクション: ${chapter.magic}` } }],
          icon: { type: 'emoji', emoji: '🔮' },
          color: 'purple_background'
        }
      })
    }

    blocks.push({
      object: 'block',
      type: 'divider',
      divider: {}
    })
  }

  addChapter(story.prologue)
  if (story.chapters && Array.isArray(story.chapters)) {
    story.chapters.forEach(chapter => addChapter(chapter))
  }
  addChapter(story.final)

  return blocks
}

function createTarotBlocks(tarotData: { cards: Array<{ position: string; name: string; keyword: string; message: string }> }) {
  const blocks: any[] = []

  blocks.push({
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: [{ type: 'text', text: { content: 'Tarot Reading' }, annotations: { bold: true } }]
    }
  })

  tarotData.cards.forEach((card, i) => {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: `${String(i + 1).padStart(2, '0')} ${card.position}` }, annotations: { bold: true } }]
      }
    })

    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [{ type: 'text', text: { content: `${card.name} — ${card.keyword}` } }],
        icon: { type: 'emoji', emoji: '🃏' },
        color: 'purple_background'
      }
    })

    if (card.message) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: card.message } }]
        }
      })
    }

    blocks.push({ object: 'block', type: 'divider', divider: {} })
  })

  return blocks
}

function createShortBlocks(shortData: { oneWord: string; personality: string; relationships: string; talent: string; action: string; luckyItem: string }) {
  const blocks: any[] = []

  blocks.push({
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: [{ type: 'text', text: { content: 'Short Reading' }, annotations: { bold: true } }]
    }
  })

  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: `あなたを一言で: ${shortData.oneWord}` } }],
      icon: { type: 'emoji', emoji: '✨' },
      color: 'yellow_background'
    }
  })

  const sections = [
    { title: '性格の核心', text: shortData.personality, emoji: '⭐' },
    { title: '人間関係', text: shortData.relationships, emoji: '💕' },
    { title: '才能・仕事', text: shortData.talent, emoji: '🌟' },
  ]

  sections.forEach(s => {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: s.title }, annotations: { bold: true } }]
      }
    })
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: s.text } }]
      }
    })
    blocks.push({ object: 'block', type: 'divider', divider: {} })
  })

  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: `🔮 今日のアクション: ${shortData.action}` } }],
      icon: { type: 'emoji', emoji: '🔮' },
      color: 'purple_background'
    }
  })

  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: `🍀 ラッキーアイテム: ${shortData.luckyItem}` } }],
      icon: { type: 'emoji', emoji: '🍀' },
      color: 'green_background'
    }
  })

  return blocks
}

function createCompatBlocks(compatData: {
  name2: string; type: string; totalScore: number;
  scores: Array<{ label: string; score: number; detail: string }>;
  story: { attraction: string; caution: string; advice: string; loveStory?: string; businessStory?: string; friendStory?: string }
}) {
  const blocks: any[] = []

  blocks.push({
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: [{ type: 'text', text: { content: `Compatibility — ${compatData.type}` }, annotations: { bold: true } }]
    }
  })

  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: `総合相性スコア: ${compatData.totalScore}点` } }],
      icon: { type: 'emoji', emoji: '💯' },
      color: 'yellow_background'
    }
  })

  // 各占術スコア
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ type: 'text', text: { content: '占術別スコア' }, annotations: { bold: true } }]
    }
  })

  compatData.scores.forEach(s => {
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: `${s.label}: ${s.score}点 — ${s.detail}` } }]
      }
    })
  })

  blocks.push({ object: 'block', type: 'divider', divider: {} })

  // ストーリーセクション
  const storySections = [
    { title: '惹かれ合うポイント', text: compatData.story.attraction, emoji: '💕' },
    { title: 'すれ違いやすいポイント', text: compatData.story.caution, emoji: '⚠️' },
    { title: 'ふたりへのアドバイス', text: compatData.story.advice, emoji: '✨' },
  ]

  if (compatData.story.loveStory) {
    storySections.push({ title: '恋愛の相性', text: compatData.story.loveStory, emoji: '❤️' })
  }
  if (compatData.story.businessStory) {
    storySections.push({ title: 'ビジネスの相性', text: compatData.story.businessStory, emoji: '💼' })
  }
  if (compatData.story.friendStory) {
    storySections.push({ title: '友情の相性', text: compatData.story.friendStory, emoji: '🤝' })
  }

  storySections.forEach(s => {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: s.title }, annotations: { bold: true } }]
      }
    })
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: s.text } }]
      }
    })
    blocks.push({ object: 'block', type: 'divider', divider: {} })
  })

  return blocks
}

function getModeEmoji(mode: string): string {
  switch (mode) {
    case 'full': return '📖'
    case 'tarot': return '🃏'
    case 'short': return '⚡'
    case 'compatibility': return '💑'
    default: return '✨'
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const NOTION_API_KEY = process.env.NOTION_API_KEY
    if (!NOTION_API_KEY) {
      console.error('[Notion API Route] NOTION_API_KEY is not configured')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }
    const DATABASE_ID = process.env.NOTION_DATABASE_ID
    if (!DATABASE_ID) {
      console.error('[Notion API Route] NOTION_DATABASE_ID is not configured')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const mode = data.mode || 'full'
    console.log(`[Notion API Route] Saving ${mode} data for:`, data.name)

    // モード別のページコンテンツ（children blocks）
    let children: any[] = []
    if (mode === 'full' && data.story) {
      children = createStoryBlocks(data.story)
    } else if (mode === 'tarot' && data.tarotData) {
      children = createTarotBlocks(data.tarotData)
    } else if (mode === 'short' && data.shortData) {
      children = createShortBlocks(data.shortData)
    } else if (mode === 'compatibility' && data.compatData) {
      children = createCompatBlocks(data.compatData)
    }

    // タイトル（モード別）
    let titleText = data.name || ''
    if (mode === 'compatibility' && data.name2) {
      titleText = `${data.name} × ${data.name2}`
    }

    // 共通プロパティ
    const properties: any = {
      '名前': {
        title: [{ type: 'text', text: { content: titleText } }]
      },
      '生年月日': {
        date: { start: data.birthDate }
      },
      '診断モード': {
        select: { name: mode === 'full' ? 'Full Reading' : mode === 'tarot' ? 'Tarot Reading' : mode === 'short' ? 'Short Reading' : 'Compatibility' }
      },
      'KIN番号': {
        number: typeof data.kin === 'number' ? data.kin : parseInt(data.kin) || 0
      },
      '太陽の紋章': {
        rich_text: [{ type: 'text', text: { content: data.glyph || '' } }]
      },
      '音': {
        number: typeof data.tone === 'number' ? data.tone : parseInt(data.tone) || 0
      },
      'ウェイブスペル': {
        rich_text: [{ type: 'text', text: { content: data.ws || '' } }]
      },
      '日干': {
        rich_text: [{ type: 'text', text: { content: data.stem || '' } }]
      },
      '中心星': {
        rich_text: [{ type: 'text', text: { content: data.weapon || '' } }]
      },
      'Life Path': {
        rich_text: [{ type: 'text', text: { content: data.lp || '' } }]
      },
      '星座': {
        rich_text: [{ type: 'text', text: { content: data.sign || '' } }]
      },
      '宿曜': {
        rich_text: [{ type: 'text', text: { content: data.sukuyo || '' } }]
      },
      '診断日時': {
        date: { start: new Date().toISOString() }
      }
    }

    // Full Reading のみの追加プロパティ
    if (mode === 'full') {
      properties['出生時間'] = {
        rich_text: [{ type: 'text', text: { content: data.birthTime || '' } }]
      }
      properties['血液型'] = {
        select: { name: data.bloodType || 'A' }
      }
      properties['出生地'] = {
        rich_text: [{ type: 'text', text: { content: data.birthPlace || '' } }]
      }
      properties['相談内容'] = {
        rich_text: [{ type: 'text', text: { content: data.concern || '' } }]
      }
    }

    // Compatibility の追加プロパティ
    if (mode === 'compatibility' && data.name2) {
      properties['相手の名前'] = {
        rich_text: [{ type: 'text', text: { content: data.name2 } }]
      }
      properties['相手の生年月日'] = {
        rich_text: [{ type: 'text', text: { content: data.birthDate2 || '' } }]
      }
      properties['相性タイプ'] = {
        select: { name: data.compatType || 'general' }
      }
      properties['相性スコア'] = {
        number: data.totalScore || 0
      }
    }

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { database_id: DATABASE_ID },
        icon: { type: 'emoji', emoji: getModeEmoji(mode) },
        children,
        properties
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Notion API Error] Status: ${response.status}, Body: ${errorText}`)
      return NextResponse.json(
        { success: false, error: `Notion API Error: ${response.status}` },
        { status: 500 }
      )
    }

    const result = await response.json()
    console.log(`[Notion API Route] Saved ${mode} successfully, pageId:`, result.id)
    return NextResponse.json({ success: true, pageId: result.id })
  } catch (error) {
    console.error('[Notion API Route Exception]', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
