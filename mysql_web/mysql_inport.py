import mysql.connector

cnx = None

try:
    cnx = mysql.connector.connect(
        user='epgstation',  # ユーザー名
        password='epgstation',  # パスワード
        host='localhost',  # ホスト名(IPアドレス）
        database='epgstation'  # データベース名
    )

    cursor = cnx.cursor()

    # 既存の最大のid値を取得
    cursor.execute("SELECT MAX(id) FROM recorded")
    rec_max_id = cursor.fetchone()[0]

    if rec_max_id is None:
        rec_max_id = 0  # データベースが空の場合

    rec_new_id = rec_max_id + 1  # 新しい行のid値を計算

    rec_name = "TEST"

    sql = ('''
    INSERT INTO recorded
        (id, channelId, startAt, endAt, duration, name ,halfWidthName, isRecording)
    VALUES 
        (%s, %s, %s, %s, %s, %s, %s , %s )
    ''')

    data = [
        (rec_new_id,  '0', '0', '0', '0', rec_name, '0', '0')
    ]

    cursor.executemany(sql, data)
    cnx.commit()

    print(f"{cursor.rowcount} records inserted.")

    cursor.close()

except Exception as e:
    print(f"Error Occurred: {e}")

finally:
    if cnx is not None and cnx.is_connected():
        cnx.close()
