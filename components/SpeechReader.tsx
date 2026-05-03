'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { preprocessForSpeech } from '../lib/speech-text-preprocess'

type Status = 'idle' | 'playing' | 'paused'
const RATES = [0.85, 1.0, 1.15, 1.3, 1.5] as const
type Rate = (typeof RATES)[number]

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

function rankVoice(v: SpeechSynthesisVoice): number {
  const isJa = v.lang.toLowerCase().startsWith('ja')
  if (!isJa) return 100
  for (let i = 0; i < FEMALE_VOICE_PATTERNS.length; i++) {
    if (FEMALE_VOICE_PATTERNS[i].test(v.name)) return i // 0..n
  }
  if (MALE_VOICE_PATTERNS.some(r => r.test(v.name))) return 50
  return 30
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

export function SpeechReader({ text, label = '読み上げ' }: Props) {
  const [supported, setSupported] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [rate, setRate] = useState<Rate>(1.0)
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [voiceList, setVoiceList] = useState<SpeechSynthesisVoice[]>([])
  const [chunkIndex, setChunkIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [iosMode, setIosMode] = useState(false)

  const chunks = useMemo(() => splitForSpeech(text), [text])
  const totalChunks = chunks.length

  const indexRef = useRef(0)
  const cancelledRef = useRef(false)
  const rateRef = useRef<Rate>(rate)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  useEffect(() => { rateRef.current = rate }, [rate])
  useEffect(() => { voiceRef.current = voice }, [voice])

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    setSupported(true)
    setIosMode(isIOS())

    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices()
      if (list.length === 0) return
      // 明るめ女性 → その他日本語 → 男性 → 非日本語 の順にソート
      const sorted = list.slice().sort((a, b) => rankVoice(a) - rankVoice(b))
      setVoiceList(sorted)
      setVoice(prev => prev ?? sorted[0] ?? null)
    }
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => {
      window.speechSynthesis.onvoiceschanged = null
      window.speechSynthesis.cancel()
    }
  }, [])

  useEffect(() => () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      cancelledRef.current = true
      window.speechSynthesis.cancel()
    }
  }, [])

  // chunks（テキスト）が変わったら必ず停止リセット
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    cancelledRef.current = true
    window.speechSynthesis.cancel()
    setStatus('idle')
    setChunkIndex(0)
    indexRef.current = 0
  }, [chunks])

  const speakFrom = useCallback((startIndex: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (chunks.length === 0) return

    cancelledRef.current = false
    window.speechSynthesis.cancel()

    let i = Math.max(0, Math.min(startIndex, chunks.length - 1))
    indexRef.current = i
    setChunkIndex(i)
    setStatus('playing')

    const speakNext = () => {
      if (cancelledRef.current) return
      if (i >= chunks.length) {
        setStatus('idle')
        setChunkIndex(0)
        indexRef.current = 0
        return
      }
      const utt = new SpeechSynthesisUtterance(chunks[i])
      utt.rate = rateRef.current
      utt.lang = 'ja-JP'
      if (voiceRef.current) utt.voice = voiceRef.current
      utt.onend = () => {
        if (cancelledRef.current) return
        i += 1
        indexRef.current = i
        setChunkIndex(i)
        speakNext()
      }
      utt.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') return
        cancelledRef.current = true
        setStatus('idle')
      }
      window.speechSynthesis.speak(utt)
    }
    speakNext()
  }, [chunks])

  const handlePlay = useCallback(() => {
    if (!supported) return
    if (status === 'playing') return
    if (status === 'paused') {
      if (iosMode) {
        speakFrom(indexRef.current)
      } else {
        window.speechSynthesis.resume()
        setStatus('playing')
      }
      return
    }
    speakFrom(status === 'idle' ? 0 : indexRef.current)
  }, [supported, status, iosMode, speakFrom])

  const handlePause = useCallback(() => {
    if (!supported || status !== 'playing') return
    if (iosMode) {
      cancelledRef.current = true
      window.speechSynthesis.cancel()
      setStatus('paused')
    } else {
      window.speechSynthesis.pause()
      setStatus('paused')
    }
  }, [supported, status, iosMode])

  const handleStop = useCallback(() => {
    if (!supported) return
    cancelledRef.current = true
    window.speechSynthesis.cancel()
    setStatus('idle')
    setChunkIndex(0)
    indexRef.current = 0
  }, [supported])

  // 速度変更は次のチャンクから自動反映（rateRefを通じて）。再speakしない
  const handleRateChange = useCallback((next: Rate) => {
    setRate(next)
  }, [])

  // 音声切替は次のチャンクから自動反映
  const handleVoiceChange = useCallback((name: string) => {
    const v = voiceList.find(x => x.name === name) || null
    setVoice(v)
  }, [voiceList])

  if (!supported) {
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
          {voiceList.length > 1 && (
            <div className="speech-setting-row">
              <span className="speech-setting-label">音声</span>
              <select
                className="speech-voice-select"
                value={voice?.name || ''}
                onChange={(e) => handleVoiceChange(e.target.value)}
              >
                {voiceList.map((v, i) => (
                  <option key={`${v.voiceURI || v.name}-${v.lang}-${i}`} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}
          {iosMode && (status === 'playing' || status === 'paused') && (
            <p className="speech-settings-note">
              速度・音声の変更は次のチャンクから反映されます
            </p>
          )}
        </div>
      )}
    </div>
  )
}
