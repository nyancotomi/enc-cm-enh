const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3040;
const baseDir = '/home/pi/CmcutScp/result';

// アイコンの設定
app.use('/favicon.ico', express.static(path.join(__dirname, 'public', 'favicon.ico')));

// フォルダのリストを取得し、1行目の1列目が0のcsvファイルを探す
function findFoldersWithZeroInCSV() {
    let folders = fs.readdirSync(baseDir);
    let resultFolders = [];

    folders.forEach(folder => {
        let folderPath = path.join(baseDir, folder);
        if (fs.statSync(folderPath).isDirectory()) {
            let csvPath = path.join(folderPath, 'join_logo_scp.csv');
            if (fs.existsSync(csvPath)) {
                let firstLine = fs.readFileSync(csvPath, 'utf-8').split('\n')[0];
                if (firstLine && firstLine.split(',')[0] === '0') {
                    resultFolders.push(folder);
                }
            }
        }
    });

    return resultFolders;
}

// 結果をリスト表示するルート
app.get('/', (req, res) => {
    let folders = findFoldersWithZeroInCSV();
    let html = '<h1>Folders with join_logo_scp.csv (First column is 0)</h1><ul>';
    folders.forEach(folder => {
        html += `<li><a href="/folder/${folder}">${folder}</a></li>`;
    });
    html += '</ul>';
    res.send(html);
});

// 各フォルダ内のファイルをリスト表示
app.get('/folder/:folderName', (req, res) => {
    let folderName = req.params.folderName;
    let folderPath = path.join(baseDir, folderName);
    if (fs.existsSync(folderPath)) {
        let files = fs.readdirSync(folderPath);
        let html = `<h1>Files in folder: ${folderName}</h1><ul>`;
        files.forEach(file => {
            html += `<li>${file}</li>`;
        });
        html += '</ul><a href="/">Back</a>';
        res.send(html);
    } else {
        res.status(404).send('Folder not found');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
