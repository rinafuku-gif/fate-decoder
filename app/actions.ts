'use server'

type GenerateResult =
  | { success: true; text: string }
  | { success: false; error: string; isQuotaError?: boolean }

export async function generateStory(prompt: string): Promise<GenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return { success: false, error: '神託の鍵が見つかりません。\n\nシステムの設定に問題があるようです。\n運営にお問い合わせください。' }
  }

  const modelName = 'gemini-flash-latest'
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
    if (response.status === 429) {
      return { success: false, error: 'Grand Masterの執筆力が本日の限界に達しました。\n\n明日の夜明けと共に、再びあなたの運命を綴る力が蘇ります。\nどうか星々が新たな力を得るまでお待ちください。', isQuotaError: true }
    }

    return { success: false, error: '神託の力が一時的に途絶えています。\n\nしばらく時間を置いてから、再度お試しください。\n問題が続く場合は、運営にお問い合わせください。' }
  }

  const json = await response.json()
  return { success: true, text: json.candidates[0].content.parts[0].text }
}
