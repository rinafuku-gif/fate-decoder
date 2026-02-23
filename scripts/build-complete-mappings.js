// 全ての検証データから完全なマッピング表を構築
const verificationData = [
  { date: '1979-11-22', dayStem: '癸', centralStar: '石門星', sukuyo: '箕宿' },
  { date: '1982-11-06', dayStem: '癸', centralStar: '牽牛星', sukuyo: '柳宿' },
  { date: '1983-06-04', dayStem: '癸', centralStar: '司禄星', sukuyo: '壁宿' },
  { date: '1983-06-29', dayStem: '戊', centralStar: '玉堂星', sukuyo: '危宿' },
  { date: '1986-09-03', dayStem: '庚', centralStar: '貫索星', sukuyo: '翼宿' },
  { date: '1989-10-24', dayStem: '丁', centralStar: '調舒星', sukuyo: '軫宿' },
  { date: '2000-01-01', dayStem: '戊', centralStar: '司禄星', sukuyo: '心宿' }
];

const stems = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const mansions = ["昴宿","畢宿","觜宿","参宿","井宿","鬼宿","柳宿","星宿","張宿","翼宿","軫宿","角宿","亢宿","氐宿","房宿","心宿","尾宿","箕宿","斗宿","女宿","虚宿","危宿","室宿","壁宿","奎宿","婁宿","胃宿"];

function getJulianDayNumber(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function getSolarTerms(year) {
  const terms = [
    { name: "立春", approxDay: 4, month: 2 }, { name: "啓蟄", approxDay: 6, month: 3 },
    { name: "清明", approxDay: 5, month: 4 }, { name: "立夏", approxDay: 6, month: 5 },
    { name: "芒種", approxDay: 6, month: 6 }, { name: "小暑", approxDay: 7, month: 7 },
    { name: "立秋", approxDay: 8, month: 8 }, { name: "白露", approxDay: 8, month: 9 },
    { name: "寒露", approxDay: 8, month: 10 }, { name: "立冬", approxDay: 7, month: 11 },
    { name: "大雪", approxDay: 7, month: 12 }, { name: "小寒", approxDay: 6, month: 1 }
  ];
  return terms.map(t => ({ ...t, month: t.month, day: t.approxDay }));
}

function getMonthBranch(year, month, day) {
  const branches = ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"];
  const solarTerms = getSolarTerms(year);
  let adjustedMonth = month;
  if (month === 2 && day < 4) adjustedMonth = 1;
  else if (month === 3 && day < 6) adjustedMonth = 2;
  else if (month === 4 && day < 5) adjustedMonth = 3;
  else if (month === 5 && day < 6) adjustedMonth = 4;
  else if (month === 6 && day < 6) adjustedMonth = 5;
  else if (month === 7 && day < 7) adjustedMonth = 6;
  else if (month === 8 && day < 8) adjustedMonth = 7;
  else if (month === 9 && day < 8) adjustedMonth = 8;
  else if (month === 10 && day < 8) adjustedMonth = 9;
  else if (month === 11 && day < 7) adjustedMonth = 10;
  else if (month === 12 && day < 7) adjustedMonth = 11;
  else if (month === 1 && day < 6) adjustedMonth = 12;
  const branchIndex = (adjustedMonth + 1) % 12;
  return branchIndex;
}

function calculateOffset(stemIndex, monthBranchIndex) {
  const choseiPositions = [2, 3, 11, 0, 2, 3, 11, 0, 5, 6];
  const choseiPosition = choseiPositions[stemIndex];
  const isYinStem = stemIndex % 2 === 1;
  const offset = isYinStem
    ? (choseiPosition - monthBranchIndex + 12) % 12
    : (monthBranchIndex - choseiPosition + 12) % 12;
  return offset;
}

console.log('=== 全検証データの分析 ===\n');

const baseDate = new Date('2000-01-01');
const baseJD = getJulianDayNumber(2000, 1, 1);
const baseStemIndex = stems.indexOf('戊'); // 2000/1/1 = 戊

// 中心星のoffsetマッピングを構築
const centralStarByOffset = {};
// 宿曜のindexを記録
const sukuyoData = [];

verificationData.forEach(data => {
  const [year, month, day] = data.date.split('-').map(Number);
  const targetJD = getJulianDayNumber(year, month, day);
  const daysDiff = targetJD - baseJD;
  
  // 日干の計算
  const stemIndex = ((baseStemIndex + daysDiff) % 10 + 10) % 10;
  const calculatedStem = stems[stemIndex];
  
  // 月支の取得
  const monthBranchIndex = getMonthBranch(year, month, day);
  
  // offsetの計算
  const offset = calculateOffset(stemIndex, monthBranchIndex);
  
  // 宿曜のindex
  const sukuyoIndex = mansions.indexOf(data.sukuyo);
  
  console.log(`${data.date}:`);
  console.log(`  日干: ${calculatedStem} (期待: ${data.dayStem}) ${calculatedStem === data.dayStem ? '✓' : '✗'}`);
  console.log(`  月支index: ${monthBranchIndex}`);
  console.log(`  offset: ${offset} → 中心星: ${data.centralStar}`);
  console.log(`  宿曜: ${data.sukuyo} (index=${sukuyoIndex})`);
  console.log(`  日数差: ${daysDiff}\n`);
  
  // offsetと中心星のマッピングを記録
  if (!centralStarByOffset[offset]) {
    centralStarByOffset[offset] = [];
  }
  centralStarByOffset[offset].push({ date: data.date, star: data.centralStar, stem: data.dayStem });
  
  // 宿曜データを記録
  sukuyoData.push({ date: data.date, sukuyo: data.sukuyo, index: sukuyoIndex, daysDiff });
});

console.log('\n=== 中心星のoffsetマッピング ===');
for (let i = 0; i < 12; i++) {
  if (centralStarByOffset[i]) {
    const stars = centralStarByOffset[i].map(d => `${d.star}(${d.stem})`).join(', ');
    console.log(`offset ${i}: ${stars}`);
  }
}

console.log('\n=== 宿曜の基準日計算 ===');
console.log('2000/1/1からの宿曜index逆算:');
sukuyoData.forEach(d => {
  // (baseOffset + daysDiff) % 27 = sukuyoIndex を解く
  // baseOffset = (sukuyoIndex - daysDiff) % 27
  const baseOffset = ((d.index - d.daysDiff) % 27 + 27) % 27;
  console.log(`${d.date}: sukuyoIndex=${d.index}, daysDiff=${d.daysDiff} → 2000/1/1のoffset=${baseOffset} (${mansions[baseOffset]})`);
});

console.log('\n完了！');
