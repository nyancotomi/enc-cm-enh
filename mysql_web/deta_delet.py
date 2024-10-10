import mysql.connector

try:
    cnx = mysql.connector.connect(
        user='epgstation',  # ユーザー名
        password='epgstation',  # パスワード
        host='localhost',  # ホスト名(IPアドレス）
        database='epgstation'  # データベース名
    )

    cursor = cnx.cursor()

    # 削除する行の条件に合わせて WHERE 句を変更してください
    delete_query = "DELETE FROM recorded WHERE id = %s"
    delete_data = (532,)

    cursor.execute(delete_query, delete_data)

    cnx.commit()

    print(f"{cursor.rowcount} record(s) deleted.")

except Exception as e:
    print(f"Error Occurred: {e}")

finally:
    if cnx is not None and cnx.is_connected():
        cnx.close()