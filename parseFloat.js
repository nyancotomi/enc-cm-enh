const fs = require('fs');

const joinOutputFile = '/home/pi/CmcutScp/result/[映]ハリー・ポッターと秘密の部屋（吹替版）[SS][字]-2023年11月27日21時.ts/join_logo_scp.csv';

let firstValue; // 外部で変数を宣言

// ファイルが存在するか確認
if (fs.existsSync(joinOutputFile)) {
  // join_logo_scp.csv ファイルから値を取得
  const csvData = fs.readFileSync(joinOutputFile, 'utf8');
  const lines = csvData.split('\n');
  
  if (lines.length > 0) {
    const firstLine = lines[0].trim(); // 1行目を取得
    const numericValue = parseFloat(firstLine); // 数値に変換
    
    if (!isNaN(numericValue)) {
      // 数値が正常に取得できた場合
      firstValue = numericValue;
      
    } else {
      console.log('CSVファイルの数値が不正です。');
    }
  } else {
    console.log('CSVファイルが空です。');
  }
} else {
  console.log('指定されたファイルが存在しません。');
}
const firstValueTime = firstValue / 29.97;
console.log('取得した値:', firstValueTime);
