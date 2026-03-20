import { calculateHoroscope, longitudeToSign } from './horoscope-calc'

// 1989/10/24 5:58 JST → UTC 10/23 20:58
// 大阪（吹田）: 東経135.5°(135°30'57"), 北緯34.76°(34°45'42")
const utcDate = new Date(Date.UTC(1989, 9, 23, 20, 58, 0))
const horoscope = calculateHoroscope(utcDate, { latitude: 34.76, longitude: 135.5 })

// astro.com の正解データ
const astroComData: Record<string, { sign: string; deg: number; min: number }> = {
  '太陽':     { sign: '蠍座',   deg: 0,  min: 25 },
  '月':       { sign: '獅子座', deg: 27, min: 18 },
  '水星':     { sign: '天秤座', deg: 18, min: 45 },
  '金星':     { sign: '射手座', deg: 16, min: 46 },
  '火星':     { sign: '天秤座', deg: 22, min: 25 },
  '木星':     { sign: '蟹座',   deg: 10, min: 49 },
  '土星':     { sign: '山羊座', deg: 8,  min: 44 },
  '天王星':   { sign: '山羊座', deg: 2,  min: 8  },
  '海王星':   { sign: '山羊座', deg: 9,  min: 53 },
  '冥王星':   { sign: '蠍座',   deg: 14, min: 31 },
  '正真交点': { sign: '水瓶座', deg: 23, min: 34 },
  'カイロン': { sign: '蟹座',   deg: 16, min: 35 },
}

// astro.com のアングル
const astroComAngles = {
  asc: { sign: '天秤座', deg: 26, min: 55 },
  mc:  { sign: '獅子座', deg: 0,  min: 31 },
}

console.log('━'.repeat(80))
console.log('astro.com との完全照合: 1989/10/24 5:58 JST / 大阪（吹田）')
console.log('━'.repeat(80))
console.log()

// 天体比較テーブル
console.log('天体'.padEnd(10) + '│ astro.com'.padEnd(24) + '│ 計算結果'.padEnd(24) + '│ 差分'.padEnd(10) + '│ 判定')
console.log('─'.repeat(80))

let allMatch = true
for (const p of horoscope.planets) {
  const ref = astroComData[p.name]
  if (!ref) continue

  const refTotal = ref.deg * 60 + ref.min  // 分単位
  const calcTotal = p.degree * 60 + p.minute
  const diffMin = calcTotal - refTotal
  const signMatch = p.sign === ref.sign

  const refStr = `${ref.sign} ${ref.deg}°${ref.min.toString().padStart(2,'0')}'`
  const calcStr = `${p.sign} ${p.degree}°${p.minute.toString().padStart(2,'0')}'`
  const diffStr = `${diffMin >= 0 ? '+' : ''}${diffMin}'`
  const verdict = signMatch && Math.abs(diffMin) <= 2 ? '✅ 完全一致'
                : signMatch && Math.abs(diffMin) <= 15 ? '⚠️ 微差'
                : signMatch && Math.abs(diffMin) <= 60 ? '△ 要改善'
                : '❌ 不一致'

  if (Math.abs(diffMin) > 15) allMatch = false

  console.log(
    `${p.name.padEnd(8)} │ ${refStr.padEnd(22)} │ ${calcStr.padEnd(22)} │ ${diffStr.padEnd(8)} │ ${verdict}`
  )
}

// アングル比較
console.log()
console.log('─'.repeat(80))
console.log('アングル比較:')
console.log('─'.repeat(80))

if (horoscope.angles.asc) {
  const asc = horoscope.angles.asc
  const mc = horoscope.angles.mc!
  const refAsc = astroComAngles.asc
  const refMc = astroComAngles.mc

  const ascDiff = (asc.degree * 60 + asc.minute) - (refAsc.deg * 60 + refAsc.min)
  const mcDiff = (mc.degree * 60 + mc.minute) - (refMc.deg * 60 + refMc.min)

  console.log(`ASC: astro.com ${refAsc.sign} ${refAsc.deg}°${refAsc.min.toString().padStart(2,'0')}' │ 計算 ${asc.sign} ${asc.degree}°${asc.minute.toString().padStart(2,'0')}' │ 差 ${ascDiff >= 0 ? '+' : ''}${ascDiff}' │ ${asc.sign === refAsc.sign && Math.abs(ascDiff) <= 60 ? '✅' : '❌'}`)
  console.log(`MC : astro.com ${refMc.sign} ${refMc.deg}°${refMc.min.toString().padStart(2,'0')}' │ 計算 ${mc.sign} ${mc.degree}°${mc.minute.toString().padStart(2,'0')}' │ 差 ${mcDiff >= 0 ? '+' : ''}${mcDiff}' │ ${mc.sign === refMc.sign && Math.abs(mcDiff) <= 60 ? '✅' : '❌'}`)
}

console.log()
console.log('━'.repeat(80))
console.log('全データ出力:')
console.log('━'.repeat(80))
console.log()

// フル出力
for (const p of horoscope.planets) {
  const retro = p.isRetrograde ? ' ℞' : '  '
  console.log(`  ${p.nameEn.padEnd(12)} ${p.name.padEnd(6)} ${p.sign.padEnd(6)} ${p.degree.toString().padStart(2)}°${p.minute.toString().padStart(2,'0')}'${retro}  (黄経 ${p.longitude.toFixed(4)}°)`)
}

if (horoscope.angles.asc) {
  console.log()
  console.log(`  ASC  上昇点  ${horoscope.angles.asc.displayDegree}  (黄経 ${horoscope.angles.asc.longitude.toFixed(4)}°)`)
  console.log(`  MC   天頂    ${horoscope.angles.mc!.displayDegree}  (黄経 ${horoscope.angles.mc!.longitude.toFixed(4)}°)`)
  console.log(`  DSC  下降点  ${horoscope.angles.dsc!.displayDegree}  (黄経 ${horoscope.angles.dsc!.longitude.toFixed(4)}°)`)
  console.log(`  IC   天底    ${horoscope.angles.ic!.displayDegree}  (黄経 ${horoscope.angles.ic!.longitude.toFixed(4)}°)`)
}

// 月相
console.log()
console.log(`  月相: ${horoscope.moonPhase.emoji} ${horoscope.moonPhase.phase} (輝面 ${Math.round(horoscope.moonPhase.illumination * 100)}%)`)
