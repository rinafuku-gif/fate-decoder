import { NextRequest, NextResponse } from 'next/server'

// ----------------------------------------
// ローカル版専用エンドポイント
// NEXT_PUBLIC_LOCAL_MODE !== 'true' の場合は 403 を返す
// ----------------------------------------

// ----------------------------------------
// レート制限（インメモリ・IPベース）
// ----------------------------------------
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1分
const RATE_LIMIT_MAX = 30              // 1分あたり30リクエスト

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count += 1
  return true
}

// ----------------------------------------
// テキスト上限
// ----------------------------------------
const MAX_TEXT_LENGTH = 800

// ----------------------------------------
// VOICEVOX Engine URL
// ----------------------------------------
const VOICEVOX_ENGINE_URL =
  process.env.VOICEVOX_ENGINE_URL ?? 'http://localhost:50021'

// ----------------------------------------
// POST /api/tts-voicevox
// ----------------------------------------
export async function POST(req: NextRequest): Promise<NextResponse> {
  // ローカル版以外からのアクセスを拒否
  if (process.env.NEXT_PUBLIC_LOCAL_MODE !== 'true') {
    return NextResponse.json(
      { error: 'This endpoint is only available in local mode.' },
      { status: 403 }
    )
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const text = typeof raw.text === 'string' ? raw.text.trim() : ''
  const speakerRaw = raw.speaker

  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `text must be ${MAX_TEXT_LENGTH} characters or less` },
      { status: 400 }
    )
  }

  const speakerId =
    typeof speakerRaw === 'number' && Number.isInteger(speakerRaw) && speakerRaw >= 0
      ? speakerRaw
      : 3 // ずんだもん（ノーマル）をデフォルトに

  try {
    const wavBuffer = await synthesizeVoicevox(text, speakerId)
    return new NextResponse(new Uint8Array(wavBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(wavBuffer.byteLength),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    if (err instanceof VoicevoxEngineError) {
      return NextResponse.json(
        {
          error: 'VOICEVOX エンジンに接続できません。VOICEVOX アプリを起動してからお試しください。',
          detail: 'Connect to http://localhost:50021 failed.',
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'TTS generation failed' },
      { status: 500 }
    )
  }
}

class VoicevoxEngineError extends Error {}

async function synthesizeVoicevox(text: string, speakerId: number): Promise<ArrayBuffer> {
  const timeout = AbortSignal.timeout(30000)

  // Step 1: audio_query
  let queryRes: Response
  try {
    queryRes = await fetch(
      `${VOICEVOX_ENGINE_URL}/audio_query?speaker=${speakerId}&text=${encodeURIComponent(text)}`,
      {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        signal: timeout,
      }
    )
  } catch {
    throw new VoicevoxEngineError('audio_query fetch failed')
  }

  if (!queryRes.ok) {
    throw new VoicevoxEngineError(`audio_query failed: ${queryRes.status}`)
  }

  const queryJson: unknown = await queryRes.json()

  // Step 2: synthesis
  let synthRes: Response
  try {
    synthRes = await fetch(
      `${VOICEVOX_ENGINE_URL}/synthesis?speaker=${speakerId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'audio/wav' },
        body: JSON.stringify(queryJson),
        signal: timeout,
      }
    )
  } catch {
    throw new VoicevoxEngineError('synthesis fetch failed')
  }

  if (!synthRes.ok) {
    throw new VoicevoxEngineError(`synthesis failed: ${synthRes.status}`)
  }

  return synthRes.arrayBuffer()
}
