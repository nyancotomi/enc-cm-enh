const spawn = require('child_process').spawn;
const execFile = require('child_process').execFile;
const ffmpeg =  '/usr/local/bin/ffmpeg';
const ffprobe = '/usr/local/bin/ffmpeg';
const fs = require('fs');
const path = require('path');

const input = process.env.INPUT;
const output = process.env.OUTPUT; 
const args = ['-fflags'];
const file_name = path.parse(input).name;
const joinOutputFile = `/home/pi/CmcutScp/result/${file_name}/join_logo_scp.csv`; // 出力ファイルのパス

// CSVファイルの1列目の1行目の値を確認する
const csvContent = fs.readFileSync(joinOutputFile, 'utf8');
const firstLine = csvContent.split('\n')[0];
const firstValue = firstLine.split(',')[0];

//if (firstValue === '0') {
 //   console.error('CSVファイルの1列目の1行目の値が0のため、スクリプトを中止します。');
   // process.exit(1);
//}

Array.prototype.push.apply(args, ['+discardcorrupt', '-fix_sub_duration']);

// input 設定
Array.prototype.push.apply(args, ['-i', input]);

Array.prototype.push.apply(args, ['-c:s', 'srt', '-y', output]);

let str = '';
for (let i of args) {
    str += ` ${i}`
}
console.error(str);

const child = spawn(ffmpeg, args);

child.stderr.on('data', (data) => { console.error(String(data)); });

child.on('error', (err) => {
    console.error(err);
    throw new Error(err);
});

process.on('SIGINT', () => {
    child.kill('SIGINT');
});
