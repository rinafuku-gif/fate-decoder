/**
 * POST /api/rashisa
 *
 * らしさプロファイル算出 API
 * 設計書 §6.3 PublicProfile のみを返す（占術名・生データを露出しない）
 *
 * Node ランタイム必須（sweph 依存）
 *
 * 注意: sweph はネイティブモジュールのため、ビルド時の静的解析を避けるため
 *       動的インポートを使用して実行時のみロードする。
 */

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import type { ChartInput } from '@/lib/rashisa/types'

// ---------- バリデーション ----------

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  if (y < 1900 || y > 2100) return false
  if (m < 1 || m > 12) return false
  if (d < 1 || d > 31) return false
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

function isValidTime(s: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(s)) return false
  const [h, min] = s.split(':').map(Number)
  return h >= 0 && h <= 23 && min >= 0 && min <= 59
}

function isValidLatitude(v: number): boolean {
  return typeof v === 'number' && v >= -90 && v <= 90
}

function isValidLongitude(v: number): boolean {
  return typeof v === 'number' && v >= -180 && v <= 180
}

// ---------- POST ハンドラ ----------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<ChartInput>

    // 必須フィールド検証
    const missing: string[] = []
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      missing.push('name')
    }
    if (!body.birthDate) missing.push('birthDate')
    if (!body.birthTime) missing.push('birthTime')
    if (body.latitude === undefined || body.latitude === null) missing.push('latitude')
    if (body.longitude === undefined || body.longitude === null) missing.push('longitude')

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `必須フィールドが不足しています: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    // フォーマット検証
    if (!isValidDate(body.birthDate!)) {
      return NextResponse.json(
        { error: 'birthDate の形式が正しくありません（YYYY-MM-DD）' },
        { status: 400 }
      )
    }
    if (!isValidTime(body.birthTime!)) {
      return NextResponse.json(
        { error: 'birthTime の形式が正しくありません（HH:MM）' },
        { status: 400 }
      )
    }
    if (!isValidLatitude(body.latitude!)) {
      return NextResponse.json(
        { error: 'latitude は -90〜90 の数値である必要があります' },
        { status: 400 }
      )
    }
    if (!isValidLongitude(body.longitude!)) {
      return NextResponse.json(
        { error: 'longitude は -180〜180 の数値である必要があります' },
        { status: 400 }
      )
    }

    const input: ChartInput = {
      name:      body.name!.trim(),
      birthDate: body.birthDate!,
      birthTime: body.birthTime!,
      latitude:  body.latitude!,
      longitude: body.longitude!,
      timezone:  body.timezone,
    }

    // 動的インポート（sweph ネイティブモジュールのビルド時解析を回避）
    const { calculateRashisaProfile, toPublicProfile } = await import('@/lib/rashisa/engine')

    // 計算実行
    const profile = calculateRashisaProfile(input)

    // §6.3 PublicProfile のみ返す（占術名・生データを露出しない）
    const publicProfile = toPublicProfile(profile)

    return NextResponse.json({ profile: publicProfile })
  } catch (error) {
    // 内部エラー詳細はクライアントに露出しない
    return NextResponse.json(
      { error: '分析中にエラーが発生しました。しばらく経ってから再度お試しください。' },
      { status: 500 }
    )
  }
}
