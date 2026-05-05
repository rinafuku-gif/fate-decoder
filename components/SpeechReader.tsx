'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { preprocessForSpeech } from '../lib/speech-text-preprocess'

type Status = 'idle' | 'playing' | 'paused'
const RATES = [0.85, 1.0, 1.15, 1.3, 1.5] as const
type Rate = (typeof RATES)[number]

type Engine = 'edge' | 'browser' | 'voicevox'

interface EdgeVoiceOption {
  id: string
  label: string
  description: string
}

const EDGE_VOICES: EdgeVoiceOption[] = [
  { id: 'ja-JP-NanamiNeural', label: 'Nanami',  description: '女性・明るく親しみやすい' },
  { id: 'ja-JP-KeitaNeural',  label: 'Keita',   description: '男性・しっかりした印象' },
]

const DEFAULT_EDGE_VOICE = 'ja-JP-NanamiNeural'

// ----------------------------------------
// VOICEVOX スピーカー定義
// ----------------------------------------
interface VoicevoxSpeakerOption {
  id: number
  label: string
  description: string
}

const VOICEVOX_SPEAKERS: VoicevoxSpeakerOption[] = [
  { id: 2,  label: '四国めたん（ノーマル）', description: '女性・しっかり' },
  { id: 0,  label: '四国めたん（あまあま）', description: '女性・甘え' },
  { id: 6,  label: '四国めたん（ツンツン）', description: '女性・ツンデレ' },
  { id: 3,  label: 'ずんだもん（ノーマル）', description: '中性・元気' },
  { id: 1,  label: 'ずんだもん（あまあま）', description: '中性・甘え' },
  { id: 8,  label: '春日部つむぎ',          description: '女性・落ち着き' },
  { id: 9,  label: '波音リツ',              description: '女性・しっかり' },
  { id: 11, label: '玄野武宏',              description: '男性・かっこいい' },
  { id: 12, label: '白上虎太郎（ふつう）',   description: '男性・元気' },
  { id: 13, label: '青山龍星',              description: '男性・低音' },
  { id: 14, label: '冥鳴ひまり',            description: '女性・優しい' },
  { id: 16, label: '九州そら（ノーマル）',   description: '女性・しっとり' },
]

const DEFAULT_VOICEVOX_SPEAKER = 3 // ずんだもん（ノーマル）

const IS_LOCAL_MODE = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true'

interface Props {
  text: string
  label?: string
}

const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iPadOS = navigator.platform === 'MacIntel' && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1
  return /iPad|iPhone|iPod/.test(ua) || iPadOS
}

// 明るめ女性voice（OS横断）。先頭ほど優先
// iOS17+ の Character voices（Sandy/Shelley/Flo）はナチュラルで明るめ
const FEMALE_VOICE_PATTERNS = [
  /sayaka/i, /sakura/i, /haruka/i, /ayumi/i, // Windows系
  /sandy/i, /shelley/i, /flo/i,              // iOS Character (明るめ)
  /kyoko/i, /otome/i,                        // macOS/iOS 標準
  /o-ren/i, /oren/i, /eloquence.*susan/i,
  /^female/i, /女性/,
  /siri.*female/i, /google.*日本語/i, /google.*ja/i,
]
const MALE_VOICE_PATTERNS = [
  /otoya/i, /hattori/i, /eddy/i, /ichiro/i, /reed/i, /rocko/i,
  /grandpa/i, /grandma/i,
  /^male/i, /男性/,
  /siri.*male/i, /albert/i,
]

// Premium/Enhanced/拡張 voice は明らかに高音質なので優先
const PREMIUM_PATTERN = /premium|enhanced|拡張|プレミアム|neural|natural/i

function rankVoice(v: SpeechSynthesisVoice): number {
  const isJa = v.lang.toLowerCase().startsWith('ja')
  if (!isJa) return 100
  let base = 30
  for (let i = 0; i < FEMALE_VOICE_PATTERNS.length; i++) {
    if (FEMALE_VOICE_PATTERNS[i].test(v.name)) { base = i; break }
  }
  if (base === 30 && MALE_VOICE_PATTERNS.some(r => r.test(v.name))) base = 50
  if (PREMIUM_PATTERN.test(v.name)) base -= 20
  return base
}

function splitForSpeech(raw: string): string[] {
  const cleaned = preprocessForSpeech(raw).replace(/[\s　]+/g, ' ').trim()
  if (!cleaned) return []

  const sentences = cleaned
    .split(/(?<=[。．！？!?\n])/)
    .map(s => s.trim())
    .filter(Boolean)

  const chunks: string[] = []
  let buf = ''
  const MAX = 100
  for (const s of sentences) {
    if (s.length >= MAX) {
      if (buf) { chunks.push(buf); buf = '' }
      let rest = s
      while (rest.length > MAX) {
        const cut = rest.lastIndexOf('、', MAX)
        const pos = cut > MAX / 2 ? cut + 1 : MAX
        chunks.push(rest.slice(0, pos))
        rest = rest.slice(pos)
      }
      if (rest) chunks.push(rest)
      continue
    }
    if ((buf + s).length > MAX) {
      chunks.push(buf)
      buf = s
    } else {
      buf += s
    }
  }
  if (buf) chunks.push(buf)
  return chunks
}

// Edge TTS: 1チャンクをAPI呼び出し → ArrayBuffer 取得
async function fetchEdgeTTS(text: string, voice: string): Promise<ArrayBuffer> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => 'unknown error')
    throw new Error(`TTS API error ${res.status}: ${msg}`)
  }
  return res.arrayBuffer()
}

// VOICEVOX: 1チャンクをAPI呼び出し → ArrayBuffer 取得（WAV）
async function fetchVoicevoxTTS(text: string, speaker: number): Promise<ArrayBuffer> {
  const res = await fetch('/api/tts-voicevox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speaker }),
  })
  if (!res.ok) {
    if (res.status === 503) {
      throw new VoicevoxUnavailableError('VOICEVOX エンジンが起動していません')
    }
    const msg = await res.text().catch(() => 'unknown error')
    throw new Error(`VOICEVOX API error ${res.status}: ${msg}`)
  }
  return res.arrayBuffer()
}

class VoicevoxUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VoicevoxUnavailableError'
  }
}

export function SpeechReader({ text, label = '読み上げ' }: Props) {
  // ---- engine ----
  const [engine, setEngine] = useState<Engine>('edge')
  const engineRef = useRef<Engine>('edge')
  useEffect(() => { engineRef.current = engine }, [engine])

  // ---- edge tts ----
  const [edgeVoice, setEdgeVoice] = useState<string>(DEFAULT_EDGE_VOICE)
  const edgeVoiceRef = useRef<string>(DEFAULT_EDGE_VOICE)
  useEffect(() => { edgeVoiceRef.current = edgeVoice }, [edgeVoice])

  // ---- voicevox ----
  const [voicevoxSpeaker, setVoicevoxSpeaker] = useState<number>(DEFAULT_VOICEVOX_SPEAKER)
  const voicevoxSpeakerRef = useRef<number>(DEFAULT_VOICEVOX_SPEAKER)
  useEffect(() => { voicevoxSpeakerRef.current = voicevoxSpeaker }, [voicevoxSpeaker])
  const [voicevoxError, setVoicevoxError] = useState<string | null>(null)

  // audioContext for edge tts / voicevox playback
  const audioCtxRef = useRef<AudioContext | null>(null)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const edgeCancelledRef = useRef(false)

  // ---- browser tts ----
  const [supported, setSupported] = useState(false)
  const [voiceList, setVoiceList] = useState<SpeechSynthesisVoice[]>([])
  const [browserVoice, setBrowserVoice] = useState<SpeechSynthesisVoice | null>(null)
  const browserVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  useEffect(() => { browserVoiceRef.current = browserVoice }, [browserVoice])
  const [iosMode, setIosMode] = useState(false)

  // ---- shared ----
  const [status, setStatus] = useState<Status>('idle')
  const [rate, setRate] = useState<Rate>(1.0)
  const rateRef = useRef<Rate>(1.0)
  useEffect(() => { rateRef.current = rate }, [rate])

  const [chunkIndex, setChunkIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [edgeError, setEdgeError] = useState<string | null>(null)
  const voicevoxCancelledRef = useRef(false)

  const chunks = useMemo(() => splitForSpeech(text), [text])
  const totalChunks = chunks.length

  const indexRef = useRef(0)
  const browserCancelledRef = useRef(false)

  // ---- Browser TTS 初期化 ----
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    setSupported(true)
    setIosMode(isIOS())

    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices()
      if (list.length === 0) return
      const sorted = list.slice().sort((a, b) => rankVoice(a) - rankVoice(b))
      setVoiceList(sorted)
      setBrowserVoice(prev => prev ?? sorted[0] ?? null)
    }
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => {
      window.speechSynthesis.onvoiceschanged = null
      window.speechSynthesis.cancel()
    }
  }, [])

  // アンマウント時クリーンアップ
  useEffect(() => () => {
    edgeCancelledRef.current = true
    voicevoxCancelledRef.current = true
    currentSourceRef.current?.stop()
    audioCtxRef.current?.close()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      browserCancelledRef.current = true
      window.speechSynthesis.cancel()
    }
  }, [])

  // chunks変化 → 停止リセット
  useEffect(() => {
    edgeCancelledRef.current = true
    voicevoxCancelledRef.current = true
    currentSourceRef.current?.stop()
    currentSourceRef.current = null
    browserCancelledRef.current = true
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setStatus('idle')
    setChunkIndex(0)
    indexRef.current = 0
    setEdgeError(null)
    setVoicevoxError(null)
  }, [chunks])

  // ============================================================
  // Edge TTS 再生ロジック
  // ============================================================
  const speakEdgeFrom = useCallback(async (startIndex: number) => {
    if (chunks.length === 0) return

    edgeCancelledRef.current = false
    currentSourceRef.current?.stop()
    currentSourceRef.current = null

    let ctx = audioCtxRef.current
    if (!ctx || ctx.state === 'closed') {
      ctx = new AudioContext()
      audioCtxRef.current = ctx
    }
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    let i = Math.max(0, Math.min(startIndex, chunks.length - 1))
    indexRef.current = i
    setChunkIndex(i)
    setStatus('playing')
    setEdgeError(null)

    const playNext = async () => {
      if (edgeCancelledRef.current) return
      if (i >= chunks.length) {
        setStatus('idle')
        setChunkIndex(0)
        indexRef.current = 0
        return
      }

      try {
        const buf = await fetchEdgeTTS(chunks[i], edgeVoiceRef.current)
        if (edgeCancelledRef.current) return

        const audioBuf = await ctx!.decodeAudioData(buf)
        if (edgeCancelledRef.current) return

        // 速度調整：AudioBufferSourceNode の playbackRate で再現
        const source = ctx!.createBufferSource()
        source.buffer = audioBuf
        source.playbackRate.value = rateRef.current
        source.connect(ctx!.destination)
        currentSourceRef.current = source

        source.onended = () => {
          if (edgeCancelledRef.current) return
          i += 1
          indexRef.current = i
          setChunkIndex(i)
          playNext()
        }
        source.start()
      } catch (err) {
        if (edgeCancelledRef.current) return
        const msg = err instanceof Error ? err.message : 'TTS error'
        setEdgeError(msg)
        setStatus('idle')
      }
    }

    await playNext()
  }, [chunks])

  // ============================================================
  // VOICEVOX 再生ロジック（Edge TTS と同じ AudioContext ベース）
  // ============================================================
  const speakVoicevoxFrom = useCallback(async (startIndex: number) => {
    if (chunks.length === 0) return

    voicevoxCancelledRef.current = false
    currentSourceRef.current?.stop()
    currentSourceRef.current = null

    let ctx = audioCtxRef.current
    if (!ctx || ctx.state === 'closed') {
      ctx = new AudioContext()
      audioCtxRef.current = ctx
    }
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    let i = Math.max(0, Math.min(startIndex, chunks.length - 1))
    indexRef.current = i
    setChunkIndex(i)
    setStatus('playing')
    setVoicevoxError(null)

    const playNext = async () => {
      if (voicevoxCancelledRef.current) return
      if (i >= chunks.length) {
        setStatus('idle')
        setChunkIndex(0)
        indexRef.current = 0
        return
      }

      try {
        const buf = await fetchVoicevoxTTS(chunks[i], voicevoxSpeakerRef.current)
        if (voicevoxCancelledRef.current) return

        const audioBuf = await ctx!.decodeAudioData(buf)
        if (voicevoxCancelledRef.current) return

        const source = ctx!.createBufferSource()
        source.buffer = audioBuf
        source.playbackRate.value = rateRef.current
        source.connect(ctx!.destination)
        currentSourceRef.current = source

        source.onended = () => {
          if (voicevoxCancelledRef.current) return
          i += 1
          indexRef.current = i
          setChunkIndex(i)
          playNext()
        }
        source.start()
      } catch (err) {
        if (voicevoxCancelledRef.current) return
        if (err instanceof VoicevoxUnavailableError) {
          setVoicevoxError('voicevox_unavailable')
        } else {
          const msg = err instanceof Error ? err.message : 'VOICEVOX error'
          setVoicevoxError(msg)
        }
        setStatus('idle')
      }
    }

    await playNext()
  }, [chunks])

  // ============================================================
  // Browser TTS 再生ロジック
  // ============================================================
  const speakBrowserFrom = useCallback((startIndex: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (chunks.length === 0) return

    browserCancelledRef.current = false
    window.speechSynthesis.cancel()

    let i = Math.max(0, Math.min(startIndex, chunks.length - 1))
    indexRef.current = i
    setChunkIndex(i)
    setStatus('playing')

    const speakNext = () => {
      if (browserCancelledRef.current) return
      if (i >= chunks.length) {
        setStatus('idle')
        setChunkIndex(0)
        indexRef.current = 0
        return
      }
      const utt = new SpeechSynthesisUtterance(chunks[i])
      utt.rate = rateRef.current
      utt.lang = 'ja-JP'
      if (browserVoiceRef.current) utt.voice = browserVoiceRef.current
      utt.onend = () => {
        if (browserCancelledRef.current) return
        i += 1
        indexRef.current = i
        setChunkIndex(i)
        speakNext()
      }
      utt.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') return
        browserCancelledRef.current = true
        setStatus('idle')
      }
      window.speechSynthesis.speak(utt)
    }
    speakNext()
  }, [chunks])

  // ============================================================
  // 統合 Play / Pause / Stop
  // ============================================================
  // iOS Safari AudioContext unlock（Edge TTS / VOICEVOX 共通）
  const unlockAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return
    let ctx = audioCtxRef.current
    if (!ctx || ctx.state === 'closed') {
      const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctor) {
        ctx = new Ctor()
        audioCtxRef.current = ctx
      }
    }
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      try {
        const silentBuffer = ctx.createBuffer(1, 1, 22050)
        const silentSource = ctx.createBufferSource()
        silentSource.buffer = silentBuffer
        silentSource.connect(ctx.destination)
        silentSource.start(0)
      } catch {}
    }
  }, [])

  const handlePlay = useCallback(() => {
    if (engine === 'edge') {
      if (status === 'playing') return
      // iOS Safari unlock
      unlockAudioContext()
      speakEdgeFrom(status === 'idle' ? 0 : indexRef.current)
    } else if (engine === 'voicevox') {
      if (status === 'playing') return
      // iOS Safari unlock
      unlockAudioContext()
      speakVoicevoxFrom(status === 'idle' ? 0 : indexRef.current)
    } else {
      if (!supported) return
      if (status === 'playing') return
      if (status === 'paused') {
        if (iosMode) {
          speakBrowserFrom(indexRef.current)
        } else {
          window.speechSynthesis.resume()
          setStatus('playing')
        }
        return
      }
      speakBrowserFrom(status === 'idle' ? 0 : indexRef.current)
    }
  }, [engine, status, supported, iosMode, unlockAudioContext, speakEdgeFrom, speakVoicevoxFrom, speakBrowserFrom])

  const handlePause = useCallback(() => {
    if (engine === 'edge') {
      if (status !== 'playing') return
      edgeCancelledRef.current = true
      currentSourceRef.current?.stop()
      currentSourceRef.current = null
      setStatus('paused')
    } else if (engine === 'voicevox') {
      if (status !== 'playing') return
      voicevoxCancelledRef.current = true
      currentSourceRef.current?.stop()
      currentSourceRef.current = null
      setStatus('paused')
    } else {
      if (!supported || status !== 'playing') return
      if (iosMode) {
        browserCancelledRef.current = true
        window.speechSynthesis.cancel()
        setStatus('paused')
      } else {
        window.speechSynthesis.pause()
        setStatus('paused')
      }
    }
  }, [engine, status, supported, iosMode])

  const handleStop = useCallback(() => {
    if (engine === 'edge') {
      edgeCancelledRef.current = true
      currentSourceRef.current?.stop()
      currentSourceRef.current = null
    } else if (engine === 'voicevox') {
      voicevoxCancelledRef.current = true
      currentSourceRef.current?.stop()
      currentSourceRef.current = null
    } else {
      if (!supported) return
      browserCancelledRef.current = true
      window.speechSynthesis.cancel()
    }
    setStatus('idle')
    setChunkIndex(0)
    indexRef.current = 0
    setEdgeError(null)
    setVoicevoxError(null)
  }, [engine, supported])

  const handleRateChange = useCallback((next: Rate) => {
    setRate(next)
  }, [])

  const handleBrowserVoiceChange = useCallback((name: string) => {
    const v = voiceList.find(x => x.name === name) || null
    setBrowserVoice(v)
  }, [voiceList])

  // 試聴（エンジン対応）
  const handlePreview = useCallback(() => {
    const sample = 'こんにちは。診断結果をお読みします。'

    if (engine === 'edge' || engine === 'voicevox') {
      const isEdge = engine === 'edge'
      if (isEdge) {
        edgeCancelledRef.current = true
      } else {
        voicevoxCancelledRef.current = true
      }
      currentSourceRef.current?.stop()
      currentSourceRef.current = null
      setStatus('idle')
      setChunkIndex(0)
      indexRef.current = 0

      // iOS Safari unlock
      unlockAudioContext()

      const ctx = audioCtxRef.current
      const r = rateRef.current

      ;(async () => {
        try {
          const buf = isEdge
            ? await fetchEdgeTTS(sample, edgeVoiceRef.current)
            : await fetchVoicevoxTTS(sample, voicevoxSpeakerRef.current)

          if (isEdge) {
            edgeCancelledRef.current = false
          } else {
            voicevoxCancelledRef.current = false
          }

          if (!ctx) return
          const audioBuf = await ctx.decodeAudioData(buf)
          const source = ctx.createBufferSource()
          source.buffer = audioBuf
          source.playbackRate.value = r
          source.connect(ctx.destination)
          source.start()
        } catch {
          // 試聴エラーは無視
        }
      })()
    } else {
      if (!supported || !browserVoiceRef.current) return
      browserCancelledRef.current = true
      window.speechSynthesis.cancel()
      setStatus('idle')
      setChunkIndex(0)
      indexRef.current = 0
      window.setTimeout(() => {
        browserCancelledRef.current = false
        const utt = new SpeechSynthesisUtterance(sample)
        utt.lang = 'ja-JP'
        utt.rate = rateRef.current
        utt.voice = browserVoiceRef.current
        window.speechSynthesis.speak(utt)
      }, 100)
    }
  }, [engine, supported, unlockAudioContext])

  // エンジン切り替え時に再生を停止
  const handleEngineChange = useCallback((next: Engine) => {
    edgeCancelledRef.current = true
    voicevoxCancelledRef.current = true
    currentSourceRef.current?.stop()
    currentSourceRef.current = null
    browserCancelledRef.current = true
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setStatus('idle')
    setChunkIndex(0)
    indexRef.current = 0
    setEdgeError(null)
    setVoicevoxError(null)
    setEngine(next)
  }, [])

  // Edge TTS は常に「サポート」扱い（サーバーサイドAPIのため）
  const isEdgeAvailable = typeof window !== 'undefined'
  const isBrowserAvailable = supported
  const isVoicevoxAvailable = IS_LOCAL_MODE && typeof window !== 'undefined'

  if (!isEdgeAvailable && !isBrowserAvailable) {
    return (
      <div className="speech-reader speech-reader-unsupported">
        <span>このブラウザは音声読み上げに非対応です</span>
      </div>
    )
  }

  if (totalChunks === 0) return null

  const progress = totalChunks > 0 ? Math.min(100, (chunkIndex / totalChunks) * 100) : 0
  const isPlaying = status === 'playing'
  const isPaused = status === 'paused'

  return (
    <div className={`speech-reader ${open ? 'speech-reader-open' : ''}`}>
      <div className="speech-reader-bar">
        <button
          type="button"
          onClick={isPlaying ? handlePause : handlePlay}
          className="speech-btn speech-btn-primary"
          aria-label={isPlaying ? '一時停止' : '読み上げる'}
        >
          {isPlaying ? '⏸' : isPaused ? '▶' : '🔊'}
          <span className="speech-btn-text">
            {isPlaying ? '一時停止' : isPaused ? '再開' : label}
          </span>
        </button>

        {(isPlaying || isPaused) && (
          <button
            type="button"
            onClick={handleStop}
            className="speech-btn speech-btn-stop"
            aria-label="停止"
          >
            ■
          </button>
        )}

        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="speech-btn speech-btn-toggle"
          aria-label="設定"
          aria-expanded={open}
          aria-controls="speech-settings-panel"
        >
          ⚙
        </button>
      </div>

      {edgeError && engine === 'edge' && (
        <div className="speech-edge-error">
          音声取得に失敗しました。ブラウザ音声に切り替えてお試しください。
        </div>
      )}

      {voicevoxError && engine === 'voicevox' && (
        <div className="speech-edge-error">
          {voicevoxError === 'voicevox_unavailable' ? (
            <>
              VOICEVOX エンジンに接続できません。
              <a
                href="https://voicevox.hiroshiba.jp/"
                target="_blank"
                rel="noopener noreferrer"
                className="speech-voicevox-link"
              >
                VOICEVOX
              </a>
              を起動してから再度お試しください。
            </>
          ) : (
            '音声生成に失敗しました。VOICEVOX が起動しているか確認してください。'
          )}
        </div>
      )}

      {(isPlaying || isPaused) && (
        <div className="speech-progress">
          <div className="speech-progress-bar" style={{ width: `${progress}%` }} />
          <span className="speech-progress-text" aria-live="polite" aria-atomic="true">
            {chunkIndex} / {totalChunks}
          </span>
        </div>
      )}

      {open && (
        <div id="speech-settings-panel" className="speech-settings">
          {/* エンジン切り替え */}
          <div className="speech-setting-row">
            <span className="speech-setting-label">音声</span>
            <div className="speech-engine-buttons">
              <button
                type="button"
                onClick={() => handleEngineChange('edge')}
                className={`speech-engine-btn ${engine === 'edge' ? 'is-active' : ''}`}
              >
                Edge TTS
              </button>
              <button
                type="button"
                onClick={() => handleEngineChange('browser')}
                className={`speech-engine-btn ${engine === 'browser' ? 'is-active' : ''}`}
                disabled={!isBrowserAvailable}
              >
                ブラウザ
              </button>
              {isVoicevoxAvailable && (
                <button
                  type="button"
                  onClick={() => handleEngineChange('voicevox')}
                  className={`speech-engine-btn ${engine === 'voicevox' ? 'is-active' : ''}`}
                >
                  VOICEVOX
                </button>
              )}
            </div>
          </div>

          {/* Edge TTS voice 選択 */}
          {engine === 'edge' && (
            <div className="speech-setting-row">
              <span className="speech-setting-label">声</span>
              <select
                className="speech-voice-select"
                value={edgeVoice}
                onChange={(e) => setEdgeVoice(e.target.value)}
              >
                {EDGE_VOICES.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.label} — {v.description}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handlePreview}
                className="speech-preview-btn"
                aria-label="試聴"
                title="この声で試聴"
                disabled={isPlaying}
              >
                ♪ 試聴
              </button>
            </div>
          )}

          {/* VOICEVOX speaker 選択 */}
          {engine === 'voicevox' && (
            <div className="speech-setting-row">
              <span className="speech-setting-label">声</span>
              <select
                className="speech-voice-select"
                value={voicevoxSpeaker}
                onChange={(e) => setVoicevoxSpeaker(Number(e.target.value))}
              >
                {VOICEVOX_SPEAKERS.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.label} — {s.description}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handlePreview}
                className="speech-preview-btn"
                aria-label="試聴"
                title="この声で試聴"
                disabled={isPlaying}
              >
                ♪ 試聴
              </button>
            </div>
          )}

          {/* Browser TTS voice 選択 */}
          {engine === 'browser' && voiceList.length > 1 && (
            <div className="speech-setting-row">
              <span className="speech-setting-label">声</span>
              <select
                className="speech-voice-select"
                value={browserVoice?.name || ''}
                onChange={(e) => handleBrowserVoiceChange(e.target.value)}
              >
                {voiceList.map((v, i) => (
                  <option key={`${v.voiceURI || v.name}-${v.lang}-${i}`} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handlePreview}
                className="speech-preview-btn"
                aria-label="試聴"
                title="この声で試聴"
                disabled={!browserVoice}
              >
                ♪ 試聴
              </button>
            </div>
          )}

          {/* 速度 */}
          <div className="speech-setting-row">
            <span className="speech-setting-label">速度</span>
            <div className="speech-rate-buttons">
              {RATES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRateChange(r)}
                  className={`speech-rate-btn ${rate === r ? 'is-active' : ''}`}
                >
                  {r}x
                </button>
              ))}
            </div>
          </div>

          {engine === 'browser' && iosMode && (status === 'playing' || status === 'paused') && (
            <p className="speech-settings-note">
              速度・音声の変更は次のチャンクから反映されます
            </p>
          )}
          {engine === 'edge' && (
            <p className="speech-settings-note">
              Edge TTS はインターネット接続が必要です
            </p>
          )}
          {engine === 'voicevox' && (
            <p className="speech-settings-note">
              VOICEVOX アプリを起動した状態でご利用ください
            </p>
          )}
        </div>
      )}
    </div>
  )
}
