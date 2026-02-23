# 中心星（算命学）と宿曜（27宿）の計算ロジック修正依頼

## 現在の問題

以下の検証データで計算が正確ではありません。特に1989年10月24日で大きなずれが発生しています。

### 検証データ（全7件）

| 日付 | 日干（正解） | 中心星（正解） | 宿曜（正解） |
|------|------------|--------------|------------|
| 1979.11.22 | 癸 | 石門星 | 箕宿 |
| 1982.11.6 | 癸 | 牽牛星 | 柳宿 |
| 1983.6.4 | 癸 | 司禄星 | 壁宿 |
| 1983.6.29 | 戊 | 玉堂星 | 危宿 |
| 1986.9.3 | 庚 | 貫索星 | 翼宿 |
| **1989.10.24** | **丁** | **調舒星** | **軫宿** |
| 2000.1.1 | 戊 | 司禄星 | 心宿 |

### 現在の計算結果と問題点

#### 1979年11月22日
- 日干：癸 ✓
- 中心星：石門星 ✓
- 宿曜：箕宿 ✓（monthOffsetsを微調整して修正済み）

#### 1989年10月24日（重大なエラー）
```
日干=丁 ✓
月支=10（亥月） ✗ → 正しくは戌月(9)
蔵干=壬 ✗ → 正しくは戊
五行関係=3（攻撃） ✗ → 正しくは1（漏気）
同極性=false
中心星=牽牛星 ✗ → 正解：調舒星

旧暦=8月25日 ✗
太陽黄経=201.99°
baseOffset=11
index=8
宿曜=張宿 ✗ → 正解：軫宿(index=10)
```

## 問題の原因

### 1. 中心星計算（算命学）の問題

**節入り日の精度不足**
```typescript
// 現在のコード
const setsunyu = [4, 6, 5, 5, 6, 7, 8, 8, 8, 8, 7, 6] // 各月の節入り日（精密版）
```

1989年10月24日は霜降（10月23日頃）の翌日なので、本来は戌月(9)であるべきですが、節入り日が8日と設定されているため、24日>8日で当月扱い（亥月10）と誤判定されています。

**正しい節入り日の算出が必要：**
- 二十四節気の正確な日時を天文計算で導出する必要があります
- 現在の固定配列では年ごとのずれに対応できません

**蔵干の導出**
```typescript
// 現在のコード
const branchToZokan: Record<number, string> = {
  0: "己", 1: "甲", 2: "乙", 3: "戊", 4: "丙", 5: "丁",
  6: "己", 7: "庚", 8: "辛", 9: "戊", 10: "壬", 11: "癸"
}
```

各月支には初気・中気・本気の3つの蔵干があり、節入りからの経過日数によって変わります。現在は単純に本気の蔵干のみを使用していますが、日にちによって切り替える必要があります。

**例：戌月（index=9）の蔵干**
- 初気（1-9日目）：辛
- 中気（10-12日目）：丁
- 本気（13日目以降）：戊

### 2. 宿曜計算の問題

**太陽黄経による旧暦月判定が不正確**
```typescript
// 現在のコード
const nmJD = jd - age
const T = (nmJD + 15 - 2451545.0) / 36525.0
let lambda = (L0 + C) % 360
let lunarMonth = (Math.floor(lambda / 30) + 2) % 12
```

1989年10月24日で旧暦8月25日と判定されていますが、実際には異なる可能性があります。太陽黄経201.99°から旧暦月を導出する計算式が不正確です。

**monthOffsetsテーブルも不完全**
```typescript
const monthOffsets = [0, 22, 24, 26, 1, 3, 5, 8, 11, 13, 14, 17, 19]
```

10月のオフセットを15→14に微調整して1979年11月22日は修正できましたが、1989年10月24日では別のずれが発生しています。これは、旧暦月の判定自体が間違っているためです。

## 修正依頼

以下の2つの関数を、検証データ全7件で100%正確な結果が出るように修正してください。

### 1. calculateBazi（中心星計算）

**必要な修正：**
- 二十四節気の正確な日時計算（天文計算式を使用）
- 節入りからの経過日数に基づく蔵干の判定（初気・中気・本気）
- 五行・陰陽の組み合わせから十大主星を正確に算出

### 2. calculateSukuyo（宿曜計算）

**必要な修正：**
- 正確な旧暦変換ロジック（実測データベースまたは精密な天文計算）
- 旧暦月・旧暦日の正確な判定
- 月ごとの宿オフセットテーブルの精密化

## 現在のコード

```typescript
// ユリウス通日計算
function getJulianDayNumber(y: number, m: number, d: number): number {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5
}

// 日干計算（完璧に動作中）
function calculateDayStem(y: number, m: number, d: number): string {
  const stems = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"]
  const baseJD = getJulianDayNumber(2000, 1, 1)
  const targetJD = getJulianDayNumber(y, m, d)
  const daysDiff = targetJD - baseJD
  const stemIndex = ((4 + daysDiff) % 10 + 10) % 10
  return stems[stemIndex]
}

// 中心星計算（修正が必要）
function calculateBazi(y: number, m: number, d: number): { stem: string; weapon: string } {
  const stems = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"]
  const dayStem = calculateDayStem(y, m, d)
  const stemIndex = stems.indexOf(dayStem)
  
  // 月支の計算（節入り考慮：精密版）
  const monthBranchMap = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0] // 1月～12月
  const setsunyu = [4, 6, 5, 5, 6, 7, 8, 8, 8, 8, 7, 6] // ← この固定配列が問題
  let monthBranchIndex: number
  
  if (d < setsunyu[m - 1]) {
    const prevMonth = m - 1 === 0 ? 12 : m - 1
    monthBranchIndex = monthBranchMap[prevMonth - 1]
  } else {
    monthBranchIndex = monthBranchMap[m - 1]
  }
  
  // 蔵干の導出（本気のみ、経過日数を考慮していない）
  const branchToZokan: Record<number, string> = {
    0: "己", 1: "甲", 2: "乙", 3: "戊", 4: "丙", 5: "丁",
    6: "己", 7: "庚", 8: "辛", 9: "戊", 10: "壬", 11: "癸"
  }
  const zokan = branchToZokan[monthBranchIndex] || "戊"
  
  // 五行・陰陽マッピング
  const stemInfo: Record<string, { element: number; polarity: number }> = {
    "甲": { element: 0, polarity: 1 }, "乙": { element: 0, polarity: -1 },
    "丙": { element: 1, polarity: 1 }, "丁": { element: 1, polarity: -1 },
    "戊": { element: 2, polarity: 1 }, "己": { element: 2, polarity: -1 },
    "庚": { element: 3, polarity: 1 }, "辛": { element: 3, polarity: -1 },
    "壬": { element: 4, polarity: 1 }, "癸": { element: 4, polarity: -1 }
  }
  
  const me = stemInfo[dayStem]
  const target = stemInfo[zokan]
  
  const relation = (target.element - me.element + 5) % 5
  const isSameStem = dayStem === zokan
  const isSamePolarity = me.polarity === target.polarity
  
  const starMap: Record<number, [string, string]> = {
    0: ["石門星", "貫索星"],
    1: ["調舒星", "鳳閣星"],
    2: ["司禄星", "禄存星"],
    3: ["牽牛星", "車騎星"],
    4: ["玉堂星", "龍高星"]
  }
  
  const weapon = (relation === 0 && isSameStem) ? "石門星" : starMap[relation][isSamePolarity ? 1 : 0]
  
  return { stem: dayStem, weapon: weapon }
}

// 宿曜計算（修正が必要）
function calculateSukuyo(y: number, m: number, d: number): string {
  const mansions = ["昴宿","畢宿","觜宿","参宿","井宿","鬼宿","柳宿","星宿","張宿","翼宿","軫宿","角宿","亢宿","氐宿","房宿","心宿","尾宿","箕宿","斗宿","女宿","虚宿","危宿","室宿","壁宿","奎宿","婁宿","胃宿"]
  
  const jd = getJulianDayNumber(y, m, d)
  
  // 1. 旧暦日の算出（基準新月からの月齢計算）
  const baseNM = 2451550.26 // 2000年1月6日 18:14 JST
  const synodic = 29.530588853
  const diff = jd - baseNM
  const age = ((diff % synodic) + synodic) % synodic
  const lunarDay = Math.floor(age + 0.5) + 1
  
  // 2. 旧暦月の算出（太陽黄経による中気判定）← この部分が不正確
  const nmJD = jd - age
  const T = (nmJD + 15 - 2451545.0) / 36525.0
  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T
  let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T
  L0 %= 360; M %= 360
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * Math.PI / 180) +
            (0.019993 - 0.000101 * T) * Math.sin(2 * M * Math.PI / 180) +
            0.000289 * Math.sin(3 * M * Math.PI / 180)
  let lambda = (L0 + C) % 360
  if (lambda < 0) lambda += 360
  
  let lunarMonth = (Math.floor(lambda / 30) + 2) % 12
  if (lunarMonth === 0) lunarMonth = 12
  
  // 3. 宿曜の算出（月ごとの宿オフセット + 旧暦日）
  const monthOffsets = [0, 22, 24, 26, 1, 3, 5, 8, 11, 13, 14, 17, 19] // ← 微調整済みだが不完全
  const baseOffset = monthOffsets[lunarMonth]
  const sukuyoIndex = (baseOffset + (lunarDay - 1)) % 27
  
  return mansions[sukuyoIndex]
}
```

## 期待する成果物

1. **修正済みの calculateBazi 関数**
   - 検証データ全7件で正確な中心星を算出
   - 特に1989年10月24日で「調舒星」が正しく出力される

2. **修正済みの calculateSukuyo 関数**
   - 検証データ全7件で正確な宿曜を算出
   - 特に1989年10月24日で「軫宿」が正しく出力される

3. **検証テストコード**
   ```typescript
   const VERIFICATION_DATA = [
     { date: [1979, 11, 22], expected: { stem: "癸", weapon: "石門星", sukuyo: "箕宿" } },
     { date: [1982, 11, 6], expected: { stem: "癸", weapon: "牽牛星", sukuyo: "柳宿" } },
     { date: [1983, 6, 4], expected: { stem: "癸", weapon: "司禄星", sukuyo: "壁宿" } },
     { date: [1983, 6, 29], expected: { stem: "戊", weapon: "玉堂星", sukuyo: "危宿" } },
     { date: [1986, 9, 3], expected: { stem: "庚", weapon: "貫索星", sukuyo: "翼宿" } },
     { date: [1989, 10, 24], expected: { stem: "丁", weapon: "調舒星", sukuyo: "軫宿" } },
     { date: [2000, 1, 1], expected: { stem: "戊", weapon: "司禄星", sukuyo: "心宿" } }
   ]
   
   // 全てのテストで ✓ が表示されること
   ```

## 重要な制約

- TypeScript/JavaScriptで実装してください
- 外部ライブラリは使用せず、純粋な数学計算で実装してください
- コメントで計算ロジックの説明を記載してください
- 検証データ全7件で100%の精度を達成してください

## 参考情報

- 二十四節気の計算式は、天文計算の標準的な手法（太陽黄経に基づく）を使用してください
- 蔵干は節入りからの経過日数で初気・中気・本気を判定します
- 旧暦変換は新月（朔）の正確な計算が必要です
- 宿曜は旧暦の月と日の組み合わせで27宿を循環します

よろしくお願いします。
