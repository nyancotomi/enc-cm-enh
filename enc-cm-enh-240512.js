const fs = require('fs');
const util = require('util');
const { exec } = require('child_process');
const path = require('path');
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);
const execPromise = util.promisify(exec);
const spawn = require('child_process').spawn;
const execFile = require('child_process').execFile;
const file_name_lgd = process.env.HALF_WIDTH_CHANNELNAME;
//const programName = process.env.TITLE
const ffmpeg = process.env.FFMPEG;
const ffprobe = process.env.FFPROBE;

const file_path = process.env.INPUT;
const output = process.env.OUTPUT;
const analyzedurationSize = '10M'; // Mirakurun の設定に応じて変更すること
const probesizeSize = '32M'; // Mirakurun の設定に応じて変更すること
const videoHeight = parseInt(process.env.VIDEORESOLUTION, 10);
const isDualMono = parseInt(process.env.AUDIOCOMPONENTTYPE, 10) == 2;
//const args = ['-y'];
const args = ['-y', '-analyzeduration', analyzedurationSize, '-probesize', probesizeSize];
//const args = ['-y', '-analyzeduration', analyzedurationSize, '-probesize', probesizeSize, '-fix_sub_duration'];
const preset = 'veryfast';

const file_name = path.basename(file_path);
const maxMuxingQueueSize = 1024;
const dualMonoMode = 'main';
const audioBitrate = videoHeight > 720 ? '192k' : '128k';
const codec = 'h264_v4l2m2m';
const crf = 23;
const joinInputFile = `/home/pi/CmcutScp/result/${file_name}/join_logo_scp.txt`; // 入力ファイルのパス
const debug_file = `/home/pi/CmcutScp/result/${file_name}/join_debug.log`;
let debug_script = '';

/**
 * 動画長取得関数
 * @param {string} filePath ファイルパス
 * @return number 動画長を返す (秒)
 */
const getDuration = filePath => {
    return new Promise((resolve, reject) => {
        execFile(ffprobe, ['-v', '0', '-show_format', '-of', 'json', filePath], (err, stdout) => {
            if (err) {
                reject(err);

                return;
            }

            try {
                const result = JSON.parse(stdout);
                resolve(parseFloat(result.format.duration));
            } catch (err) {
                reject(err);
            }
        });
    });
};

//ログ作成関数
async function writeToDebugLog(file_name, message) {
    debug_script += message + '\n';

    try {
        await writeFile(debug_file, debug_script);
    } catch (error) {
        console.error(`デバッグログの書き込みエラー: ${error}`);
    }
}

//ロゴファイルを選択関数
async function selectLgdFile(channelNames, logoFolder) {
    for (const channelName of channelNames) {
      const lgdFileName = `${channelName}.lgd`;
      const lgdFilePath = path.join(logoFolder, lgdFileName);
  
      if (fs.existsSync(lgdFilePath)) {
        return lgdFilePath; // ファイルが見つかった場合、そのファイルのパスを返す
      }
    }
    return null; // 該当するファイルが見つからない場合、null を返す
}

// filterComplex 生成関数(CSVファイルから本編位置の出力)
async function generateFilterComplex(joinOutputFile) {
    return new Promise(async (resolve, reject) => {
      // CSVファイルを読み込み、各行から開始フレームと終了フレームを取得して処理
      // フレーム情報ファイルのパス
      await writeToDebugLog(debug_file, ` フレーム情報ファイルのパス(joinOutputFile) \n ${joinOutputFile} \n`);
      //const frameInfoFile = `/home/pi/CmcutScp/result/${file_name}/temp_join_logo_scp.csv`;
      // FPS を設定
      const fps = 29.97;
  
      // インデックスを初期化
      let index = 0;
  
      // 連結ラベルを生成
      let concatLabel = '[v0]';
  
      // フィルターコンプレックスの初期値を設定
      let filterComplex = '';
      try {
        const data = await util.promisify(fs.readFile)(joinOutputFile, 'utf8');
        await writeToDebugLog(debug_file, ` フィルターコンプレックスの初期値を設定(data) \n ${data} \n`);
        const line_sta_exe = `/home/pi/EPGStation/config/run_encode.sh encod_sta "${data}"`;
        const { stdout: line_sta_Stdout, stderr: line_sta_Stderr } = await execPromise(line_sta_exe);
  
        // CSVデータを行ごとに分割
        const lines = data.split('\n');
        
        for (const line of lines) {
            if (line.trim() === '') {
                continue;
            }
  
            const [startFrames, endFrames] = line.split(',');
            
            // 開始フレームと終了フレームから秒数に変換（小数点3桁まで）
            const startSeconds = (startFrames / fps).toFixed(3);
            const endSeconds = (endFrames / fps).toFixed(3);
  
            // フィルターコンプレックスに追加
            filterComplex += `[0:v]trim=${startSeconds}:${endSeconds},setpts=PTS-STARTPTS[v${index}];[0:a]atrim=${startSeconds}:${endSeconds},asetpts=PTS-STARTPTS[a${index}];`;
            // yadif フィルターを追加
            filterComplex += `[v${index}]yadif=0[v${index}_deinterlaced];`;
            
            index++;
        }
  
        // 連結ラベルを生成
        concatLabel = '';
        for (let i = 0; i < index; i++) {
            concatLabel += `[v${i}_deinterlaced][a${i}]`;
        }
        concatLabel += `concat=n=${index}:v=1:a=1`;
  
        // フィルターコンプレックスに連結ラベルを追加
        filterComplex += concatLabel;
  
        // フィルターコンプレックスをresolveして結果を返す
        resolve(filterComplex);
  
        // フィルターコンプレックスを表示
        console.log(filterComplex);
      } catch (err) {
        console.error('ファイルの読み込みエラー:', err);
        reject(err);
      }
    });
  
}

//メイン処理（CMカット実行＋エンコード）
async function runCommands() {

  try {
    
    // フォルダを作成
    const folder_path = `/home/pi/CmcutScp/result/${file_name}`;
    await mkdir(folder_path, { recursive: true });
    const avs_file = `/home/pi/CmcutScp/result/${file_name}/join_tsfile.avs`;

    // AVSスクリプトファイルを生成
    let avs_script = `TSFilePath="${file_path}"\n`;
    avs_script += `LWLibavVideoSource(TSFilePath, repeat=true, dominance=1)\n`;
    avs_script += `AudioDub(last, LWLibavAudioSource(TSFilePath, av_sync=true))`;
    // AVSスクリプトをファイルに書き込む
    await writeFile(avs_file, avs_script);
    await writeToDebugLog(debug_file, "AVSスクリプトファイルを生成完了\n");
    await writeToDebugLog(debug_file, `channelName:--------\n${file_name_lgd}\n----------\n`);

    const inscp_pas = `/home/pi/CmcutScp/result/${file_name}/chapter_inscp.txt`;
    const chapter_exe = `chapter_exe -v "${avs_file}" -lwi /home/pi/CmcutScp/result/"${file_name}"/chapter_inscp.lwi -oa /home/pi/CmcutScp/result/"${file_name}"/chapter_inscp.txt`;
    
    //chapter_exe コマンドを実行
    await writeToDebugLog(debug_file, chapter_exe);
    const { stdout: chapterStdout, stderr: chapterStderr } = await execPromise(chapter_exe);

    const logoFolder = '/home/pi/CmcutScp/join_logo_scp_trial/logo/';
    const channelNames = file_name_lgd.split(', ');

    // 適切な .lgd ファイルを選択
    const selectedLgdFile = await selectLgdFile(channelNames, logoFolder);
    
    if (selectedLgdFile) {
        await writeToDebugLog(debug_file, `該当する .lgd ファイル (${path.basename(selectedLgdFile)}) が見つかりました。\n`);
        const logoframe = `logoframe "${avs_file}" -logo "${selectedLgdFile}" -oa "/home/pi/CmcutScp/result/${file_name}/logoframe_inlogo.txt"`;
        //console.log("logoframe:", logoframe);

        // logoframeコマンドを実行
        await writeToDebugLog(debug_file, `cmd : logoframe "${avs_file}" -logo "${selectedLgdFile}" -oa "/home/pi/CmcutScp/result/${file_name}/logoframe_inlogo.txt"\n`);
        const { stdout: logoframeStdout, stderr: logoframeStderr } = await execPromise(logoframe);
        //console.log(logoframeStdout);

        // join_logo_scpコマンドを実行
        const join_logo_scp = `join_logo_scp -inlogo "/home/pi/CmcutScp/result/${file_name}/logoframe_inlogo.txt" -inscp "${inscp_pas}" -incmd "/home/pi/CmcutScp/join_logo_scp_trial/JL/JL_標準.txt" -o "/home/pi/CmcutScp/result/${file_name}/join_logo_scp.txt"`;
        await writeToDebugLog(debug_file, `cmd : join_logo_scp -inlogo "/home/pi/CmcutScp/result/${file_name}/logoframe_inlogo.txt" -inscp "${inscp_pas}" -incmd "/home/pi/CmcutScp/join_logo_scp_trial/JL/JL_標準.txt" -o "/home/pi/CmcutScp/result/${file_name}/join_logo_scp.txt"\n`);
        const { stdout: joinLogoStdout, stderr: joinLogoStderr } = await execPromise(join_logo_scp);
        //console.log(joinLogoStdout);
    } else {
        await writeToDebugLog(debug_file, `該当する .lgd ファイルが見つかりません\n`);
        // ファイルが見つからない場合のエラー処理を追加できます
    }

    //CSVに変換
    const joinOutputFile = `/home/pi/CmcutScp/result/${file_name}/join_logo_scp.csv`; // 出力ファイルのパス
    // ファイルの読み込み
    fs.readFile(joinInputFile, 'utf8', (err, data) => {
      if (err) {
          console.error('ファイルの読み込みエラー:', err);
          return;
      }
      // 特定のパターンの文字列を変更
      data = data.replace(/Trim\((\d+),(\d+)\)/g, '$1,$2'); // "Trim(数字,数字)" を "数字,数字" に変換
      data = data.replace(/ \+\+ /g, '\n');
      // ファイルへの書き込み
      fs.writeFile(joinOutputFile, data, (err) => {
          if (err) {
              console.error('ファイルの書き込みエラー:', err);
              return;
          }
          //console.log('処理が完了しました。');
      });
    });

    await writeToDebugLog(debug_file,`joinOutputFile()\n: "${joinOutputFile}"\n`);

    const filterComplex = await generateFilterComplex(joinOutputFile);

    await writeToDebugLog(debug_file,`generateFilterComplex()\n: "${filterComplex}"\n`);

    // input 設定
    Array.prototype.push.apply(args, ['-i', file_path]);
    

    if (isDualMono) {
        Array.prototype.push.apply(args, [
            '-filter_complex',
            'channelsplit[FL][FR]',
            '-map', '0:v',
            '-map', '[FL]',
            '-map', '[FR]',
            '-metadata:s:a:0', 'language=jpn',
            '-metadata:s:a:1', 'language=eng',
        ]);
        //Array.prototype.push.apply(args, ['-c:a', 'aac']);
        Array.prototype.push.apply(args, ['-c:a', 'ac3', '-ar', '48000', '-ab', '384k']);
    } else {
        // audio dataをコピー
        Array.prototype.push.apply(args, ['-c:a', 'aac']);
    }

    //Array.prototype.push.apply(args, ['-map', '0:v', '-map', '0:a', '-map', '0:s', '-c:s', 'mov_text']);

    Array.prototype.push.apply(args, ['-ignore_unknown']);

    Array.prototype.push.apply(args, ['-filter_complex', filterComplex]);

    Array.prototype.push.apply(args, ['-b:v', '10M']);

    // その他設定
    Array.prototype.push.apply(args, [
        '-c:v', 'h264_v4l2m2m',
        '-aspect', '16:9',
        '-f', 'mp4',
        '-r', '29.97',
        '-crf', 20,
        output
    ]);

    await writeToDebugLog(debug_file,`/usr/bin/ffmpeg:: ${args}\n`);

    let str = '';
    for (let i of args) {
        str += ` ${i}`;
    }
    // console.error(str);

    (async () => {
        // 進捗計算のために動画の長さを取得
        const duration = await getDuration(file_path);

        const child = spawn(ffmpeg, args);

        let inputfileinfo = false;
        let outputfileinfo = false;
        let fileinfolog = '';

        /**
         * エンコード進捗表示用に標準出力に進捗情報を吐き出す
         * 出力する JSON
         * {"type":"progress","percent": 0.8, "log": "view log" }
         */
        child.stderr.on('data', data => {
            let strbyline = String(data).split('\n');
            for (let i = 0; i < strbyline.length; i++) {
                let str = strbyline[i];
                // console.log(strbyline[i]);
                if (str.startsWith('frame')) {
                    // 想定log
                    // frame= 5159 fps= 11 q=29.0 size=  122624kB time=00:02:51.84 bitrate=5845.8kbits/s dup=19 drop=0 speed=0.372x
                    const progress = {};
                    const ffmpeg_reg = /frame=\s*(?<frame>\d+)\sfps=\s*(?<fps>\d+(?:\.\d+)?)\sq=\s*(?<q>[+-]?\d+(?:\.\d+)?)\sL?size=\s*(?<size>\d+(?:\.\d+)?)kB\stime=\s*(?<time>\d+[:\.\d+]*)\sbitrate=\s*(?<bitrate>\d+(?:\.\d+)?)kbits\/s(?:\sdup=\s*(?<dup>\d+))?(?:\sdrop=\s*(?<drop>\d+))?\sspeed=\s*(?<speed>\d+(?:\.\d+)?)x/;
                    let ffmatch =str.match(ffmpeg_reg);
                    /**
                     * match結果
                     * [
                     *   'frame= 5159 fps= 11 q=29.0 size=  122624kB time=00:02:51.84 bitrate=5845.8kbits/s dup=19 drop=0 speed=0.372x',
                     *   '5159',
                     *   '11',
                     *   '29.0',
                     *   '122624',
                     *   '00:02:51.84',
                     *   '5845.8',
                     *   '19',
                     *   '0',
                     *   '0.372',
                     *   index: 0,
                     *   input: 'frame= 5159 fps= 11 q=29.0 size=  122624kB time=00:02:51.84 bitrate=5845.8kbits/s dup=19 drop=0 speed=0.372x    \r',
                     *   groups: [Object: null prototype] {
                     *     frame: '5159',
                     *     fps: '11',
                     *     q: '29.0',
                     *     size: '122624',
                     *     time: '00:02:51.84',
                     *     bitrate: '5845.8',
                     *     dup: '19',
                     *     drop: '0',
                     *     speed: '0.372'
                     *   }
                     * ]
                     */

                    // console.log(ffmatch);
                    if (ffmatch === null) continue;

                    progress['frame'] = parseInt(ffmatch.groups.frame);
                    progress['fps'] = parseFloat(ffmatch.groups.fps);
                    progress['q'] = parseFloat(ffmatch.groups.q);
                    progress['size'] = parseInt(ffmatch.groups.size);
                    progress['time'] = ffmatch.groups.time;
                    progress['bitrate'] = parseFloat(ffmatch.groups.bitrate);
                    progress['dup'] = ffmatch.groups.dup == null ? 0 : parseInt(ffmatch.groups.dup);
                    progress['drop'] = ffmatch.groups.drop == null ? 0 : parseInt(ffmatch.groups.drop);
                    progress['speed'] = parseFloat(ffmatch.groups.speed);

                    let current = 0;
                    const times = progress.time.split(':');
                    for (let i = 0; i < times.length; i++) {
                        if (i == 0) {
                            current += parseFloat(times[i]) * 3600;
                        } else if (i == 1) {
                            current += parseFloat(times[i]) * 60;
                        } else if (i == 2) {
                            current += parseFloat(times[i]);
                        }
                    }

                    // 進捗率 1.0 で 100%
                    const percent = current / duration;
                    const log =
                        'frame= ' +
                        progress.frame +
                        ' fps=' +
                        progress.fps +
                        ' size=' +
                        progress.size +
                        ' time=' +
                        progress.time +
                        ' bitrate=' +
                        progress.bitrate +
                        ' drop=' +
                        progress.drop +
                        ' speed=' +
                        progress.speed;

                    console.log(JSON.stringify({ type: 'progress', percent: percent, log: log }));
                }
            }
        });

        child.on('error', err => {
            console.error(err);
            throw new Error(err);
        });

        process.on('SIGINT', () => {
            child.kill('SIGINT');
        });
    })();



    } catch (err) {
        console.error('ファイルの読み込みエラー:', err);
        await writeToDebugLog(debug_file, err);
        reject(err);
    }
}

runCommands();

