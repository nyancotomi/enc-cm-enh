# helpers.py
from moviepy.editor import VideoFileClip
import os
import subprocess
import json
import cv2

def filter_files_by_extension(files, extensions):
    return [file for file in files if file.endswith(extensions)]

def get_files_with_extensions(directory, extensions):
    files = get_all_files(directory)
    filtered_files = filter_files_by_extension(files, extensions)
    return filtered_files

def get_all_files(directory):
    files = []
    for root, directories, filenames in os.walk(directory):
        for filename in filenames:
            file_path = os.path.join(root, filename)
            files.append(file_path)
    return files

def get_lgd_files(directory, extension):
    lgd_files = [file.replace(f"{extension}", "") for file in os.listdir(directory) if file.endswith(extension)]
    return lgd_files

def get_files_in_directory(directory):
    allowed_extensions = ('.mp4', '.m2ts', '.ts')
    files = []
    for filename in os.listdir(directory):
        if filename.endswith(allowed_extensions):
            files.append(filename)
    return files

def get_files_in_subdirectories(directory):
    allowed_extensions = ('.mp4', '.m2ts', '.ts')
    files = []
    for root, dirs, _ in os.walk(directory):
        for subdir in dirs:
            subdir_path = os.path.join(root, subdir)
            for filename in os.listdir(subdir_path):
                if filename.endswith(allowed_extensions):
                    file_path = os.path.relpath(os.path.join(subdir_path, filename), directory)
                    files.append(file_path)
    return files

def get_files_in_directory_2(directory):
    allowed_extensions = ('.mp4', '.m2ts', '.ts')
    files = []
    for filename in os.listdir(directory):
        if filename.endswith(allowed_extensions):
            files.append(filename)
    return files

def get_files_in_subdirectories_2(directory):
    allowed_extensions = ('.mp4', '.m2ts', '.ts')
    files = []
    for root, dirs, _ in os.walk(directory):
        for subdir in dirs:
            subdir_path = os.path.join(root, subdir)
            for filename in os.listdir(subdir_path):
                if filename.endswith(allowed_extensions):
                    file_path = os.path.relpath(os.path.join(subdir_path, filename), directory)
                    files.append(file_path)
    return files


def get_video_info_ffprobe(video_path):
    try:
        cmd = [
            'ffprobe',
            '-v', 'error',
            '-show_entries', 'format=size,duration',
            '-show_entries', 'stream=width,height',
            '-of', 'json',
            video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        metadata = json.loads(result.stdout)

        # 動画サイズを取得
        size = int(metadata['format']['size'])

        # 解像度情報を取得
        width = int(metadata['streams'][0]['width'])
        height = int(metadata['streams'][0]['height'])

        try:
            # durationが取得できる場合はそのまま使う
            duration = float(metadata['format']['duration'])
        except KeyError:
            # durationが取得できない場合はサイズから算出
            bitrate = 10 * 1e6  # ビットレート: 10 Mbpsを bps に変換
            framerate = 29.97
            duration = size / (bitrate / 8)  # サイズからdurationを算出

        return duration, size, (width, height)

    except subprocess.CalledProcessError as e:
        print(f"Error getting video info: {e}")
        return 0.0, 0, (0, 0)
    except KeyError as e:
        print(f"Error accessing video metadata: {e}")
        return 0.0, 0, (0, 0)

def save_frame(video_path, output_path, frame_number):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return

    # 指定したフレームに移動
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number - 1)

    _, frame = cap.read()
    if frame is not None:
        # 目標の解像度
        target_width = 480
        target_height = 270

        # リサイズ
        frame = cv2.resize(frame, (target_width, target_height))

        # 画像ファイルで書き出す
        cv2.imwrite(output_path, frame)

    # キャプチャを解放
    cap.release()

# buildVideoCapturesをsave_frameに変更
def buildVideoCaptures(video_path, output_path):
    # 30フレーム目を保存
    save_frame(video_path, output_path, 900)
    