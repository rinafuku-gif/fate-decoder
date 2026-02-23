'use server'

export async function generateStory(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    throw new Error('神託の鍵が見つかりません。\n\nシステムの設定に問題があるようです。\n運営にお問い合わせください。')
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
    const errText = await response.text()
    
    // クォータ超過エラー（429）の場合
    if (response.status === 429) {
      throw new Error('Grand Masterの執筆力が本日の限界に達しました。\n\n明日の夜明けと共に、再びあなたの運命を綴る力が蘇ります。\nどうか星々が新たな力を得るまでお待ちください。')
    }
    
    throw new Error('神託の力が一時的に途絶えています。\n\nしばらく時間を置いてから、再度お試しください。\n問題が続く場合は、運営にお問い合わせください。')
  }
  
  const json = await response.json()
  return json.candidates[0].content.parts[0].text
}
