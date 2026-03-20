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
    const DATABASE_ID = process.env.NOTION_DATABASE_ID || '2f50f0fdafad80c89c82d9260ce171f2'

    console.log('[Notion API Route] Saving data for:', data.name)

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
        children: data.story ? createStoryBlocks(data.story) : [],
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
            rich_text: [{ type: 'text', text: { content: data.birthPlace || '' } }]
          },
          '相談内容': {
            rich_text: [{ type: 'text', text: { content: data.concern || '' } }]
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
        { success: false, error: `Notion API Error: ${response.status}` },
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
