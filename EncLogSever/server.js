const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const baseDir = '/home/pi/CmcutScp/result'; // 対象ディレクトリ

// アイコン画像とCSSの提供
app.use(express.static('public'));

// 最新の join_debug.log を探す関数
function findLatestLogFolder() {
    let latestFolder = null;
    let latestTime = 0;

    fs.readdirSync(baseDir).forEach(folder => {
        const logPath = path.join(baseDir, folder, 'join_debug.log');
        if (fs.existsSync(logPath)) {
            const stats = fs.statSync(logPath);
            if (stats.mtimeMs > latestTime) {
                latestTime = stats.mtimeMs;
                latestFolder = folder;
            }
        }
    });

    return latestFolder;
}

// 指定フォルダ内のすべてのファイルを取得
function getFilesInFolder(folder) {
    const folderPath = path.join(baseDir, folder);
    return fs.readdirSync(folderPath).map(file => ({
        name: file,
        path: path.join(folderPath, file)
    }));
}

// ルートで最新の join_debug.log を含むフォルダのファイルを表示
app.get('/', (req, res) => {
    const latestFolder = findLatestLogFolder();

    if (!latestFolder) {
        return res.send('No join_debug.log found.');
    }

    const files = getFilesInFolder(latestFolder);
    

    let fileListHtml = `
    <html>
        <head>
            <title>EncLogSever</title>
            <link rel="icon" type="image/png" href="favicon.ico">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: #e0e0e0; /* 明るいグレーに変更 */
                    transform: scale(2); /* 全体を150%大きくする */
                    transform-origin: top left; /* スケーリングの起点を左上に設定 */
                    width: 50vw; /* 幅を100%に */
                    overflow-x: hidden; /* 横方向のオーバーフローを隠す */
                }
                h2 {
                    color: #333;
                    text-align: center;
                    font-size: 0.8em; /* ヘッダーサイズ */
                }
                ul {
                    list-style: none;
                    padding: 0;
                    text-align: center;
                }
                li {
                    margin: 15px 0; /* マージンを調整 */
                }
                a {
                    display: inline-block;
                    text-decoration: none;
                    background-color: #007BFF; /* 濃い青 */
                    color: white;
                    padding: 12px 18px; /* パディングを調整 */
                    border-radius: 5px;
                    width: 90%; /* ボタン幅を90%に設定 */
                    max-width: 300px; /* 最大幅を設定 */
                    border: 2px solid #007BFF; /* 境界線を追加 */
                    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2); /* 影を追加 */
                }
                a:hover {
                    background-color: #0056b3;
                }
                .csv {
                    background-color: #f0f0f0; /* CSVファイル用の背景色 */
                    color: #555; /* 目立たない文字色 */
                    border: 2px solid #ccc; /* CSVファイル用の境界線 */
                }
                .csv:hover {
                    background-color: #e0e0e0; /* CSVファイル用のホバー時の背景色 */
                }
                @media (max-width: 600px) {
                    a {
                        width: 90%; /* 小さい画面ではボタンの幅を調整 */
                    }
                }
            </style>
        </head>
        <body>
            <h2>Files in: ${latestFolder}</h2>
            <ul>
`;




    files.forEach(file => {
        fileListHtml += `<li><a href="/file/${latestFolder}/${file.name}">${file.name}</a></li>`;
    });
    fileListHtml += `
                </ul>
            </body>
        </html>
    `;

    res.send(fileListHtml);
});

// ファイルの内容を表示するルート
app.get('/file/:folder/:filename', (req, res) => {
    const folder = req.params.folder;
    const filename = req.params.filename;
    const filePath = path.join(baseDir, folder, filename);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('File not found');
    }
});

// サーバーをポート3030で起動
const port = 3030;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
