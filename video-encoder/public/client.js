document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  const channelSelect = document.getElementById('channel'); // チャンネル名を取得


// 出力フォルダ一覧を取得
fetch('/outputfolders')
  .then(response => response.json())
  .then(data => {
    const outputFolderSelect = document.getElementById('outputFolder');

    data.folders.forEach(relativePath => {
      const option = document.createElement('option');
      option.value = relativePath;
      option.textContent = relativePath;
      outputFolderSelect.appendChild(option);
    });
  });

  // チャンネル名一覧を取得
  fetch('/channelnames')
    .then(response => response.json())
    .then(data => {
      data.channelNames.forEach(channelName => {
        const option = document.createElement('option');
        option.value = channelName;
        option.textContent = channelName;
        channelSelect.appendChild(option);
      });
    });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const inputPath = form.querySelector('select[name="inputFile"]').value;
    const outputFolder = form.querySelector('select[name="outputFolder"]').value;
    const channel = channelSelect.value; // 選択されたチャンネル名を取得

    // サーバーサイドにPOSTリクエストを送信
    fetch('/encode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputPath, outputFolder, channel }),
    })
      .then((response) => response.text())
      .then((data) => {
        console.log(data);
      })
      .catch((error) => {
        console.error(error);
      });
  });
});

const ws = new WebSocket('ws://localhost:3000'); // WebSocketサーバのURLに合わせて設定

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // エンコードの進捗情報を受信した場合、表示を更新
  const progress = data.progress;
  console.log(`エンコード進捗: ${progress}%`);
  // 進捗情報を表示するための要素を更新する処理を追加
};
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  const channelSelect = document.getElementById('channel'); // チャンネル名を取得


// 出力フォルダ一覧を取得
fetch('/outputfolders')
  .then(response => response.json())
  .then(data => {
    const outputFolderSelect = document.getElementById('outputFolder');

    data.folders.forEach(relativePath => {
      const option = document.createElement('option');
      option.value = relativePath;
      option.textContent = relativePath;
      outputFolderSelect.appendChild(option);
    });
  });

  // チャンネル名一覧を取得
  fetch('/channelnames')
    .then(response => response.json())
    .then(data => {
      data.channelNames.forEach(channelName => {
        const option = document.createElement('option');
        option.value = channelName;
        option.textContent = channelName;
        channelSelect.appendChild(option);
      });
    });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const inputPath = form.querySelector('select[name="inputFile"]').value;
    const outputFolder = form.querySelector('select[name="outputFolder"]').value;
    const channel = channelSelect.value; // 選択されたチャンネル名を取得

    // サーバーサイドにPOSTリクエストを送信
    fetch('/encode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputPath, outputFolder, channel }),
    })
      .then((response) => response.text())
      .then((data) => {
        console.log(data);
      })
      .catch((error) => {
        console.error(error);
      });
  });
});

const ws = new WebSocket('ws://localhost:3000'); // WebSocketサーバのURLに合わせて設定

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // エンコードの進捗情報を受信した場合、表示を更新
  const progress = data.progress;
  console.log(`エンコード進捗: ${progress}%`);
  // 進捗情報を表示するための要素を更新する処理を追加
};