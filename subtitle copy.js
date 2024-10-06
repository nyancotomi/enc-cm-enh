const spawn = require('child_process').spawn;
const execFile = require('child_process').execFile;
const ffmpeg =  '/usr/local/bin/ffmpeg';
const ffprobe = '/usr/local/bin/ffmpeg';

const input = process.env.INPUT;
const output = process.env.OUTPUT;
const args = ['-fflags'];

Array.prototype.push.apply(args, ['+discardcorrupt', '-fix_sub_duration']);

// input 設定
Array.prototype.push.apply(args, ['-i', input]);

Array.prototype.push.apply(args, ['-c:s', 'srt', '-y', output]);

let str = '';
for (let i of args) {
    str += ` ${ i }`
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

