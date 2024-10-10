const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const PORT = 3000;

// 最新のjoin_debug_0000.logファイルを取得する関数
async function getLatestDebugLog(baseDir) {
    const logFileName = 'join_debug_0000.log';
    let latestFile = null;
    let latestTime = 0;

    const directories = await fs.promises.readdir(baseDir);

    for (const dir of directories) {
        const fullPath = path.join(baseDir, dir, logFileName);
        
        try {
            const stats = await fs.promises.stat(fullPath);
            if (stats.mtimeMs > latestTime) {
                latestTime = stats.mtimeMs;
                latestFile = fullPath;
            }
        } catch (err) {
            console.error(`Error accessing ${fullPath}: ${err.message}`);
        }
    }
    
    return latestFile;
}

// ログファイルの内容を取得する関数
async function readLogFile(filePath) {
    try {
        const data = await fs.promises.readFile(filePath, 'utf-8');
        return data;
    } catch (err) {
        console.error(`Error reading file ${filePath}: ${err.message}`);
        return null;
    }
}

// ログの処理を行う関数
function processLogData(logData) {
    const lines = logData.split('\n');
    const relevantLines = [];
    let lastProgressBlock = null;

    // 各行を確認
    for (const line of lines) {
        if (line.startsWith('Progress:')) {
            // Progressの行を見つけた場合、ブロックを保存
            if (lastProgressBlock) {
                // すでにブロックがある場合は、現在のブロックを置き換える
                lastProgressBlock = [line];
            } else {
                // 新しいブロックの初期化
                lastProgressBlock = [line];
            }
        } else if (lastProgressBlock) {
            // Progressのブロックが見つかっている場合、次の行を追加
            lastProgressBlock.push(line);
            if (lastProgressBlock.length === 4) {
                // 3行を超えたら一番上のブロックを追加
                relevantLines.push(...lastProgressBlock);
                lastProgressBlock = null; // ブロックをリセット
            }
        } else {
            // Progressのブロックが見つかっていない場合、行を保持
            relevantLines.push(line);
        }
    }

    // 最後に残ったProgressブロックを追加
    if (lastProgressBlock) {
        relevantLines.push(...lastProgressBlock);
    }

    return relevantLines.join('\n');
}

// ウェブサーバーのエンドポイント
app.get('/latest-log', async (req, res) => {
    const baseDir = path.join(__dirname, 'result');
    const latestLogFile = await getLatestDebugLog(baseDir);
    
    if (latestLogFile) {
        const logData = await readLogFile(latestLogFile);
        if (logData) {
            const processedData = processLogData(logData);
            res.send(`
                <html>
                <head>
                    <style>
                        body {
                            background-color: black;
                            color: white;
                            font-family: Arial, sans-serif;
                            padding: 10px;
                            margin: 0;
                        }
                        pre {
                            white-space: pre-wrap;
                            word-wrap: break-word;
                        }
                        @media (max-width: 600px) {
                            body {
                                font-size: 16px;
                                padding: 5px;
                            }
                        }
                    </style>
                </head>
                <body>
                    <pre>${processedData}</pre>
                </body>
                </html>
            `);
        } else {
            res.send(`
                <html>
                <head>
                    <style>
                        body {
                            background-color: black;
                            color: white;
                            font-family: Arial, sans-serif;
                            padding: 10px;
                            margin: 0;
                        }
                        @media (max-width: 600px) {
                            body {
                                font-size: 16px;
                                padding: 5px;
                            }
                        }
                    </style>
                </head>
                <body>
                    <p>No log files found.</p>
                </body>
                </html>
            `);
        }
    } else {
        res.send(`
            <html>
            <head>
                <style>
                    body {
                        background-color: black;
                        color: white;
                        font-family: Arial, sans-serif;
                        padding: 10px;
                        margin: 0;
                    }
                    @media (max-width: 600px) {
                        body {
                            font-size: 16px;
                            padding: 5px;
                        }
                    }
                </style>
            </head>
            <body>
                <p>No log files found.</p>
            </body>
            </html>
        `);
    }
});

// サーバーを起動
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
