#!/bin/bash

# 概要:
# このスクリプトは、指定されたテキストファイルからフレーム情報を読み取り、
# それをCSV形式に変換し、ffmpegを使用して動画をトリミングして結合します。
# 最終的な出力は、指定された出力ファイルに保存されます。

# 引数からファイルパスを取得
file_path="$1"
# ファイル名を抽出
file_name=$(basename "$file_path")
folder_path="/home/pi/cncut-avs/result/$file_name"
# フォルダを作成
mkdir -p "$folder_path"
avs_file="/home/pi/cncut-avs/result/$file_name/join_temp.avs"
# AVSスクリプトファイルを指定されたファイルパスに生成
echo "TSFilePath=\"$1\"" > "$avs_file"
echo "LWLibavVideoSource(TSFilePath, repeat=true, dominance=1)" >> "$avs_file"
echo "AudioDub(last, LWLibavAudioSource(TSFilePath, av_sync=true))" >> "$avs_file"

chapter_exe -v "$avs_file" -oa "/home/pi/cncut-avs/result/$file_name/temp_inscp.txt"
join_logo_scp -inscp /home/pi/cncut-avs/result/$file_name/temp_inscp.txt -incmd "/home/pi/JoinLogoScpTrialSetLinux/JL/JL_標準.txt" -o "/home/pi/cncut-avs/result/$file_name/temp_join_logo_scp.txt"

# テキストファイルのパス
join_input_file="/home/pi/cncut-avs/result/$file_name/temp_join_logo_scp.txt"

# 出力するCSVファイルのパス
join_output_file="/home/pi/cncut-avs/result/$file_name/temp_join_logo_scp.csv"

# テキストファイルを読み込み、指定された形式に変換して出力
cat "$join_input_file" | sed 's/Trim(\([0-9]*\),\([0-9]*\))/\1,\2/g; s/++/\n/g' | tr -d ' ' > "$join_output_file"

# 入力ファイルと出力ファイルのパス
input_file="/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded/ＳＰＹ×ＦＡＭＩＬＹ「知恵の甘味」「情報屋の恋愛大作戦Ⅱ」[字][デ]-2023年10月28日23時.ts"
output_file="/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded/TEST2/1031-0307-sp-test-h264-v4l2.mp4"

# フレーム情報ファイルのパス
frame_info_file="/home/pi/cncut-avs/result/激闘！ラップ甲子園への道　★激ラ卒業生今どうしてる？ＳＰ [ＴＯＫＹＯ　ＭＸ１] 2023年11月01日02時.ts/temp_join_logo_scp.csv"
#frame_info_file="/home/pi/temp_join_logo_scp.csv"

# フィルターコンプレックスの初期値を設定
filter_complex=""

# FPS を設定
fps=29.97

# インデックスを初期化
index=0

# 連結ラベルを生成
concat_label="[v0]"

# CSVファイルを読み込み、各行から開始フレームと終了フレームを取得して処理
while IFS=, read -r start_frames end_frames; do
    # 開始フレームと終了フレームから秒数に変換（小数点3桁まで）
    start_seconds=$(printf "%.3f" $(echo "$start_frames / $fps" | bc -l))
    end_seconds=$(printf "%.3f" $(echo "$end_frames / $fps" | bc -l))
    
    # フィルターコンプレックスに追加
    filter_complex="$filter_complex[0:v]trim=$start_seconds:$end_seconds,setpts=PTS-STARTPTS[v$index];[0:a]atrim=$start_seconds:$end_seconds,asetpts=PTS-STARTPTS[a$index];"
    index=$((index + 1))
done < "$frame_info_file"

# 連結ラベルを生成
concat_label=""
for ((i = 0; i < index; i++)); do
    concat_label="${concat_label}[v${i}][a${i}]"
done
concat_label="${concat_label}concat=n=$((index)):v=1:a=1"

# フィルターコンプレックスに連結ラベルを追加
filter_complex="${filter_complex}${concat_label}"

# フィルターコンプレックスを表示
echo "$filter_complex"

# 完成したffmpegコマンドを実行
#/usr/bin/ffmpeg  -i "$input_file" -filter_complex "$filter_complex" -c:v h264_v4l2m2m -b:v 5M "$output_file"
