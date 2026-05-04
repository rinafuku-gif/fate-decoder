/**
 * 天体位置計算モジュール
 * sweph (Swiss Ephemeris Moshier) を使用
 */

import sweph from 'sweph'

// sweph planet IDs
const SE_SUN       = 0
const SE_MOON      = 1
const SE_MERCURY   = 2
const SE_VENUS     = 3
const SE_MARS      = 4
const SE_JUPITER   = 5
const SE_SATURN    = 6
const SE_URANUS    = 7
const SE_NEPTUNE   = 8
const SE_PLUTO     = 9
const SE_TRUE_NODE = 11

const SEFLG_SWIEPH = 2
const SEFLG_SPEED  = 256

export interface PlanetLongitudes {
  sun: number      // 黄経度数 0-360
  earth: number    // 太陽の対向 (sun + 180) % 360
  moon: number
  mercury: number
  venus: number
  mars: number
  jupiter: number
  saturn: number
  uranus: number
  neptune: number
  pluto: number
  northNode: number   // True Node（HD公式仕様）
  southNode: number   // (northNode + 180) % 360
}

/**
 * UTC DateオブジェクトをJulian Day Numberに変換
 */
export function dateToJDE(date: Date): number {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1
  const d = date.getUTCDate() +
    (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) / 24

  // Gregorian Calendar to JD (standard formula)
  let YY = y
  let MM = m
  if (m <= 2) { YY--; MM += 12 }
  const A = Math.floor(YY / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (YY + 4716)) + Math.floor(30.6001 * (MM + 1)) + d + B - 1524.5
}

/**
 * Julian Day Number を UTC Date に変換
 */
export function jdeToDate(jde: number): Date {
  const z = Math.floor(jde + 0.5)
  const f = jde + 0.5 - z
  let a: number
  if (z < 2299161) {
    a = z
  } else {
    const alpha = Math.floor((z - 1867216.25) / 36524.25)
    a = z + 1 + alpha - Math.floor(alpha / 4)
  }
  const b = a + 1524
  const c = Math.floor((b - 122.1) / 365.25)
  const d = Math.floor(365.25 * c)
  const e = Math.floor((b - d) / 30.6001)

  const day = b - d - Math.floor(30.6001 * e)
  const month = e < 14 ? e - 1 : e - 13
  const year = month > 2 ? c - 4716 : c - 4715

  const dayFrac = day + f
  const dayInt = Math.floor(dayFrac)
  const hours = (dayFrac - dayInt) * 24
  const h = Math.floor(hours)
  const mins = (hours - h) * 60
  const min = Math.floor(mins)
  const secs = (mins - min) * 60
  const sec = Math.floor(secs)

  return new Date(Date.UTC(year, month - 1, dayInt, h, min, sec))
}

/**
 * 指定JDEの1惑星の黄経を取得
 */
function getPlanetLon(jde: number, planetId: number): number {
  const result = sweph.calc(jde, planetId, SEFLG_SWIEPH | SEFLG_SPEED) as {
    flag: number
    error: string
    data: number[]
  }
  return result.data[0]
}

/**
 * 指定UTCDateTimeの惑星黄経を計算
 */
export function calculatePlanetLongitudes(utcDate: Date): PlanetLongitudes {
  const jde = dateToJDE(utcDate)

  const sunLon = getPlanetLon(jde, SE_SUN)
  const earthLon = (sunLon + 180) % 360
  const northNodeLon = getPlanetLon(jde, SE_TRUE_NODE)
  const southNodeLon = (northNodeLon + 180) % 360

  return {
    sun:       sunLon,
    earth:     earthLon,
    moon:      getPlanetLon(jde, SE_MOON),
    mercury:   getPlanetLon(jde, SE_MERCURY),
    venus:     getPlanetLon(jde, SE_VENUS),
    mars:      getPlanetLon(jde, SE_MARS),
    jupiter:   getPlanetLon(jde, SE_JUPITER),
    saturn:    getPlanetLon(jde, SE_SATURN),
    uranus:    getPlanetLon(jde, SE_URANUS),
    neptune:   getPlanetLon(jde, SE_NEPTUNE),
    pluto:     getPlanetLon(jde, SE_PLUTO),
    northNode: northNodeLon,
    southNode: southNodeLon,
  }
}
