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

// Notion API limits: rich_text content max 2000 chars
function truncate(str: string, max = 2000): string {
  if (str.length <= max) return str
  return str.slice(0, max - 1) + '…'
}

function createStoryBlocks(story: StoryData) {
  const blocks: any[] = []

  const addChapter = (chapter: StoryChapter | undefined) => {
    if (!chapter) return

    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [{ type: 'text', text: { content: truncate(chapter.tag) } }],
        icon: { type: 'emoji', emoji: '⭐' },
        color: 'yellow_background'
      }
    })

    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: truncate(chapter.title) }, annotations: { bold: true } }],
        color: 'default'
      }
    })

    const paragraphs = chapter.text.split('\n\n').filter(p => p.trim())
    paragraphs.forEach(para => {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: truncate(para.trim()) } }]
        }
      })
    })

    if (chapter.magic) {
      blocks.push({
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{ type: 'text', text: { content: truncate(`🔮 魔法のアクション: ${chapter.magic}`) } }],
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

  // Notion API limits: max 100 children blocks per request
  return blocks.slice(0, 100)
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const NOTION_API_KEY = process.env.NOTION_API_KEY
    const DATABASE_ID = process.env.NOTION_DATABASE_ID

    if (!NOTION_API_KEY || !DATABASE_ID) {
      console.error('[Notion API Route] Missing NOTION_API_KEY or NOTION_DATABASE_ID env var')
      return NextResponse.json(
        { success: false, error: 'Notion configuration missing' },
        { status: 500 }
      )
    }

    console.log('[Notion API Route] Saving data for:', data.name)

    const storyBlocks = data.story ? createStoryBlocks(data.story) : []
    console.log(`[Notion API Route] Story blocks count: ${storyBlocks.length}`)

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { database_id: DATABASE_ID },
        icon: { type: 'emoji', emoji: '✨' },
        children: storyBlocks,
        properties: {
          '名前': {
            title: [{ type: 'text', text: { content: data.name || '' } }]
          },
          '生年月日': {
            date: { start: data.birthDate }
          },
          '出生時間': {
            rich_text: [{ type: 'text', text: { content: data.birthTime || '' } }]
          },
          '血液型': {
            select: { name: data.bloodType || 'A' }
          },
          '出生地': {
            rich_text: [{ type: 'text', text: { content: truncate(data.birthPlace || '') } }]
          },
          '相談内容': {
            rich_text: [{ type: 'text', text: { content: truncate(data.concern || '') } }]
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
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Notion API Error] Status: ${response.status}, Body: ${errorText}`)
      return NextResponse.json(
        { success: false, error: `Notion API Error: ${response.status}`, detail: errorText },
        { status: 500 }
      )
    }

    const result = await response.json()
    console.log('[Notion API Route] Saved successfully, pageId:', result.id)
    return NextResponse.json({ success: true, pageId: result.id })
  } catch (error) {
    console.error('[Notion API Route Exception]', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
