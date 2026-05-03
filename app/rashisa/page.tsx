'use client'

/**
 * /rashisa — 12軸プロファイルページ
 *
 * 抵抗感対策5原則を厳守：
 * 1. メカニズムを見せない（占術名・生データを一切表示しない）
 * 2. 言葉の置き換え（「占い」「占術」を使わない。「分析」「らしさ」を使う）
 * 3. 科学っぽい見せ方（「複数の心理測定モデルと傾向データを統合した分析結果」）
 * 4. 体感先行（「これ、どう感じますか?」のような問いを各軸に添える）
 * 5. 同調圧を作らない（SNS連携・シェアボタンを付けない）
 */

import { useState } from 'react'
import Link from 'next/link'

// 都市名 → 緯度経度 簡易マッピング（主要都市）
const CITY_COORDS: Record<string, { latitude: number; longitude: number }> = {
  '東京': { latitude: 35.6812, longitude: 139.7671 },
  '大阪': { latitude: 34.6937, longitude: 135.5023 },
  '名古屋': { latitude: 35.1815, longitude: 136.9066 },
  '福岡': { latitude: 33.5902, longitude: 130.4017 },
  '札幌': { latitude: 43.0618, longitude: 141.3545 },
  '仙台': { latitude: 38.2682, longitude: 140.8694 },
  '広島': { latitude: 34.3853, longitude: 132.4553 },
  '神戸': { latitude: 34.6913, longitude: 135.1830 },
  '京都': { latitude: 35.0116, longitude: 135.7681 },
  '横浜': { latitude: 35.4437, longitude: 139.6380 },
  '千葉': { latitude: 35.6074, longitude: 140.1065 },
  '沖縄': { latitude: 26.2124, longitude: 127.6809 },
  '那覇': { latitude: 26.2124, longitude: 127.6809 },
  '鹿児島': { latitude: 31.5966, longitude: 130.5571 },
  '熊本': { latitude: 32.7898, longitude: 130.7417 },
  '長崎': { latitude: 32.7448, longitude: 129.8737 },
  '新潟': { latitude: 37.9162, longitude: 139.0364 },
  '金沢': { latitude: 36.5611, longitude: 136.6565 },
  'ニューヨーク': { latitude: 40.7128, longitude: -74.0060 },
  'ロンドン': { latitude: 51.5074, longitude: -0.1278 },
  'パリ': { latitude: 48.8566, longitude: 2.3522 },
  '北京': { latitude: 39.9042, longitude: 116.4074 },
  '上海': { latitude: 31.2304, longitude: 121.4737 },
  'ソウル': { latitude: 37.5665, longitude: 126.9780 },
  'シンガポール': { latitude: 1.3521, longitude: 103.8198 },
}

function resolveCity(city: string): { latitude: number; longitude: number } | null {
  const trimmed = city.trim()
  // 完全一致
  if (CITY_COORDS[trimmed]) return CITY_COORDS[trimmed]
  // 部分一致（前方）
  for (const key of Object.keys(CITY_COORDS)) {
    if (trimmed.includes(key) || key.includes(trimmed)) return CITY_COORDS[key]
  }
  return null
}

// 12軸の問い（体感先行 — 抵抗感対策4原則）
const AXIS_QUESTIONS: Record<string, string> = {
  '判断':           'ものごとを決めるとき、「感覚」と「論理」どちらを先に動かしますか?',
  'エネルギー方向': '人と過ごした後、充電される感覚ですか? それとも消耗しますか?',
  '情報の捉え方':   '新しい情報に触れたとき、「なんとなく」と「具体的に」どちらから入りますか?',
  '行動様式':       '計画を立てると安心しますか? それとも動きながら考える方が自然ですか?',
  '対人距離':       '一対一の関係では、相手に合わせる方ですか? 自分のペースを保つ方ですか?',
  '社会性':         '集団の中にいるとき、中心にいる方ですか? 端から見ている方が楽ですか?',
  '変化への姿勢':   '新しいやり方と慣れたやり方、どちらに安心を感じますか?',
  '生き方の重心':   '「どうあるか」と「何をするか」、どちらがより自分の軸に近いですか?',
  '自己表現':       '自分の意見や感情を、出す方ですか? 受け取る方ですか?',
  '他者理解':       '人の話を聞くとき、感情で受け取りますか? 分析しながら聞きますか?',
  '感性':           '細かいことに気づく方ですか? 大まかに捉える方ですか?',
  '創造性':         '0から作ることと、あるものを磨くこと、どちらに喜びを感じますか?',
}

interface AxisData {
  name: string
  polarity: [string, string]
  rashisaScore: number
}

interface PublicProfile {
  axes: AxisData[]
}

export default function RashisaPage() {
  const [form, setForm] = useState({
    name: '',
    birthYear: '',
    birthMonth: '1',
    birthDay: '1',
    birthHour: '12',
    birthMinute: '00',
    birthPlace: '',
  })
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setProfile(null)

    // 出生地解決
    const coords = resolveCity(form.birthPlace)
    if (!coords) {
      setError(`「${form.birthPlace}」は対応していません。東京・大阪・名古屋などの主要都市名をお試しください。`)
      return
    }

    const birthDate = `${form.birthYear.padStart(4, '0')}-${String(form.birthMonth).padStart(2, '0')}-${String(form.birthDay).padStart(2, '0')}`
    const birthTime = `${String(form.birthHour).padStart(2, '0')}:${String(form.birthMinute).padStart(2, '0')}`

    setLoading(true)
    try {
      const res = await fetch('/api/rashisa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          birthDate,
          birthTime,
          latitude:  coords.latitude,
          longitude: coords.longitude,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '分析に失敗しました。')
        return
      }
      setProfile(data.profile as PublicProfile)
    } catch {
      setError('通信エラーが発生しました。しばらく経ってから再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rashisa-page">
      {/* ヘッダー */}
      <header className="rashisa-header">
        <div className="rashisa-header-inner">
          <Link href="/" className="rashisa-back-link">
            &larr; Fate Decoder
          </Link>
          <h1 className="rashisa-title">12軸プロファイル</h1>
          <p className="rashisa-lead">
            複数の心理測定モデルと傾向データを統合した分析結果。
            生年月日・出生地から、あなたの「らしさ」を12の軸で可視化します。
          </p>
          <p className="rashisa-privacy-note">
            名前は分析には使用しません。データは保存されません。
          </p>
        </div>
      </header>

      {/* 入力フォーム */}
      {!profile && (
        <main className="rashisa-main">
          <form className="rashisa-form" onSubmit={handleSubmit}>
            {/* 名前 */}
            <div className="rashisa-form-group">
              <label className="rashisa-label" htmlFor="r-name">
                お名前（ニックネーム可）
                <span className="rashisa-required">必須</span>
              </label>
              <input
                id="r-name"
                className="rashisa-input"
                type="text"
                placeholder="ニックネームでもOK"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            {/* 生年月日 */}
            <div className="rashisa-form-group">
              <label className="rashisa-label">
                生年月日
                <span className="rashisa-required">必須</span>
              </label>
              <div className="rashisa-date-row">
                <input
                  className="rashisa-input rashisa-input-year"
                  type="number"
                  placeholder="1990"
                  min="1900"
                  max="2050"
                  value={form.birthYear}
                  onChange={e => setForm({ ...form, birthYear: e.target.value })}
                  required
                />
                <span className="rashisa-date-sep">年</span>
                <select
                  className="rashisa-select"
                  value={form.birthMonth}
                  onChange={e => setForm({ ...form, birthMonth: e.target.value })}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{m}月</option>
                  ))}
                </select>
                <select
                  className="rashisa-select"
                  value={form.birthDay}
                  onChange={e => setForm({ ...form, birthDay: e.target.value })}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}日</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 出生時間 */}
            <div className="rashisa-form-group">
              <label className="rashisa-label">
                出生時間
                <span className="rashisa-required">必須</span>
              </label>
              <div className="rashisa-time-row">
                <select
                  className="rashisa-select"
                  value={form.birthHour}
                  onChange={e => setForm({ ...form, birthHour: e.target.value })}
                >
                  {Array.from({ length: 24 }, (_, i) => i).map(h => (
                    <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                  ))}
                </select>
                <span className="rashisa-date-sep">時</span>
                <select
                  className="rashisa-select"
                  value={form.birthMinute}
                  onChange={e => setForm({ ...form, birthMinute: e.target.value })}
                >
                  {['00', '15', '30', '45'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <span className="rashisa-date-sep">分</span>
              </div>
              <p className="rashisa-field-note">出生時間が不明な場合は 12:00 のままで構いません（精度が下がります）</p>
            </div>

            {/* 出生地 */}
            <div className="rashisa-form-group">
              <label className="rashisa-label" htmlFor="r-place">
                出生地（都市名）
                <span className="rashisa-required">必須</span>
              </label>
              <input
                id="r-place"
                className="rashisa-input"
                type="text"
                placeholder="例: 東京、大阪、福岡"
                value={form.birthPlace}
                onChange={e => setForm({ ...form, birthPlace: e.target.value })}
                required
              />
              <p className="rashisa-field-note">主要都市名（漢字）で入力してください</p>
            </div>

            {/* エラー表示 */}
            {error && (
              <div className="rashisa-error" role="alert">
                {error}
              </div>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
              className="rashisa-submit-btn"
              disabled={loading}
            >
              {loading ? '分析中...' : '12軸プロファイルを見る'}
            </button>
          </form>

          {/* ローディング */}
          {loading && (
            <div className="rashisa-loading" aria-live="polite">
              <div className="rashisa-spinner" />
              <p className="rashisa-loading-text">
                複数のモデルを統合して分析中...
              </p>
              <p className="rashisa-loading-sub">30秒ほどかかる場合があります</p>
            </div>
          )}
        </main>
      )}

      {/* 結果表示 */}
      {profile && (
        <main className="rashisa-result">
          <div className="rashisa-result-header">
            <h2 className="rashisa-result-title">
              {form.name ? `${form.name} さんの` : 'あなたの'}らしさ
            </h2>
            <p className="rashisa-result-lead">
              12の軸で表した、あなたの傾向パターンです。
              左右の位置が「らしさ」の重心を示しています。
            </p>
          </div>

          <div className="rashisa-axes">
            {profile.axes.map((axis) => {
              const score = axis.rashisaScore  // -10 〜 +10
              // -10→0% 、0→50% 、+10→100%
              const pct = ((score + 10) / 20) * 100
              const question = AXIS_QUESTIONS[axis.name] ?? null

              return (
                <div key={axis.name} className="rashisa-axis-card">
                  <div className="rashisa-axis-header">
                    <span className="rashisa-axis-name">{axis.name}</span>
                  </div>

                  {/* スライダーバー */}
                  <div className="rashisa-axis-bar-wrap" aria-label={`${axis.name}: ${axis.polarity[0]}〜${axis.polarity[1]}、位置 ${score > 0 ? '+' : ''}${score}`}>
                    <span className="rashisa-pole rashisa-pole-left">{axis.polarity[0]}</span>
                    <div className="rashisa-bar">
                      <div className="rashisa-bar-track">
                        <div
                          className="rashisa-bar-marker"
                          style={{ left: `${pct}%` }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                    <span className="rashisa-pole rashisa-pole-right">{axis.polarity[1]}</span>
                  </div>

                  {/* 体感先行の問い */}
                  {question && (
                    <p className="rashisa-axis-question">{question}</p>
                  )}
                </div>
              )
            })}
          </div>

          <div className="rashisa-result-footer">
            <p className="rashisa-disclaimer">
              この分析結果は複数の心理測定モデルと傾向データに基づいています。
              結果はあなた自身が「しっくりくるか」で判断してください。
            </p>
            <button
              className="rashisa-retry-btn"
              onClick={() => {
                setProfile(null)
                setError(null)
              }}
            >
              もう一度分析する
            </button>
          </div>
        </main>
      )}

      <footer className="rashisa-page-footer">
        <p>
          <Link href="/" className="rashisa-footer-link">Fate Decoder</Link>
          {' '}— produced by{' '}
          <a href="https://satoyama-ai-base.vercel.app" target="_blank" rel="noopener noreferrer" className="rashisa-footer-link">
            SATOYAMA AI BASE
          </a>
        </p>
      </footer>
    </div>
  )
}
