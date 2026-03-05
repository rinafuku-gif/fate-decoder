'use server'

type GenerateResult =
  | { success: true; text: string }
  | { success: false; error: string; isQuotaError?: boolean }

export async function generateStory(prompt: string): Promise<GenerateResult> {
  try {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return { success: false, error: '神託の鍵が見つかりません。\n\nシステムの設定に問題があるようです。\n運営にお問い合わせください。' }
    }

    const modelName = 'gemini-2.5-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error(`[Gemini API Error] Status: ${response.status}, Body: ${errBody}`)

      if (response.status === 429) {
        return { success: false, error: 'Grand Masterの執筆力が本日の限界に達しました。\n\n明日の夜明けと共に、再びあなたの運命を綴る力が蘇ります。\nどうか星々が新たな力を得るまでお待ちください。', isQuotaError: true }
      }

      return { success: false, error: '神託の力が一時的に途絶えています。\n\nしばらく時間を置いてから、再度お試しください。\n問題が続く場合は、運営にお問い合わせください。' }
    }

    const json = await response.json()

    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      console.error('[Gemini API] Unexpected response structure:', JSON.stringify(json).slice(0, 500))
      return { success: false, error: 'AIからの応答を解析できませんでした。\n\nしばらく時間を置いてから、再度お試しください。' }
    }

    return { success: true, text }
  } catch (error) {
    console.error('[generateStory Error]', error instanceof Error ? error.message : error)
    return { success: false, error: '通信中にエラーが発生しました。\n\nネットワーク接続を確認し、再度お試しください。' }
  }
}
