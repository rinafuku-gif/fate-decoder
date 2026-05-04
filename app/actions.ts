'use server'

export async function generateStory(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('神託の鍵が見つかりません。\n\nシステムの設定に問題があるようです。\n運営にお問い合わせください。')
  }

  // Anthropic API（ANTHROPIC_API_KEY）優先
  if (process.env.ANTHROPIC_API_KEY) {
    return generateWithAnthropic(prompt)
  }

  // フォールバック: Gemini API
  return generateWithGemini(prompt)
}

async function generateWithAnthropic(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY!

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 8096,
      messages: [
        { role: 'user', content: prompt }
      ],
    }),
    signal: AbortSignal.timeout(55000),
  })

  if (!response.ok) {
    const errText = await response.text()

    if (response.status === 429) {
      throw new Error('Grand Masterの執筆力が本日の限界に達しました。\n\n明日の夜明けと共に、再びあなたの運命を綴る力が蘇ります。\nどうか星々が新たな力を得るまでお待ちください。')
    }

    throw new Error('神託の力が一時的に途絶えています。\n\nしばらく時間を置いてから、再度お試しください。\n問題が続く場合は、運営にお問い合わせください。')
  }

  const json = await response.json()
  return json.content[0].text
}

async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY!

  const modelName = 'gemini-flash-latest'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    }),
    signal: AbortSignal.timeout(55000)
  })

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Grand Masterの執筆力が本日の限界に達しました。\n\n明日の夜明けと共に、再びあなたの運命を綴る力が蘇ります。\nどうか星々が新たな力を得るまでお待ちください。')
    }

    throw new Error('神託の力が一時的に途絶えています。\n\nしばらく時間を置いてから、再度お試しください。\n問題が続く場合は、運営にお問い合わせください。')
  }

  const json = await response.json()
  return json.candidates[0].content.parts[0].text
}
