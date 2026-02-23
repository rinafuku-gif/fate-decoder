// 検証データ全てで計算ロジックを確認するスクリプト

// ユリウス通日の計算
function getJulianDayNumber(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

// 検証データ（全て同じ占いサイトから取得）
const testCases = [
  { date: '1979.11.22', y: 1979, m: 11, d: 22, stem: '癸', star: '石門星', sukuyo: '箕宿' },
  { date: '1982.11.6', y: 1982, m: 11, d: 6, stem: '癸', star: '牽牛星', sukuyo: '柳宿' },
  { date: '1983.6.4', y: 1983, m: 6, d: 4, stem: '癸', star: '司禄星', sukuyo: '壁宿' },
  { date: '1983.6.29', y: 1983, m: 6, d: 29, stem: '戊', star: '玉堂星', sukuyo: '危宿' },
  { date: '1986.9.3', y: 1986, m: 9, d: 3, stem: '庚', star: '貫索星', sukuyo: '翼宿' },
  { date: '1989.10.24', y: 1989, m: 10, d: 24, stem: '丁', star: '調舒星', sukuyo: '軫宿' },
  { date: '2000.1.1', y: 2000, m: 1, d: 1, stem: '戊', star: '司禄星', sukuyo: '心宿' }
];

const stems = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const mansions = ["昴宿","畢宿","觜宿","参宿","井宿","鬼宿","柳宿","星宿","張宿","翼宿","軫宿","角宿","亢宿","氐宿","房宿","心宿","尾宿","箕宿","斗宿","女宿","虚宿","危宿","室宿","壁宿","奎宿","婁宿","胃宿"];

console.log('=== 2000年1月1日を基準とした計算ロジック検証 ===\n');

// 2000年1月1日の基準値
const baseJD = getJulianDayNumber(2000, 1, 1);
const baseStem = stems.indexOf('戊'); // 4
const baseSukuyo = mansions.indexOf('心宿'); // 15

console.log(`基準日: 2000年1月1日`);
console.log(`  JD: ${baseJD}`);
console.log(`  日干: 戊 (index=${baseStem})`);
console.log(`  宿曜: 心宿 (index=${baseSukuyo})`);
console.log(`  中心星: 司禄星\n`);

// 日干の検証
console.log('=== 日干の検証 ===');
let stemCorrect = 0;
testCases.forEach(tc => {
  const jd = getJulianDayNumber(tc.y, tc.m, tc.d);
  const daysDiff = jd - baseJD;
  const stemIndex = ((baseStem + daysDiff) % 10 + 10) % 10;
  const calculated = stems[stemIndex];
  const result = calculated === tc.stem ? '✓' : '✗';
  if (calculated === tc.stem) stemCorrect++;
  console.log(`${tc.date}: 計算=${calculated}, 正解=${tc.stem} ${result} (日数差=${daysDiff})`);
});
console.log(`\n日干の正解率: ${stemCorrect}/${testCases.length}\n`);

// 宿曜の検証
console.log('=== 宿曜の検証 ===');
let sukuyoCorrect = 0;
testCases.forEach(tc => {
  const jd = getJulianDayNumber(tc.y, tc.m, tc.d);
  const daysDiff = jd - baseJD;
  let sukuyoIndex = (baseSukuyo + daysDiff) % 27;
  if (sukuyoIndex < 0) sukuyoIndex += 27;
  const calculated = mansions[sukuyoIndex];
  const result = calculated === tc.sukuyo ? '✓' : '✗';
  if (calculated === tc.sukuyo) sukuyoCorrect++;
  console.log(`${tc.date}: 計算=${calculated}, 正解=${tc.sukuyo} ${result} (日数差=${daysDiff}, index=${sukuyoIndex})`);
});
console.log(`\n宿曜の正解率: ${sukuyoCorrect}/${testCases.length}\n`);

// 中心星のoffset値を逆算
console.log('=== 中心星のoffset値を逆算 ===');
// 長生の位置（各天干固定）
const choseiMap = { '甲':1, '乙':6, '丙':3, '丁':2, '戊':3, '己':2, '庚':5, '辛':0, '壬':11, '癸':4 };
// 月支の計算（節入り日考慮）
function getMonthBranch(y, m, d) {
  // 簡易計算：立春2/4頃、立夏5/5頃、立秋8/7頃、立冬11/7頃
  // 寅=2月, 卯=3月, 辰=4月, 巳=5月, 午=6月, 未=7月, 申=8月, 酉=9月, 戌=10月, 亥=11月, 子=12月, 丑=1月
  const branchNames = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  
  // 節入り日の簡易判定
  if (m === 11 && d < 7) return 9; // 戌月
  if (m === 11 && d >= 7) return 10; // 亥月
  if (m === 12) return 10; // 亥月
  if (m === 1) return 11; // 子月
  if (m === 2 && d < 4) return 11; // 子月
  if (m === 2 && d >= 4) return 0; // 丑月
  
  // その他の月は単純計算
  return (m + 10) % 12;
}

console.log('日干・月支からoffset値と中心星を確認:\n');
testCases.forEach(tc => {
  const stemIndex = stems.indexOf(tc.stem);
  const choseiPos = choseiMap[tc.stem];
  const monthBranch = getMonthBranch(tc.y, tc.m, tc.d);
  const isYinStem = stemIndex % 2 === 1;
  const offset = isYinStem
    ? (choseiPos - monthBranch + 12) % 12
    : (monthBranch - choseiPos + 12) % 12;
  
  console.log(`${tc.date}: 日干=${tc.stem}(${stemIndex}), 月支=${monthBranch}, 長生=${choseiPos}, offset=${offset} → ${tc.star}`);
});

console.log('\n=== offset→中心星のマッピング表を構築 ===');
const offsetToStar = {};
testCases.forEach(tc => {
  const stemIndex = stems.indexOf(tc.stem);
  const choseiPos = choseiMap[tc.stem];
  const monthBranch = getMonthBranch(tc.y, tc.m, tc.d);
  const isYinStem = stemIndex % 2 === 1;
  const offset = isYinStem
    ? (choseiPos - monthBranch + 12) % 12
    : (monthBranch - choseiPos + 12) % 12;
  
  if (!offsetToStar[offset]) {
    offsetToStar[offset] = tc.star;
  } else if (offsetToStar[offset] !== tc.star) {
    console.log(`警告: offset=${offset}で異なる中心星: ${offsetToStar[offset]} vs ${tc.star}`);
  }
});

console.log('\n最終的なoffset→中心星マッピング:');
for (let i = 0; i < 12; i++) {
  console.log(`offset=${i}: ${offsetToStar[i] || '未検証'}`);
}
