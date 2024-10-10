const fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');
const { exec } = require('child_process');

app.get('/', (req, res) => {
  // ルートURLのGETリクエストを処理するコードを追加
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/filelist', async (req, res) => {
  const folderPath = '/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded';

  try {
    const filteredFiles = await getFilesWithExtensions(folderPath, ['.m2ts', '.ts']);
    res.json({ files: filteredFiles });
  } catch (error) {
    console.error(`ファイル一覧の取得エラー: ${error}`);
    res.status(500).json({ error: 'ファイル一覧の取得エラー' });
  }
});

app.get('/outputfolders', (req, res) => {
  const rootFolder = '/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded';

  // 再帰的に相対パスのフォルダ一覧を取得する関数
  function getRelativeFolderList(folderPath, relativePath = '') {
    const folders = fs.readdirSync(folderPath);
    const folderList = [];

    folders.forEach(folder => {
      const fullPath = path.join(folderPath, folder);
      if (fs.statSync(fullPath).isDirectory()) {
        const currentRelativePath = path.join(relativePath, folder);
        folderList.push(currentRelativePath);
        folderList.push(...getRelativeFolderList(fullPath, currentRelativePath));
      }
    });

    return folderList;
  }

  try {
    const folderList = getRelativeFolderList(rootFolder);
    res.json({ folders: folderList });
  } catch (error) {
    console.error(`フォルダ一覧の取得エラー: ${error}`);
    res.status(500).json({ error: 'フォルダ一覧の取得エラー' });
  }
});

// チャンネル名一覧を提供
app.get('/channelnames', (req, res) => {
  const logoFolderPath = '/home/pi/CmcutScp/join_logo_scp_trial/logo';

  fs.readdir(logoFolderPath, (err, files) => {
    if (err) {
      console.error(`チャンネル名一覧の取得エラー: ${err}`);
      res.status(500).json({ error: 'チャンネル名一覧の取得エラー' });
    } else {
      // ファイル名から拡張子を削除して、チャンネル名として提供
      const channelNames = files.map(file => path.parse(file).name);
      res.json({ channelNames });
    }
  });
});

async function getFilesWithExtensions(folderPath, extensions) {
  const files = [];
  const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    if (entry.isDirectory()) {
      // サブディレクトリの中のファイルも収集
      const subFiles = await getFilesWithExtensions(fullPath, extensions);
      files.push(...subFiles);
    } else {
      // 拡張子をチェックし、条件を満たすファイルのみを追加
      const fileExtension = path.extname(entry.name).toLowerCase();
      if (extensions.includes(fileExtension)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

app.post('/encode', (req, res) => {
  const { inputPath, outputFolder, channel } = req.body;

  // 入力ファイルからファイル名（拡張子なし）を取得
  const inputFileName = path.basename(inputPath, path.extname(inputPath));
  
  // 出力フォルダとファイル名を結合
  const outputPath = path.join(outputFolder, `${inputFileName}.mp4`);
  
  const command = `node /home/pi/CmcutScp/video-encoder/enc-cm-enh.js "${inputPath}" "/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded/${outputPath}" "${channel}" `;
  res.send(`${command}`);
  console.log(`ボタンが押されました！！...\n${command}`);
    // エンコードコマンドを非同期に実行
    //const encodingProcess = exec(command);
    //encodingInProgress = true;
  
    // エンコードコマンドの標準出力をリアルタイムにクライアントに送信
    encodingProcess.stdout.on('data', (data) => {
      res.write(data);
    });
  
    // エンコードが完了したらクライアントにメッセージを送信してレスポンスを終了
    encodingProcess.on('exit', (code) => {
      if (code === 0) {
        res.end('エンコードが完了しました');
      } else {
        res.end('エンコード中にエラーが発生しました');
      }
  
      // エンコード進行状況を更新
      encodingInProgress = false;
    });
  });


app.listen(3000, () => {
  console.log('Webサーバーがポート3000で実行中...');
});