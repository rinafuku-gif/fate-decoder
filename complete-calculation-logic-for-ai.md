# 占術計算ロジック 完全仕様書

## 重要な要件

**検証データに依存しない普遍的なロジックを実装してください**

現在の実装は特定の検証データに対する補正に依存していますが、これは正しいアプローチではありません。
**どんな誕生日を入力しても正確な結果が出る、理論的に正しい計算アルゴリズム**を実装してください。

---

## 検証データ（8件）

以下の全てのデータで正確な結果が得られることを確認してください：

```typescript
const VERIFICATION_DATA = [
  { 
    date: [1979, 11, 22],
    expected: {
      kin: 93,
      stem: "癸",
      weapon: "石門星",
      sukuyo: "箕宿"
    }
  },
  { 
    date: [1982, 11, 6],
    expected: {
      stem: "癸",
      weapon: "牽牛星",
      sukuyo: "柳宿"
    }
  },
  { 
    date: [1983, 6, 4],
    expected: {
      stem: "癸",
      weapon: "司禄星",
      sukuyo: "壁宿"
    }
  },
  { 
    date: [1983, 6, 29],
    expected: {
      stem: "戊",
      weapon: "玉堂星",
      sukuyo: "危宿"
    }
  },
  { 
    date: [1986, 9, 3],
    expected: {
      stem: "庚",
      weapon: "貫索星",
      sukuyo: "翼宿"
    }
  },
  { 
    date: [1989, 10, 24],
    expected: {
      stem: "丁",
      weapon: "調舒星",
      sukuyo: "軫宿"
    }
  },
  { 
    date: [2000, 1, 1],
    expected: {
      stem: "戊",
      weapon: "司禄星",
      sukuyo: "心宿"
    }
  },
  { 
    date: [1988, 2, 20],
    expected: {
      kin: 243,
      stem: "乙",
      weapon: "石門星",
      sukuyo: "奎宿"
    }
  }
];
```

---

## 1. ユリウス通日計算（基礎関数）

```typescript
function getJulianDayNumber(y: number, m: number, d: number): number {
  if (m <= 2) { 
    y -= 1; 
    m += 12; 
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
}
```

この関数は正確に動作しているため、変更不要です。

---

## 2. マヤ暦（KIN番号）計算

```typescript
function calculateMayanKin(y: number, m: number, d: number): number {
  const jd = getJulianDayNumber(y, m, d);
  const baseJD = getJulianDayNumber(1987, 7, 26); // マヤ暦の起点
  const daysDiff = jd - baseJD;
  const kin = ((daysDiff % 260) + 260) % 260;
  return kin === 0 ? 260 : kin;
}
```

**検証：** 1979年11月22日 → KIN93 ✓

この関数は正確に動作しています。

---

## 3. 数秘術（Life Path）計算

```typescript
function calculateLifePath(y: number, m: number, d: number): number {
  const digitSum = (n: number): number => {
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
      n = String(n).split('').reduce((sum, digit) => sum + parseInt(digit), 0);
    }
    return n;
  };
  
  const yearSum = digitSum(y);
  const monthSum = digitSum(m);
  const daySum = digitSum(d);
  
  return digitSum(yearSum + monthSum + daySum);
}
```

**検証：** 1988年2月20日 → Life Path 3 ✓

この関数は正確に動作しています。

---

## 4. 太陽星座（西洋占星術）計算

```typescript
function calculateZodiac(m: number, d: number): string {
  const zodiacSigns = [
    { sign: "山羊座", until: [1, 19] },
    { sign: "水瓶座", until: [2, 18] },
    { sign: "魚座", until: [3, 20] },
    { sign: "牡羊座", until: [4, 19] },
    { sign: "牡牛座", until: [5, 20] },
    { sign: "双子座", until: [6, 21] },
    { sign: "蟹座", until: [7, 22] },
    { sign: "獅子座", until: [8, 22] },
    { sign: "乙女座", until: [9, 22] },
    { sign: "天秤座", until: [10, 23] },
    { sign: "蠍座", until: [11, 22] },
    { sign: "射手座", until: [12, 21] },
    { sign: "山羊座", until: [12, 31] }
  ];
  
  for (const { sign, until } of zodiacSigns) {
    if (m < until[0] || (m === until[0] && d <= until[1])) {
      return sign;
    }
  }
  return "山羊座";
}
```

**検証：** 1988年2月20日 → 魚座 ✓

この関数は正確に動作しています。

---

## 5. 日干（四柱推命）計算

```typescript
function calculateDayStem(y: number, m: number, d: number): string {
  const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const baseJD = getJulianDayNumber(2000, 1, 1);
  const targetJD = getJulianDayNumber(y, m, d);
  const daysDiff = targetJD - baseJD;
  const stemIndex = ((4 + daysDiff) % 10 + 10) % 10;
  return stems[stemIndex];
}
```

**検証：** 
- 1979年11月22日 → 癸 ✓
- 1988年2月20日 → 乙 ✓

この関数は正確に動作しています。

---

## 6. 中心星（算命学）計算

**【最も問題のある部分】**

### 理論的背景

算命学の中心星は以下のステップで算出されます：

1. **日干の算出**（既に正確）
2. **月支の特定**：太陽黄経による節入り日を正確に計算
   - 立春(315°), 啓蟄(345°), 清明(15°), 立夏(45°), 芒種(75°), 小暑(105°)
   - 立秋(135°), 白露(165°), 寒露(195°), 立冬(225°), 大雪(255°), 小寒(285°)
3. **蔵干の判定**：節入りからの経過日数により初気・中気・本気を判定
4. **十大主星の算出**：日干と蔵干の五行・陰陽関係から決定

### 現在の実装の問題点

```typescript
// 現在の簡易実装（不正確）
const monthBranchMap = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0];
const setsunyu = [4, 5, 6, 5, 6, 6, 8, 8, 8, 8, 7, 7]; // 固定値では年によるズレに対応できない
```

**問題：** 1989年10月24日で月支が「酉(9)」と誤判定（正解：戌月(9)のはず）

### 必要な改善

1. **太陽黄経の精密計算**：年による節入り日の変動を考慮
2. **節入り日の動的算出**：固定配列ではなく、天文計算で節入り日を特定
3. **蔵干テーブルの正確な実装**：各十二支の初気・中気・本気の日数と蔵干

### 蔵干テーブル（正確な値）

```typescript
const zokanTable: Record<string, [number, string, number, string, string]> = {
  // [初気の日数, 初気, 中気の日数, 中気, 本気]
  "子": [0, "", 0, "", "癸"],
  "丑": [9, "癸", 3, "辛", "己"],
  "寅": [7, "戊", 7, "丙", "甲"],
  "卯": [0, "", 0, "", "乙"],
  "辰": [9, "乙", 3, "癸", "戊"],
  "巳": [7, "戊", 7, "庚", "丙"],
  "午": [0, "", 9, "己", "丁"],
  "未": [9, "丁", 3, "乙", "己"],
  "申": [7, "己", 7, "壬", "庚"],
  "酉": [0, "", 0, "", "辛"],
  "戌": [9, "辛", 3, "丁", "戊"],
  "亥": [12, "甲", 0, "", "壬"]
};
```

### 十大主星の判定ロジック

```typescript
// 五行の関係 (0:比和, 1:漏気, 2:刺激, 3:攻撃, 4:授気)
const relation = (target.element - me.element + 5) % 5;
const isSamePolarity = me.polarity === target.polarity;

const starMap: Record<number, [string, string]> = {
  0: ["石門星", "貫索星"], // 比和: 陰陽異→石門、陰陽同→貫索
  1: ["調舒星", "鳳閣星"], // 漏気: 陰陽異→調舒、陰陽同→鳳閣
  2: ["司禄星", "禄存星"], // 刺激: 陰陽異→司禄、陰陽同→禄存
  3: ["牽牛星", "車騎星"], // 攻撃: 陰陽異→牽牛、陰陽同→車騎
  4: ["玉堂星", "龍高星"]  // 授気: 陰陽異→玉堂、陰陽同→龍高
};

const weapon = starMap[relation][isSamePolarity ? 1 : 0];
```

**検証データでの失敗例：**
- 1989年10月24日：調舒星が正解だが、月支判定ミスで誤った結果

---

## 7. 宿曜（東洋占星術）計算

**【最も問題のある部分】**

### 理論的背景

宿曜占星術は、以下の手順で27宿を算出します：

1. **旧暦の算出**：新月（朔）を基準とした月日の特定
2. **宿の判定**：旧暦月と旧暦日から27宿を算出

### 現在の実装の問題点

```typescript
// 太陽黄経による簡易旧暦月判定（不正確）
const midLong = getSolarLongitude(nmJD + 15);
let lunarMonth = (Math.floor(midLong / 30) + 2) % 12;

// 固定オフセットテーブル（閏月に対応できない）
const monthOffsets = [0, 22, 24, 26, 1, 3, 5, 8, 11, 13, 14, 17, 19];
```

**問題：**
- 1989年10月24日：張宿(index=8)と計算されるが、正解は軫宿(index=10)
- 1988年2月20日：婁宿(index=25)と計算されるが、正解は奎宿(index=24)

### 必要な改善

1. **正確な朔（新月）の計算**：天文計算による朔の特定
2. **閏月の判定**：中気を含まない月を閏月として処理
3. **旧暦日の正確な算出**：朔からの経過日数
4. **27宿の正確なマッピング**：旧暦月日から宿への変換

### 宿曜の理論

27宿（牛宿を除く28宿）は以下の順序で巡ります：

```
昴宿(0), 畢宿(1), 觜宿(2), 参宿(3), 井宿(4), 鬼宿(5), 柳宿(6), 
星宿(7), 張宿(8), 翼宿(9), 軫宿(10), 角宿(11), 亢宿(12), 氐宿(13), 
房宿(14), 心宿(15), 尾宿(16), 箕宿(17), 斗宿(18), 女宿(19), 虚宿(20), 
危宿(21), 室宿(22), 壁宿(23), 奎宿(24), 婁宿(25), 胃宿(26)
```

### 旧暦変換の精密アルゴリズム

```typescript
// 朔の計算（ニュートン法による収束計算）
function calculateNewMoon(jd: number): number {
  // 月の黄経λMを計算し、太陽の黄経λSと一致する点を求める
  // λM = λS のとき朔（新月）
}

// 中気の計算（太陽黄経が30度の倍数になる点）
function calculateChuki(jd: number): number {
  // 太陽黄経が 30°, 60°, 90°... になる日時を計算
}

// 閏月の判定
function isLeapMonth(jd: number): boolean {
  // 朔から次の朔までの間に中気が含まれない場合は閏月
}
```

**検証データでの失敗例：**
- 1979年11月22日：箕宿が正解（現在は補正で対応）
- 1989年10月24日：軫宿が正解だが張宿と計算される
- 1988年2月20日：奎宿が正解だが婁宿と計算される

---

## 実装要件

### 1. プログラミング言語
- TypeScript/JavaScript
- ブラウザ環境で動作（Node.js固有のAPIは使用不可）
- 外部ライブラリやAPIは使用しない（天文計算は自前で実装）

### 2. 精度要件
- **検証データ全8件で100%正確**であること
- **任意の日付で理論的に正しい結果**が得られること
- 個別の日付に対する補正（if文での特別処理）は**絶対に使用しないこと**

### 3. パフォーマンス
- 1回の診断が1秒以内に完了すること
- 反復計算（二分探索、ニュートン法など）は適切な収束条件を設定

### 4. コードの可読性
- 各関数に理論的背景のコメントを追加
- 複雑な計算式には数学的根拠を明記
- デバッグログは本番環境では削除

---

## 期待する成果物

以下の形式で、完全に動作する計算ロジックを提供してください：

```typescript
// ========================================
// 占術計算ロジック 完全版
// ========================================

// 1. ユリウス通日計算
function getJulianDayNumber(y: number, m: number, d: number): number {
  // ... 既存のコード（変更不要）
}

// 2. マヤ暦計算
function calculateMayanKin(y: number, m: number, d: number): number {
  // ... 既存のコード（変更不要）
}

// 3. 数秘術計算
function calculateLifePath(y: number, m: number, d: number): number {
  // ... 既存のコード（変更不要）
}

// 4. 太陽星座計算
function calculateZodiac(m: number, d: number): string {
  // ... 既存のコード（変更不要）
}

// 5. 日干計算
function calculateDayStem(y: number, m: number, d: number): string {
  // ... 既存のコード（変更不要）
}

// 6. 中心星計算（要改善）
function calculateCentralStar(y: number, m: number, d: number): { stem: string; weapon: string } {
  // TODO: 太陽黄経による精密な節入り日計算を実装
  // TODO: 蔵干の正確な判定を実装
  // TODO: 十大主星の算出を実装
}

// 7. 宿曜計算（要改善）
function calculateSukuyo(y: number, m: number, d: number): string {
  // TODO: 朔（新月）の精密計算を実装
  // TODO: 閏月の判定を実装
  // TODO: 旧暦月日の正確な算出を実装
  // TODO: 27宿への正確なマッピングを実装
}

// ========================================
// 検証テスト
// ========================================
console.log("=== 占術計算ロジック検証 ===\n");

VERIFICATION_DATA.forEach(({ date, expected }) => {
  const [y, m, d] = date;
  
  // 全ての占術を実行
  const kin = calculateMayanKin(y, m, d);
  const lifePath = calculateLifePath(y, m, d);
  const zodiac = calculateZodiac(m, d);
  const stem = calculateDayStem(y, m, d);
  const { weapon } = calculateCentralStar(y, m, d);
  const sukuyo = calculateSukuyo(y, m, d);
  
  // 検証
  const results = [];
  if (expected.kin) results.push(`KIN: ${kin === expected.kin ? "✓" : "✗ " + kin + " (期待: " + expected.kin + ")"}`);
  if (expected.stem) results.push(`日干: ${stem === expected.stem ? "✓" : "✗ " + stem + " (期待: " + expected.stem + ")"}`);
  if (expected.weapon) results.push(`中心星: ${weapon === expected.weapon ? "✓" : "✗ " + weapon + " (期待: " + expected.weapon + ")"}`);
  if (expected.sukuyo) results.push(`宿曜: ${sukuyo === expected.sukuyo ? "✓" : "✗ " + sukuyo + " (期待: " + expected.sukuyo + ")"}`);
  
  console.log(`${y}/${m}/${d}:`);
  results.forEach(r => console.log(`  ${r}`));
  console.log("");
});

console.log("=== 検証完了 ===");
```

---

## 重要な注意事項

1. **検証データへの過剰適合を避ける**
   - 検証データ8件だけでなく、任意の日付で正確に動作すること
   - 特定の日付に対する if 文による補正は禁止

2. **天文計算の理論的正確性**
   - 太陽黄経、月の黄経の計算には VSOP87 理論または同等の精度を使用
   - 朔（新月）の計算は±1時間以内の精度を確保

3. **閏月の正確な処理**
   - 中気を含まない月を閏月として扱う
   - 閏月は前の月の番号を繰り返す（例：閏3月）

4. **デバッグとテスト**
   - 検証データ全8件で全ての占術が ✓ になることを確認
   - 追加で10件程度のランダムな日付でも正確性を確認

---

## 参考資料

### 中心星（算命学）
- 節入り時刻は太陽黄経により正確に計算可能
- 蔵干は十二支と節入りからの経過日数で機械的に決定可能

### 宿曜（東洋占星術）
- 朔（新月）は月の黄経と太陽の黄経が一致する瞬間
- 中気は太陽黄経が30°の倍数になる瞬間
- 旧暦月は朔を1日とし、次の朔の前日を月末とする

### 天文計算
- ユリウス通日（JD）から太陽・月の黄経を計算
- 二分探索やニュートン法で特定の黄経になる日時を逆算

---

## 最終チェックリスト

実装完了後、以下を確認してください：

- [ ] 検証データ8件全てで全ての占術が正確（✓）
- [ ] 任意の日付（例：2025年1月1日、1900年1月1日など）でもエラーが発生しない
- [ ] 個別の日付に対する補正（if文）を使用していない
- [ ] 天文計算に理論的根拠がある（コメントで説明）
- [ ] コードが可読性が高く、保守しやすい
- [ ] パフォーマンスが許容範囲内（1秒以内）

---

この仕様書に基づいて、**理論的に正しく、普遍的に動作する占術計算ロジック**を実装してください。
