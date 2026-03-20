'use server'

function createStoryBlocks(story: StoryData) {
  const blocks: any[] = []

  // Helper function to add a chapter
  const addChapter = (chapter: { tag: string; title: string; text: string; magic?: string } | undefined) => {
    if (!chapter) return
    
    // Add tag as callout
    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [{ type: 'text', text: { content: chapter.tag } }],
        icon: { type: 'emoji', emoji: '⭐' },
        color: 'yellow_background'
      }
    })
    
    // Add title as heading
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: chapter.title }, annotations: { bold: true } }],
        color: 'default'
      }
    })
    
    // Split text into paragraphs and add them
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
    
    // Add magic action if exists
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
    
    // Add divider
    blocks.push({
      object: 'block',
      type: 'divider',
      divider: {}
    })
  }

  // Add prologue
  addChapter(story.prologue)
  
  // Add flexible chapters array
  if (story.chapters && Array.isArray(story.chapters)) {
    story.chapters.forEach(chapter => addChapter(chapter))
  }
  
  // Add final chapter
  addChapter(story.final)

  return blocks
}

interface StoryData {
  prologue?: { tag: string; title: string; text: string }
  chapters?: Array<{ tag: string; title: string; text: string }>
  final?: { tag: string; title: string; text: string; magic?: string }
}

export async function fetchStoryFromNotion(pageId: string) {
  try {
    const NOTION_API_KEY = process.env.NOTION_API_KEY
    if (!NOTION_API_KEY) {
      throw new Error('Notion API key is not configured')
    }

    // Fetch page blocks
    const response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28'
      }
    })

    if (!response.ok) {
      throw new Error(`Notion API Error: ${response.status}`)
    }

    const data = await response.json()
    const blocks = data.results

    // Parse blocks back into story structure
    const story: any = { chapters: [] }
    let currentChapter: any = null

    for (const block of blocks) {
      if (block.type === 'callout' && block.callout.rich_text[0]?.text.content.startsWith('#')) {
        // Save previous chapter
        if (currentChapter) {
          if (currentChapter.title.includes('プロローグ') || currentChapter.title.includes('序章')) {
            story.prologue = currentChapter
          } else if (currentChapter.title.includes('最終章') || currentChapter.title.includes('未来への神託')) {
            story.final = currentChapter
          } else {
            story.chapters.push(currentChapter)
          }
        }
        // Start new chapter
        currentChapter = { tag: block.callout.rich_text[0].text.content, title: '', text: '' }
      } else if (block.type === 'heading_2' && currentChapter) {
        currentChapter.title = block.heading_2.rich_text[0]?.text.content || ''
      } else if (block.type === 'paragraph' && currentChapter) {
        const text = block.paragraph.rich_text[0]?.text.content || ''
        currentChapter.text += (currentChapter.text ? '\n\n' : '') + text
      } else if (block.type === 'callout' && block.callout.rich_text[0]?.text.content.includes('魔法のアクション')) {
        if (currentChapter) {
          const magicText = block.callout.rich_text[0].text.content
          currentChapter.magic = magicText.replace('🔮 魔法のアクション: ', '')
        }
      }
    }

    // Save last chapter
    if (currentChapter) {
      if (currentChapter.title.includes('最終章') || currentChapter.title.includes('未来への神託')) {
        story.final = currentChapter
      } else {
        story.chapters.push(currentChapter)
      }
    }

    return { success: true, story }
  } catch (error) {
    // Failed to fetch from Notion
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function saveToNotion(data: {
  name: string
  birthDate: string
  birthTime?: string
  bloodType: string
  birthPlace: string
  concern: string
  kin: number
  glyph: string
  tone: number
  ws: string
  stem: string
  weapon: string
  lp: string
  sign: string
  sukuyo: string
  story?: StoryData
}) {
  try {
    const NOTION_API_KEY = process.env.NOTION_API_KEY
    if (!NOTION_API_KEY) {
      throw new Error('Notion API key is not configured')
    }
    const DATABASE_ID = process.env.NOTION_DATABASE_ID || '2f50f0fdafad80c89c82d9260ce171f2'
    
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
            title: [
              {
                type: 'text',
                text: { content: data.name }
              }
            ]
          },
          '生年月日': {
            date: { start: data.birthDate }
          },
          '出生時間': {
            rich_text: [
              {
                type: 'text',
                text: { content: data.birthTime || '' }
              }
            ]
          },
          '血液型': {
            select: { name: data.bloodType }
          },
          '出生地': {
            rich_text: [
              {
                type: 'text',
                text: { content: data.birthPlace || '' }
              }
            ]
          },
          '相談内容': {
            rich_text: [
              {
                type: 'text',
                text: { content: data.concern || '' }
              }
            ]
          },
          'KIN番号': {
            number: data.kin
          },
          '太陽の紋章': {
            rich_text: [
              {
                type: 'text',
                text: { content: data.glyph }
              }
            ]
          },
          '音': {
            number: data.tone
          },
          'ウェイブスペル': {
            rich_text: [
              {
                type: 'text',
                text: { content: data.ws }
              }
            ]
          },
          '日干': {
            rich_text: [
              {
                type: 'text',
                text: { content: data.stem }
              }
            ]
          },
          '中心星': {
            rich_text: [
              {
                type: 'text',
                text: { content: data.weapon }
              }
            ]
          },
          'Life Path': {
            rich_text: [
              {
                type: 'text',
                text: { content: data.lp }
              }
            ]
          },
          '星座': {
            rich_text: [
              {
                type: 'text',
                text: { content: data.sign }
              }
            ]
          },
          '宿曜': {
            rich_text: [
              {
                type: 'text',
                text: { content: data.sukuyo }
              }
            ]
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
      throw new Error(`Notion API Error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    return { success: true, pageId: result.id }
  } catch (error) {
    console.error('[Notion Save Exception]', error instanceof Error ? error.message : error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
