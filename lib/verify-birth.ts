import {
  calculateHoroscope,
  formatHoroscope,
  getDailyAstroContext,
  longitudeToSign,
  getSolarLongitude,
  getLunarLongitude,
  dateToJD,
  ZODIAC_SIGNS,
  PLANET_NAMES,
} from './horoscope-calc'

// 1989/10/24 5:58 大阪府
// 大阪: 東経135.5°、北緯34.7°
// JST 5:58 → UTC 20:58 (前日 10/23)
const jstHour = 5
const jstMin = 58
const utcDate = new Date(Date.UTC(1989, 9, 23, 20, 58, 0)) // JST 10/24 5:58 = UTC 10/23 20:58

console.log('='.repeat(70))
console.log('出生データ検証: 1989年10月24日 5:58 JST / 大阪府')
console.log('='.repeat(70))
console.log()
console.log(`UTC変換: ${utcDate.toISOString()}`)
console.log(`JD: ${dateToJD(utcDate)}`)
console.log()

const horoscope = calculateHoroscope(utcDate)

// 全天体詳細
console.log('━'.repeat(70))
console.log('【全天体位置】')
console.log('━'.repeat(70))
console.log()
console.log('天体'.padEnd(8) + '黄経'.padEnd(12) + '星座'.padEnd(10) + '度数'.padEnd(12) + '逆行')
console.log('─'.repeat(70))
for (const p of horoscope.planets) {
  const retro = p.isRetrograde ? '℞ 逆行中' : ''
  console.log(
    `${p.name.padEnd(6)} ${p.longitude.toFixed(4).padStart(10)}° ${p.sign.padEnd(8)} ${p.degree}°${p.minute.toString().padStart(2,'0')}'`.padEnd(50) + retro
  )
}

console.log()
console.log('━'.repeat(70))
console.log('【月相】')
console.log('━'.repeat(70))
console.log()
console.log(`${horoscope.moonPhase.emoji} ${horoscope.moonPhase.phase}`)
console.log(`太陽-月角度: ${horoscope.moonPhase.angle}°`)
console.log(`輝面比: ${Math.round(horoscope.moonPhase.illumination * 100)}%`)
console.log(`月の満ち欠け: ${horoscope.moonPhase.isWaxing ? '満ちていく月（ワクシング）' : '欠けていく月（ウェイニング）'}`)

console.log()
console.log('━'.repeat(70))
console.log('【アスペクト一覧】')
console.log('━'.repeat(70))
console.log()
console.log('天体ペア'.padEnd(20) + 'アスペクト'.padEnd(20) + '実角度'.padEnd(10) + 'オーブ'.padEnd(8) + '性質')
console.log('─'.repeat(70))
for (const a of horoscope.aspects) {
  console.log(
    `${a.planet1} ${a.symbol} ${a.planet2}`.padEnd(18) +
    `${a.aspect}`.padEnd(18) +
    `${a.actualAngle}°`.padEnd(10) +
    `${a.orb}°`.padEnd(8) +
    (a.nature === 'soft' ? '◯ ソフト' : a.nature === 'hard' ? '× ハード' : '● メジャー')
  )
}

console.log()
console.log('━'.repeat(70))
console.log('【エレメントバランス】（太陽〜土星の7天体）')
console.log('━'.repeat(70))
console.log()
const el = horoscope.elementBalance
const total = el.fire + el.earth + el.air + el.water
console.log(`🔥 火（牡羊・獅子・射手）: ${el.fire}/${total} ${'█'.repeat(el.fire)}`)
console.log(`🌍 地（牡牛・乙女・山羊）: ${el.earth}/${total} ${'█'.repeat(el.earth)}`)
console.log(`💨 風（双子・天秤・水瓶）: ${el.air}/${total} ${'█'.repeat(el.air)}`)
console.log(`💧 水（蟹・蠍・魚）      : ${el.water}/${total} ${'█'.repeat(el.water)}`)

console.log()
console.log('━'.repeat(70))
console.log('【クオリティバランス】（太陽〜土星の7天体）')
console.log('━'.repeat(70))
console.log()
const ql = horoscope.qualityBalance
console.log(`⚡ 活動宮（牡羊・蟹・天秤・山羊）: ${ql.cardinal}/${total} ${'█'.repeat(ql.cardinal)}`)
console.log(`🪨 固定宮（牡牛・獅子・蠍・水瓶）: ${ql.fixed}/${total} ${'█'.repeat(ql.fixed)}`)
console.log(`🌊 柔軟宮（双子・乙女・射手・魚）: ${ql.mutable}/${total} ${'█'.repeat(ql.mutable)}`)

// 各天体がどのエレメント/クオリティか内訳表示
console.log()
console.log('━'.repeat(70))
console.log('【天体別エレメント・クオリティ内訳】')
console.log('━'.repeat(70))
console.log()
const elementMap: Record<string, string> = { '牡羊座': '🔥火', '牡牛座': '🌍地', '双子座': '💨風', '蟹座': '💧水', '獅子座': '🔥火', '乙女座': '🌍地', '天秤座': '💨風', '蠍座': '💧水', '射手座': '🔥火', '山羊座': '🌍地', '水瓶座': '💨風', '魚座': '💧水' }
const qualityMap: Record<string, string> = { '牡羊座': '⚡活動', '牡牛座': '🪨固定', '双子座': '🌊柔軟', '蟹座': '⚡活動', '獅子座': '🪨固定', '乙女座': '🌊柔軟', '天秤座': '⚡活動', '蠍座': '🪨固定', '射手座': '🌊柔軟', '山羊座': '⚡活動', '水瓶座': '🪨固定', '魚座': '🌊柔軟' }

for (const p of horoscope.planets) {
  console.log(`  ${p.name}: ${p.sign} → ${elementMap[p.sign]} / ${qualityMap[p.sign]}`)
}

// 既存のfortune-calc.tsとの照合
console.log()
console.log('━'.repeat(70))
console.log('【既存Fate Decoderとの照合】')
console.log('━'.repeat(70))
console.log()

// fortune-calc.ts の calculateAll を呼んで比較
import { calculateAll } from './fortune-calc'
const existing = calculateAll(1989, 10, 24)
console.log(`Fate Decoder 太陽星座: ${existing.western.sign}`)
console.log(`ホロスコープ 太陽星座: ${horoscope.planets[0].sign}`)
console.log(`一致: ${existing.western.sign === horoscope.planets[0].sign ? '✅' : '❌'}`)
console.log()
console.log(`Fate Decoder 算命学日干: ${existing.sanmeigaku.dayStem}`)
console.log(`Fate Decoder 宿曜: ${existing.sukuyo}`)
console.log(`Fate Decoder マヤ暦 KIN: ${existing.maya.kin} / 紋章: ${existing.maya.glyph} / 音: ${existing.maya.tone}`)
console.log(`Fate Decoder 数秘: ライフパス ${existing.numerology.lp}`)
