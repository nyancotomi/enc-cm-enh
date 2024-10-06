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
const start_at = process.env.START_AT;

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

const file_name = path.parse(file_path).name;
const maxMuxingQueueSize = 1024;
const dualMonoMode = 'main';
const audioBitrate = videoHeight > 720 ? '192k' : '128k';
const codec = 'h264_v4l2m2m';
const crf = 23;

// 正規表現でファイル名の末尾の「YYYY年MM月DD日」を抽出
//let yyyymmddMatch = file_name.match(/(\d{4}年)(\d{2}月)(\d{2}日)(?=\d{2}時$)/);

// 年、月、日を個別に抽出
//let year = yyyymmddMatch ? yyyymmddMatch[1] : null;   // 例: "2024年"
//let month = yyyymmddMatch ? yyyymmddMatch[2] : null;  // 例: "10月"
//let day = yyyymmddMatch ? yyyymmddMatch[3] : null;    // 例: "05日"
//${year}/${month}/${day}/
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
        const line_sta_exe = `/home/pi/EPGStation/config/run_encode.sh encod_sta "${data} \nエンコードの詳細ログ:\n http://192.168.1.83:3005/latest-log"`;
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
    let encode_date = new Date();
    await writeToDebugLog(debug_file, `--------\n曜日 月  日  年  時:分:秒 \n${encode_date}\n----------\n`);
                                               //Sun Oct 06 2024 13:10:13 GMT+0900 (Japan Standard Time)
    await writeToDebugLog(debug_file, "AVSスクリプトファイルを生成完了\n");
    await writeToDebugLog(debug_file, `channelName:\n--------\n${file_name_lgd}\n----------\n`);

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
    try {
        const data = fs.readFileSync(joinInputFile, 'utf8');

        // 特定のパターンの文字列を変更
        let modifiedData = data.replace(/Trim\((\d+),(\d+)\)/g, '$1,$2'); // "Trim(数字,数字)" を "数字,数字" に変換
        modifiedData = modifiedData.replace(/ \+\+ /g, '\n');

        // ファイルへの書き込み
        fs.writeFileSync(joinOutputFile, modifiedData);

        // 1列目の1行目の値を確認する処理
        const lines = modifiedData.split('\n');
        const firstLine = lines[0];
        const firstColumnValue = firstLine.split(',')[0].trim(); 
        const filterComplex = await generateFilterComplex(joinOutputFile);
        const encJsFilePath = '/home/pi/EPGStation/config/enc-cm-enh-0000.js';

        if (firstColumnValue === '0') {
            
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
            
            Array.prototype.push.apply(args, ['-vf', 'yadif']);

            const externalCommand = `/home/pi/EPGStation/config/run_encode_error.sh encod_error "ノーカットエンコード開始\n${modifiedData}\n\n 再エンコードの詳細ログ:\n http://192.168.1.83:3000/latest-log"`; // ここに外部コマンドを記述
            //const externalCommand = `/home/pi/EPGStation/config/run_encode_error.sh encod_error "${data}_再エンコード開始"`; // ここに外部コマンドを記述
            try {
                const { stdout, stderr } = await execPromise(externalCommand);
                console.log(stdout);
                console.error(stderr);
            } catch (error) {
                console.error(`外部コマンドの実行エラー: ${error}`);
            }
            await writeToDebugLog(debug_file, `1列目の1行目の値が0のため、外部コマンドを実行します: ${externalCommand}\n`);
            //writeToDebugLog(debug_file, `------------------------\n1列目の1行目の値が0のため、外部コマンドを実行します: ${externalCommand}\n`);
            const { execSync } = require('child_process'); // execSyncを使用するためにchild_processモジュールをインポート

            Array.prototype.push.apply(args, ['-b:v', '10M']);

            const output_faild =`/srv/dev-disk-by-uuid-D454C24354C22856/NAS_4_1/Recorded/2024-4cours/encode_faild/${file_name}.mp4`

            // その他設定
            Array.prototype.push.apply(args, [
                '-c:v', 'h264_v4l2m2m',
                '-aspect', '16:9',
                '-f', 'mp4',
                '-r', '29.97',
                '-crf', 20,
                output_faild
            ]);
        
            await writeToDebugLog(debug_file,`/usr/bin/ffmpeg:: ${args}\n`);
        
            let str = '';
            for (let i of args) {
                str += ` ${i}`;
            }
            // console.error(str);
        
            // 非同期エンコード処理
            (async () => {
                try {
                    // 動画の長さを取得し、進捗率を計算するための準備
                    const duration = await getDuration(file_path);

                    // ffmpeg プロセスを開始
                    const child = spawn(ffmpeg, args);

                    // ffmpeg の標準出力をリアルタイムに処理
                    child.stderr.on('data', data => {
                        let strbyline = String(data).split('\n');
                        for (let i = 0; i < strbyline.length; i++) {
                            let str = strbyline[i];
                            if (str.startsWith('frame')) {
                                const ffmpeg_reg = /frame=\s*(?<frame>\d+)\sfps=\s*(?<fps>\d+(?:\.\d+)?)\sq=\s*(?<q>[+-]?\d+(?:\.\d+)?)\sL?size=\s*(?<size>\d+(?:\.\d+)?)kB\stime=\s*(?<time>\d+[:\.\d+]*)\sbitrate=\s*(?<bitrate>\d+(?:\.\d+)?)kbits\/s(?:\sdup=\s*(?<dup>\d+))?(?:\sdrop=\s*(?<drop>\d+))?\sspeed=\s*(?<speed>\d+(?:\.\d+)?)x/;
                                let ffmatch = str.match(ffmpeg_reg);
                                
                                // フレーム情報がある場合は進捗を計算
                                if (ffmatch !== null) {
                                    const progress = {
                                        frame: parseInt(ffmatch.groups.frame),
                                        fps: parseFloat(ffmatch.groups.fps),
                                        q: parseFloat(ffmatch.groups.q),
                                        size: parseInt(ffmatch.groups.size),
                                        time: ffmatch.groups.time,
                                        bitrate: parseFloat(ffmatch.groups.bitrate),
                                        dup: ffmatch.groups.dup == null ? 0 : parseInt(ffmatch.groups.dup),
                                        drop: ffmatch.groups.drop == null ? 0 : parseInt(ffmatch.groups.drop),
                                        speed: parseFloat(ffmatch.groups.speed),
                                    };

                                    let current = 0;
                                    const times = progress.time.split(':');
                                    for (let i = 0; i < times.length; i++) {
                                        if (i === 0) {
                                            current += parseFloat(times[i]) * 3600;
                                        } else if (i === 1) {
                                            current += parseFloat(times[i]) * 60;
                                        } else if (i === 2) {
                                            current += parseFloat(times[i]);
                                        }
                                    }

                                    // 進捗率を計算
                                    const percent = current / duration;

                                    // 進捗情報をログに出力
                                    const log = `frame= ${progress.frame} fps=${progress.fps} size=${progress.size} time=${progress.time} bitrate=${progress.bitrate} drop=${progress.drop} speed=${progress.speed}`;
                                    console.log(JSON.stringify({ type: 'progress', percent: percent, log: log }));
                                }
                            }
                        }
                    });

                    // エンコード処理のエラーハンドリング
                    child.on('error', err => {
                        console.error('エンコード中にエラーが発生しました:', err);
                        throw new Error(err);
                    });

                    // enc-cm-enh-0000.jsプロセスの終了を待ち、終了後に次の処理を実行
                    child.on('exit', async (code) => {
                        if (code === 0) {
                            console.log('エンコード完了。次の処理を開始します。');
                            await writeToDebugLog(debug_file, `enc-cm-enh-0000.jsプロセスの終了を待ち、終了後に次の処理を実行\n`);
                            
                            // 次のエンコード処理を行うために、環境変数を設定して`enc-cm-enh-0000.js`を実行
                            const encEnv = {
                                ...process.env,
                                INPUT_O: file_path,
                                INPUT: output_faild, // 前のエンコード処理の出力ファイルを入力として指定
                                OUTPUT: output,      // 新たな出力ファイルを指定
                            };
                    
                            // enc-cm-enh-0000.js を実行 (timeout を 0 に設定)
                            await execPromise(`node /home/pi/EPGStation/config/enc-cm-enh-0000.js`, { env: encEnv, timeout: 0 });
                            console.log('次のエンコード処理が開始されました。');
                        } else {
                            console.error(`エンコード失敗。exit code: ${code}`);
                        }
                    });

                    // subtitle.js を実行するプロセスの終了を待ち、終了後に次の処理を実行
                    child.on('exit', async (code1) => {
                        if (code1 === 0) {
                            console.log('subtitleエンコード完了。次の処理を開始します。');
                            await writeToDebugLog(debug_file, `subtitle.js を実行するプロセスの終了を待ち、終了後に次の処理を実行\n`);
                            
                            // 次のエンコード処理を行うために、環境変数を設定して`subtitle.js`を実行
                            const subtitleEnv = {
                                ...process.env,
                                INPUT: file_path, 
                                OUTPUT: `/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded/subtitle/${file_name}.jpn.srt`, 
                            };

                            // enc-cm-enh-0000.js を実行
                            await execPromise(`node /home/pi/EPGStation/config/subtitle.js`, { env: subtitleEnv });
                            console.log('次のエンコード処理が開始されました。');
                        } else {
                            console.error(`subtitleエンコード失敗。exit code: ${code1}`);
                            await writeToDebugLog(debug_file, `error: ${error}\n`);
                        }
                    });                 
                   

                    // シグナルでプロセスを終了させる処理
                    process.on('SIGINT', () => {
                        child.kill('SIGINT');
                    });

                } catch (error) {
                    console.error('エンコード処理中にエラーが発生しました:', error);
                }
            })();


        } else{

            const subtitleEnv = {
                ...process.env,
                INPUT: file_path, 
                OUTPUT: `/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded/subtitle/${file_name}.jpn.srt`, 
            };

            // subtitle を実行
            await execPromise(`node /home/pi/EPGStation/config/subtitle.js`, { env: subtitleEnv });
            await writeToDebugLog(debug_file, `subtitle を実行\n`);

            // cm-subtitle-12.sh を実行するプロセスの終了を待ち、終了後に次の処理を実行
            const fileNameWithoutExtension = output.replace(/\.mp4$/, '');
            const cm_subtitleEnv = `INPUT="${file_path}" OUTPUT="${fileNameWithoutExtension}_cmcut.jpn.srt" /bin/bash /home/pi/EPGStation/config/cm-subtitle-12.sh`;
            try {
                const { stdout, stderr } = await execPromise(cm_subtitleEnv);
                console.log(stdout);
                console.error(stderr);
            } catch (error) {
                console.error(`外部コマンドの実行エラー: ${error}`);
            }  

            await writeToDebugLog(debug_file, `cm-subtitle-12.sh を実行${cm_subtitleEnv}\n`);

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
            await writeToDebugLog(debug_file,`joinOutputFile()\n: "${joinOutputFile}"\n`);
            await writeToDebugLog(debug_file,`generateFilterComplex()\n: "${filterComplex}"\n`);

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
        





        } 
        }catch (err) {
        console.error('ファイルの読み込みエラー:', err);
    }


    } catch (err) {
        console.error('ファイルの読み込みエラー:', err);
        await writeToDebugLog(debug_file, err);
        reject(err);
    }

}


runCommands();

