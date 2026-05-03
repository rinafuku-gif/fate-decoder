/**
 * Design時刻の計算
 * 出生時の太陽位置から黄経88度逆算した日時を求める
 * sweph (Swiss Ephemeris Moshier) 使用
 */

import sweph from 'sweph'
import { dateToJDE, jdeToDate } from './calculate'

const SE_SUN    = 0
const SEFLG_SWIEPH = 2

/**
 * 指定JDEの太陽黄経を返す（0-360度）
 */
function sunLonAtJDE(jde: number): number {
  const result = sweph.calc(jde, SE_SUN, SEFLG_SWIEPH) as {
    flag: number; error: string; data: number[]
  }
  return result.data[0]
}

/**
 * 2つの黄経の差分（-180〜180度）
 */
function lonDiff(lon1: number, lon2: number): number {
  let diff = lon1 - lon2
  while (diff > 180)  diff -= 360
  while (diff < -180) diff += 360
  return diff
}

/**
 * 出生日時のUTC Dateから、太陽が88度手前（逆行）にあった日時を計算
 * Design時刻 = 出生時太陽黄経 - 88度 の位置を太陽が通過した時刻
 * 二分法で ±0.0001度以内（数秒精度）に収束
 */
export function calculateDesignTime(birthUtc: Date): Date {
  const birthJDE = dateToJDE(birthUtc)
  const birthSunLon = sunLonAtJDE(birthJDE)

  // ターゲット黄経 = 出生時の太陽黄経 - 88度
  const targetLon = ((birthSunLon - 88) + 360) % 360

  // 太陽は1日約1度進む → 88度前 ≈ 88日前
  // 探索範囲: ±5日のマージン
  let jdeMin = birthJDE - 93
  let jdeMax = birthJDE - 83

  // 二分法で精密化
  let iterations = 0
  while (jdeMax - jdeMin > 1e-7 && iterations < 100) {
    const jdeMid = (jdeMin + jdeMax) / 2
    const diffMid = lonDiff(sunLonAtJDE(jdeMid), targetLon)
    const diffMin = lonDiff(sunLonAtJDE(jdeMin), targetLon)

    if (diffMid * diffMin < 0) {
      jdeMax = jdeMid
    } else {
      jdeMin = jdeMid
    }
    iterations++
  }

  const designJDE = (jdeMin + jdeMax) / 2
  return jdeToDate(designJDE)
}
