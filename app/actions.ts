'use server'

export async function generateStory(prompt: string) {
  // ローカルモード: Claude Code バイナリを直接呼び出す（API課金なし）
  if (process.env.LOCAL_CLAUDE_CODE === 'true') {
    return generateWithClaudeCode(prompt)
  }

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

async function generateWithClaudeCode(prompt: string): Promise<string> {
  const { spawn } = await import('child_process')

  return new Promise((resolve, reject) => {
    // claudeバイナリのパスを解決（PATH優先、フォールバックあり）
    const claudeBin = process.env.CLAUDE_BIN_PATH || 'claude'

    // --tools "" でツール呼び出しなし（テキスト生成専用）、--print で非インタラクティブ実行
    const args = ['-p', '--output-format', 'text', '--tools', '', prompt]
    const child = spawn(claudeBin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      // 既存の Claude Code セッション認証を継承するため HOME を引き継ぐ
      env: { ...process.env },
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error('Claude Codeの応答がタイムアウトしました（90秒）。もう一度お試しください。'))
    }, 90000)

    child.on('close', (code: number | null) => {
      clearTimeout(timer)
      if (code === 0) {
        const text = stdout.trim()
        if (!text) {
          reject(new Error('Claude Codeから応答がありませんでした。'))
          return
        }
        resolve(text)
      } else {
        reject(new Error(`Claude Code実行エラー（code: ${code}）\n${stderr.trim() || '詳細なし'}`))
      }
    })

    child.on('error', (err: Error) => {
      clearTimeout(timer)
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error('claudeコマンドが見つかりません。\nClaude Codeをインストールし、claude login を実行してください。'))
      } else {
        reject(new Error(`Claude Code起動エラー: ${err.message}`))
      }
    })
  })
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
