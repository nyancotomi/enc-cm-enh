from datetime import datetime, timezone, timedelta

# 指定された年月日時刻
date_string = "2023-11-01T12:30"

# 日付文字列をdatetimeオブジェクトに変換
dt = datetime.strptime(date_string, "%Y-%m-%dT%H:%M")

# タイムゾーンを設定 (例: UTC)
utc = timezone.utc

# タイムスタンプを計算し、ミリ秒に変換
timestamp = int(dt.timestamp() * 1000)

print(timestamp)



minutes = 30
milliseconds = minutes * 60 * 1000
print(milliseconds)


