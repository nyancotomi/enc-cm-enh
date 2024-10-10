#/home/pi/CmcutScp/mysql_web/app.py
#my_python_app.service
# sudo systemctl restart my_python_app
from datetime import datetime, timezone, timedelta
import http.server

from flask import Flask, render_template, request, jsonify
import os
import mysql.connector
from mysql.connector import IntegrityError
from flask import send_file
from helpers import (
    get_files_with_extensions,
    get_lgd_files,
    get_files_in_directory,
    get_files_in_subdirectories,
    get_files_in_directory_2,
    get_files_in_subdirectories_2,
    get_video_info_ffprobe,
    buildVideoCaptures,
)

app = Flask(__name__)


@app.route('/get_thumbnail_files')
def get_thumbnail_files():
    thumbnail_folder = '/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded/thumbnail'
    
    # 画像ファイルのリストを取得
    image_files = [file for file in os.listdir(thumbnail_folder) if file.lower().endswith(('.jpg', '.jpeg'))]

    return jsonify(image_files)

@app.route('/')
def index():
    directory = '/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded'
    allowed_extensions = ('.mp4', '.m2ts', '.ts')
    files = get_files_with_extensions(directory, allowed_extensions)
    lgd_files = get_lgd_files('/home/pi/CmcutScp/join_logo_scp_trial/logo', '.lgd')
    return render_template('index.html', files=files, lgd_files=lgd_files)

@app.route('/get_directory_files')
def get_directory_files():
    selected_directory = request.args.get('selected_directory')
    base_directory = '/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded'
    base_directory_BD = '/srv/dev-disk-by-uuid-10123343e9acbce6'

    if selected_directory == "recorded":
        directory_path = base_directory
        files = get_files_in_directory(directory_path)
    elif selected_directory == "TV_Program":
        directory_path = os.path.join(base_directory, "TV_Program")
        files = get_files_in_subdirectories(directory_path)
    elif selected_directory == "movie":
        directory_path = os.path.join(base_directory, "Movie")
        files = get_files_in_directory(directory_path)
    elif selected_directory == "2023年春番組M2TS":
        directory_path = os.path.join(base_directory, "2023年春番組M2TS")
        files = get_files_in_subdirectories(directory_path)
    elif selected_directory == "2023年夏番組M2TS":
        directory_path = os.path.join(base_directory, "2023年夏番組M2TS")
        files = get_files_in_subdirectories(directory_path)
    elif selected_directory == "Blu-ray":
        directory_path = base_directory_BD
        files = get_files_in_directory(directory_path)
    else:
        files = []

    return jsonify(files)

@app.route('/get_directory_files_2')
def get_directory_files_2():
    selected_directory_2 = request.args.get('selected_directory_2')
    base_directory_2 = '/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded'

    if selected_directory_2 == "recorded":
        directory_path_2 = base_directory_2
        files_2 = get_files_in_directory_2(directory_path_2)
    elif selected_directory_2 == "TV_Program":
        directory_path_2 = os.path.join(base_directory_2, "TV_Program")
        files_2 = get_files_in_subdirectories_2(directory_path_2)
    elif selected_directory_2 == "movie":
        directory_path_2 = os.path.join(base_directory_2, "Movie")
        files_2 = get_files_in_subdirectories_2(directory_path_2)
    else:
        files_2 = []

    return jsonify(files_2)


@app.route('/sampleform-post', methods=['POST'])
def sample_form_temp():
    print('POSTデータ受け取ったので処理します')

    # キーが存在するかを確認してから取得する
    channel = request.form.get('channel', '')
    #thumbnailFile = request.form.get('thumbnailFile', '')
    date = request.form.get('date', '')
    name = request.form.get('name', '')
    description = request.form.get('description', '')
    details = request.form.get('details', '')
    
    fileType = request.form.get('fileType', '')
    directory = request.form.get('directory', '')
    videoFile = request.form['selectedFile']
    #videoFile = request.form["selectedFile"].replace("\u3000", " ")

    fileType_2 = request.form.get('fileType_2', '')
    directory_2 = request.form.get('directory_2', '')
    videoFile_2 = request.form.get('selectedFile_2', '')

    videoFile = mysql.connector.conversion.MySQLConverter.escape(videoFile)
    videoFile_2 = mysql.connector.conversion.MySQLConverter.escape(videoFile_2)

    # チャンネルに応じて channel_id を設定
    channel_id = ''
    if channel == 'TOKYO MX1':
        channel_id = 3239123608
    elif channel == 'TBS1':
        channel_id = 3273901048
    elif channel == '日テレ1':
        channel_id = 3273801040
    elif channel == 'テレ玉1':
        channel_id = 3229529752
    elif channel == 'テレビ東京1':
        channel_id = 3274201072 
    elif channel == 'フジテレビ':
        channel_id = 3274001056 
       
    # fileType設定
    fileType_id = ''
    if fileType == 'TS':
        fileType_id = 'ts'
    elif fileType == 'CMCUT-ENH':
        fileType_id = 'encoded'
    elif fileType == 'H264':
        fileType_id = 'encoded'

    # fileType設定
    fileType_id_2 = ''
    if fileType_2 == 'TS':
        fileType_id_2 = 'ts'
    elif fileType_2 == 'CMCUT-ENH':
        fileType_id_2 = 'encoded'
    elif fileType_2 == 'H264':
        fileType_id_2 = 'encoded'

    video_path = ''
    if directory == 'recorded':
        video_path = f"/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded/{videoFile}"
    elif directory == 'TV_Program':
        video_path = f"/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded/TV_Program/{videoFile}"
    elif directory == 'movie':
        video_path = f"/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded/Movie/{videoFile}"
    elif directory == '2023年夏番組M2TS':
        video_path = f"/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded/2023年夏番組M2TS/{videoFile}"
    elif directory == '2023年春番組M2TS':
        video_path = f"/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded/2023年春番組M2TS/{videoFile}"


    print(f"動画video_path: {video_path} ")
    video_duration, video_size, resolution = get_video_info_ffprobe(video_path)
    print(f"動画サイズ: {video_size} バイト")
    print(f"動画長さ: {video_duration} 秒")
    print(f"解像度: {resolution}")

    dt = datetime.strptime(date, "%Y-%m-%dT%H:%M") # 日付文字列をdatetimeオブジェクトに変換
    utc = timezone.utc # タイムゾーンを設定 (例: UTC)
    startAt = int(dt.timestamp() * 1000) # タイムスタンプを計算し、ミリ秒に変換
    duration_m = int(video_duration * 1000)
    endAt = int(startAt + duration_m)
    print(f"deback: {duration_m}")

    cnx = None

    try:
        cnx = mysql.connector.connect(
            user='epgstation',  # ユーザー名
            password='epgstation',  # パスワード
            host='localhost',  # ホスト名(IPアドレス）
            database='epgstation'  # データベース名
        )

        cursor = cnx.cursor()

        #########Recorded設定
        cursor.execute("SELECT MAX(id) FROM recorded")
        rec_max_id = cursor.fetchone()[0]
        if rec_max_id is None:
            rec_max_id = 0  # データベースが空の場合
        rec_new_id = rec_max_id + 1  # 新しい行のid値を計算

        rec_sql = ('''
        INSERT INTO recorded
            (id, channelId, startAt, endAt, duration, name, halfWidthName, halfWidthDescription, isRecording, extended, halfWidthExtended)
        VALUES 
            (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''')

        rec_data = [
            (rec_new_id,  channel_id, startAt, endAt, duration_m, name, name,description, '0', description, details )
        ]

        ########サムネイル設定
        cursor.execute("SELECT MAX(id) FROM thumbnail")
        thm_max_id = cursor.fetchone()[0]
        if thm_max_id is None:
            thm_max_id = 0  # データベースが空の場合
        thm_new_id = thm_max_id + 1  # 新しい行のid値を計算
        thumbnail_path = f"/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded/thumbnail/{rec_new_id}.jpg"
        buildVideoCaptures(video_path, thumbnail_path)
        thumbnailFile_path =f"{rec_new_id}.jpg"
        
        thm_sql = ('''
        INSERT INTO thumbnail
            (id, filePath, recordedId )
        VALUES 
            (%s, %s, %s)
        ''')
        thm_data = [
            (thm_new_id, thumbnailFile_path, rec_new_id)
        ]

        ########ファイルパス設定
        cursor.execute("SELECT MAX(id) FROM video_file")
        vid_max_id = cursor.fetchone()[0]
        if vid_max_id is None:
            vid_max_id = 0  # データベースが空の場合
        vid_new_id = vid_max_id + 1  # 新しい行のid値を計算
        vid_sql = ('''
        INSERT INTO video_file
            (id, parentDirectoryName, filePath, type, name, size, recordedId )
        VALUES 
            (%s, %s, %s, %s, %s, %s, %s)
        ''')
        vid_data = [
            (vid_new_id, directory, videoFile, fileType_id, fileType, video_size ,rec_new_id)
        ]

        # fileType_2 が "none" でない場合にのみ処理を行う
        if directory_2.lower() != "none" and videoFile_2.lower() != "none":
            video_path_2 = f"/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded/{videoFile_2}"
            video_size_2 = get_video_info_ffprobe(video_path_2)
            vid_new_id_2 = vid_new_id + 1  # 新しい行のid値を計算
            vid_sql_2 = ('''
            INSERT INTO video_file
                (id, parentDirectoryName, filePath, type, name, size, recordedId )
            VALUES 
                (%s, %s, %s, %s, %s, %s, %s)
            ''')

            vid_data_2 = [
                (vid_new_id_2, directory_2, videoFile_2, fileType_id_2, fileType_2, video_size_2, rec_new_id)
            ]


        cursor.executemany(rec_sql, rec_data)
        cursor.executemany(thm_sql, thm_data)
        cursor.executemany(vid_sql, vid_data)
        if directory_2.lower() != "none" and videoFile_2.lower() != "none":
            cursor.executemany(vid_sql_2, vid_data_2)
        cnx.commit()

        print(f"{cursor.rowcount} records inserted.")

        cursor.close()

    except Exception as e:
        print(f"Error Occurred: {e}")

    finally:
        if cnx is not None and cnx.is_connected():
            cnx.close()
    print('POSTデータ受け取ったので処理します',rec_data,vid_data)
    #return f'POST受け取ったよ: {rec_new_id}, {channel}, {date}, {duration}, {name}, {description} , {details},  {fileType}, {directory}, {videoFile}, {fileType_2}, {directory_2}, {videoFile_2}'
    return f'POST受け取ったよ:{rec_data},{vid_data},{thm_data}'

if __name__ == '__main__':
    app.run(host='192.168.1.83', port=3700,debug=True) #

