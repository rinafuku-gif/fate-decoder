import { NextRequest, NextResponse } from 'next/server'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'

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
// 許可 voice 一覧
// ----------------------------------------
const ALLOWED_VOICES = new Set([
  'ja-JP-NanamiNeural',
  'ja-JP-AoiNeural',
  'ja-JP-MayuNeural',
  'ja-JP-ShioriNeural',
  'ja-JP-KeitaNeural',
  'ja-JP-NaokiNeural',
])

const DEFAULT_VOICE = 'ja-JP-NanamiNeural'

// ----------------------------------------
// テキスト上限
// ----------------------------------------
const MAX_TEXT_LENGTH = 800

// ----------------------------------------
// POST /api/tts
// ----------------------------------------
export async function POST(req: NextRequest): Promise<NextResponse> {
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
  const voiceParam = typeof raw.voice === 'string' ? raw.voice.trim() : DEFAULT_VOICE

  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `text must be ${MAX_TEXT_LENGTH} characters or less` },
      { status: 400 }
    )
  }

  const voice = ALLOWED_VOICES.has(voiceParam) ? voiceParam : DEFAULT_VOICE

  try {
    const audioBuffer = await synthesizeSpeech(text, voice)

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'TTS generation failed' },
      { status: 500 }
    )
  }
}

function synthesizeSpeech(text: string, voice: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const tts = new MsEdgeTTS()
    tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3).then(() => {
      const { audioStream } = tts.toStream(text)
      const chunks: Buffer[] = []
      audioStream.on('data', (chunk: Buffer | Uint8Array) => {
        chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk))
      })
      audioStream.on('end', () => {
        tts.close()
        resolve(Buffer.concat(chunks))
      })
      audioStream.on('error', (err: Error) => {
        tts.close()
        reject(err)
      })
    }).catch(reject)
  })
}

