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
    const claudeBin = process.env.CLAUDE_BIN_PATH || 'claude'

    const args = [
      '-p',
      '--output-format', 'text',
      '--tools', '',
      '--model', 'haiku',
      '--no-session-persistence',
      '--append-system-prompt', 'Output ONLY valid JSON. No prose, no markdown code fences.',
    ]
    const child = spawn(claudeBin, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
      cwd: '/tmp',
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    const sigterm = setTimeout(() => {
      child.kill('SIGTERM')
    }, 115000)
    const sigkill = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('Claude Codeの応答がタイムアウトしました（120秒）。プロンプトを短くしてお試しください。'))
    }, 120000)

    child.on('close', (code: number | null) => {
      clearTimeout(sigterm)
      clearTimeout(sigkill)
      if (stderr.trim()) console.warn('[Claude Code stderr]', stderr.trim())
      if (code === 0) {
        const text = stdout.trim()
        if (!text) { reject(new Error('Claude Codeから応答がありませんでした。')); return }
        resolve(text)
      } else {
        reject(new Error(`Claude Code実行エラー（code: ${code}）\n${stderr.trim() || '詳細なし'}`))
      }
    })

    child.on('error', (err: Error) => {
      clearTimeout(sigterm)
      clearTimeout(sigkill)
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error('claudeコマンドが見つかりません。\nClaude Codeをインストールし、claude login を実行してください。'))
      } else {
        reject(new Error(`Claude Code起動エラー: ${err.message}`))
      }
    })

    child.stdin.write(prompt)
    child.stdin.end()
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
