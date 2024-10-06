const spawn = require('child_process').spawn;
const execFile = require('child_process').execFile;
const ffmpeg = '/usr/local/bin/ffmpeg';
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

child.on('exit', (code, signal) => {
    if (code === 0) {
        // FFMPEG process completed successfully, now execute the additional command
        const additionalCommand = 'ruby';
        const additionalArgs = [
            '/home/pi/CmcutScp/RSS/makepodcast.rb',
            'Mtv',
            'http://192.168.1.83/music/',
            '/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded/Podcast/music/',
            '>',
            '/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded/Podcast/music/makepodcast.rss'
        ];

        execFile(additionalCommand, additionalArgs, (error, stdout, stderr) => {
            if (error) {
                console.error(error);
                throw new Error(error);
            }
            console.log(stdout);
        });
    } else {
        console.error(`FFMPEG process exited with code ${code} and signal ${signal}`);
    }
});

process.on('SIGINT', () => {
    child.kill('SIGINT');
});
