/**
 * 占術計算ロジック 完全修正版
 * 算命学（蔵干判定）および宿曜（旧暦変換）を精密化
 * 
 * 【このファイルの用途】
 * 別のAIに渡して、page.tsxに統合する前に計算ロジックが正確であることを検証するためのファイルです。
 * 全ての検証データで ✓ が出ることを確認してから、page.tsxに統合してください。
 * 
 * 【検証データ】
 * 1979.11.22 = 日干「癸」、中心星「石門星」、宿曜「箕宿」
 * 1982.11.6 = 日干「癸」、中心星「牽牛星」、宿曜「柳宿」
 * 1983.6.4 = 日干「癸」、中心星「司禄星」、宿曜「壁宿」
 * 1983.6.29 = 日干「戊」、中心星「玉堂星」、宿曜「危宿」
 * 1986.9.3 = 日干「庚」、中心星「貫索星」、宿曜「翼宿」
 * 1989.10.24 = 日干「丁」、中心星「調舒星」、宿曜「軫宿」
 * 2000.1.1 = 日干「戊」、中心星「司禄星」、宿曜「心宿」
 */

// --- 基礎定数 ---
const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const STAR_MAP: Record<number, [string, string]> = {
  0: ["石門星", "貫索星"], // 比和: 陰陽異→石門、陰陽同→貫索
  1: ["調舒星", "鳳閣星"], // 漏気: 陰陽異→調舒、陰陽同→鳳閣
  2: ["司禄星", "禄存星"], // 刺激: 陰陽異→司禄、陰陽同→禄存
  3: ["牽牛星", "車騎星"], // 攻撃: 陰陽異→牽牛、陰陽同→車騎
  4: ["玉堂星", "龍高星"]  // 授気: 陰陽異→玉堂、陰陽同→龍高
};
const MANSIONS = ["昴宿","畢宿","觜宿","参宿","井宿","鬼宿","柳宿","星宿","張宿","翼宿","軫宿","角宿","亢宿","氐宿","房宿","心宿","尾宿","箕宿","斗宿","女宿","虚宿","危宿","室宿","壁宿","奎宿","婁宿","胃宿"];

// --- 1. 天文計算ヘルパー（正確なユリウス通日計算） ---
function getJDN(y: number, m: number, d: number): number {
  if (m <= 2) { 
    y -= 1; 
    m += 12; 
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
}

// --- 2. 算命学：中心星（十大主星）計算 ---
function calculateCentralStar(y: number, m: number, d: number) {
  const jd = getJDN(y, m, d);
  const dayStemIdx = Math.floor(jd + 9) % 10;
  const dayStem = STEMS[dayStemIdx];

  // 節入り日計算（簡易精密式）
  const getSetsunyu = (year: number, month: number) => {
    const base = [6.5, 4.5, 6.3, 5.3, 5.8, 6.3, 7.8, 8.3, 8.3, 9.3, 8.3, 7.8];
    const offset = (year - 2000) * 0.2422 - Math.floor((year - 2000) / 4);
    return Math.floor(base[month - 1] + offset);
  };

  const setsunyuDay = getSetsunyu(y, m);
  let monthIdx = (m + 10) % 12; // 1月->丑(1), 2月->寅(2), ..., 11月->子(11), 12月->丑(0)
  let isBefore = d < setsunyuDay;
  if (isBefore) monthIdx = (monthIdx + 11) % 12;
  
  const branch = BRANCHES[monthIdx];
  const elapsed = isBefore ? d + 15 : d - setsunyuDay + 1; // 節入りからの経過日数（概算）

  // 蔵干判定（各十二支の初気・中気・本気の継続日数）
  const getZokan = (br: string, day: number): string => {
    const table: Record<string, [number, string, number, string, string]> = {
      "寅": [7, "戊", 7, "丙", "甲"], "卯": [10, "甲", 0, "", "乙"], "辰": [9, "乙", 3, "癸", "戊"],
      "巳": [5, "戊", 9, "庚", "丙"], "午": [10, "丙", 9, "己", "丁"], "未": [9, "丁", 3, "乙", "己"],
      "申": [10, "戊", 3, "壬", "庚"], "酉": [10, "庚", 0, "", "辛"], "戌": [9, "辛", 3, "丁", "戊"],
      "亥": [10, "甲", 0, "", "壬"], "子": [10, "壬", 0, "", "癸"], "丑": [9, "癸", 3, "辛", "己"]
    };
    const [d1, s1, d2, s2, s3] = table[br];
    if (day <= d1) return s1;
    if (day <= d1 + d2) return s2;
    return s3;
  };

  const zokan = getZokan(branch, elapsed);
  
  // 五行・陰陽の相性判定
  const stemInfo: Record<string, { ele: number; pol: number }> = {
    "甲": { ele: 0, pol: 1 }, "乙": { ele: 0, pol: -1 }, 
    "丙": { ele: 1, pol: 1 }, "丁": { ele: 1, pol: -1 },
    "戊": { ele: 2, pol: 1 }, "己": { ele: 2, pol: -1 }, 
    "庚": { ele: 3, pol: 1 }, "辛": { ele: 3, pol: -1 },
    "壬": { ele: 4, pol: 1 }, "癸": { ele: 4, pol: -1 }
  };
  
  const me = stemInfo[dayStem];
  const target = stemInfo[zokan];
  const rel = (target.ele - me.ele + 5) % 5;
  const isSamePol = me.pol === target.pol;
  
  return { stem: dayStem, weapon: STAR_MAP[rel][isSamePol ? 1 : 0] };
}

// --- 3. 宿曜：旧暦変換・27宿計算 ---
function calculateSukuyo(y: number, m: number, d: number): string {
  const jd = getJDN(y, m, d);
  // 基準新月 (2000-01-06 18:14 UTC)
  const baseNM = 2451550.26;
  const lunation = 29.530588853;
  
  const k = Math.round((jd - baseNM) / lunation);
  const currentNM = baseNM + k * lunation;
  let lunarDay = Math.floor(jd - currentNM);
  if (lunarDay < 0) {
    const prevNM = baseNM + (k - 1) * lunation;
    lunarDay = Math.floor(jd - prevNM);
  }
  lunarDay += 1;

  // 旧暦月の概算
  const totalMonths = k + 12 * (2000 - 1900) + 1;
  const lunarMonth = ((totalMonths % 12) + 12) % 12 || 12;

  // 月ごとの宿開始オフセット (0:昴)
  const monthBase = [21, 23, 25, 0, 2, 4, 7, 10, 12, 14, 17, 19]; 
  const resIdx = (monthBase[lunarMonth - 1] + lunarDay - 1) % 27;
  
  return MANSIONS[resIdx];
}

// --- 検証データ（同じ占いサイトから取得した7件） ---
const VERIFICATION_DATA = [
  { date: [1979, 11, 22], expected: { stem: "癸", weapon: "石門星", sukuyo: "箕宿" } },
  { date: [1982, 11, 6], expected: { stem: "癸", weapon: "牽牛星", sukuyo: "柳宿" } },
  { date: [1983, 6, 4], expected: { stem: "癸", weapon: "司禄星", sukuyo: "壁宿" } },
  { date: [1983, 6, 29], expected: { stem: "戊", weapon: "玉堂星", sukuyo: "危宿" } },
  { date: [1986, 9, 3], expected: { stem: "庚", weapon: "貫索星", sukuyo: "翼宿" } },
  { date: [1989, 10, 24], expected: { stem: "丁", weapon: "調舒星", sukuyo: "軫宿" } },
  { date: [2000, 1, 1], expected: { stem: "戊", weapon: "司禄星", sukuyo: "心宿" } }
];

// --- 検証テスト実行 ---
console.log("=== 占術計算ロジック検証テスト ===\n");

VERIFICATION_DATA.forEach(({ date, expected }) => {
  const [y, m, d] = date;
  const bazi = calculateCentralStar(y, m, d);
  const sukuyo = calculateSukuyo(y, m, d);
  
  const stemMatch = bazi.stem === expected.stem;
  const weaponMatch = bazi.weapon === expected.weapon;
  const sukuyoMatch = sukuyo === expected.sukuyo;
  const allMatch = stemMatch && weaponMatch && sukuyoMatch;
  
  console.log(`${y}/${m}/${d}: ${allMatch ? "✓ 全一致" : "✗ 不一致"}`);
  console.log(`  日干: ${expected.stem} -> ${bazi.stem} ${stemMatch ? "✓" : "✗"}`);
  console.log(`  中心星: ${expected.weapon} -> ${bazi.weapon} ${weaponMatch ? "✓" : "✗"}`);
  console.log(`  宿曜: ${expected.sukuyo} -> ${sukuyo} ${sukuyoMatch ? "✓" : "✗"}`);
  console.log("");
});

console.log("=== 検証完了 ===");
console.log("全ての項目が ✓ になったら、このロジックを page.tsx に統合してください。");

/**
 * 【page.tsxへの統合手順】
 * 
 * 1. getJDN関数を page.tsx のgetJulianDayNumber関数に置き換える
 * 2. calculateCentralStar関数を page.tsx のcalculateBazi関数に統合する
 * 3. calculateSukuyo関数を page.tsx のcalculateSukuyo関数に置き換える
 * 4. デバッグログを削除して、本番環境にデプロイする
 */
