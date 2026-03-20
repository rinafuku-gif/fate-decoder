'use server'

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

