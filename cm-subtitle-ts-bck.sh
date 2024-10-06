#!/bin/bash

# 字幕ファイルのパス
ts_file_input="$INPUT"
output_file="$OUTPUT"
fps=29.97

# ファイル名のみを抜き取る
ts_file_name=$(basename "$ts_file_input")
# ファイル名のみを抜き取り、拡張子を除外する
file_input=$(basename "$ts_file_input" .ts)

input_file="/home/pi/CmcutScp/result/$ts_file_name/join_logo_scp.csv"

###########-----------------------------------------------------------------------
#カスタムjoin_logo_scp_CSV
#input_file="/home/pi/join_logo_scp.csv"

# ファイルが保存されるディレクトリ
result_dir="/home/pi/CmcutScp/result/$ts_file_name"

# ディレクトリが存在しない場合は作成する
mkdir -p "$result_dir"

###########-----------------------------------------------------------------------
カスタムjoin_logo_scp_CSV
#cp "$input_file" "$result_dir/join_logo_scp.csv"

# CSVファイルのパス
csv_file="$result_dir/cm_subtitle_jls.csv"

# Debugファイルのパス
debug_file="$result_dir/debug_file.log"

# ファイルを作成（touchコマンドを使用）
touch "$csv_file"
touch "$debug_file"

csv_file="/home/pi/CmcutScp/result/$ts_file_name/cm_subtitle_jls.csv"
debug_file="/home/pi/CmcutScp/result/$ts_file_name/debug_file.log"
subtitle_file="/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded/subtitle/$file_input.jpn.srt"

echo "$subtitle_file, $ts_file_name, "$file_input", $output_file, $input_file, $csv_file " >> "$debug_file"

#<< COMMENTOUT
# フレーム位置情報から秒数位置に変換
awk -F',' -v fps="$fps" 'BEGIN {OFS=","} {print $1/fps, $2/fps}' "$input_file" > "$csv_file"

# 行番号を初期化
line_number=0

# 秒時間をhh:mm:ss,sss形式に変換する関数
seconds_to_hh_mm_ss() {
  local input_seconds="$1"
  local milliseconds=$(awk -v seconds="$input_seconds" 'BEGIN {printf "%.0f", seconds * 1000}')
  local seconds=$((milliseconds / 1000 % 60))
  local minutes=$((milliseconds / 1000 / 60 % 60))
  local hours=$((milliseconds / 1000 / 60 / 60))
  printf "%02d:%02d:%02d,%03d" "$hours" "$minutes" "$seconds" "$((milliseconds % 1000))"
}

csv_first_value=$(head -n 1 "$csv_file" | cut -d',' -f1)

# 字幕ファイルを1行ずつ読み込む
while IFS= read -r line; do
  # 行番号をインクリメント
  ((line_number++))

  # 整数かつ文字列 "–>" を含まない行を抽出
  if [[ "$line" =~ ^[0-9]+$ && "$line" != *"-->"* ]]; then
    # 対応する整数の下の行を取得
    next_line_number=$((line_number + 1))
    next_line_number_2=$((line_number + 2))
    next_line=$(sed -n "${next_line_number}p" "$subtitle_file")
    next_line_2=$(sed -n "${next_line_number_2}p" "$subtitle_file")

    # --> で分割し、開始位置と終了位置を取り出して秒に変換
    start_time_seconds=$(echo "$next_line" | awk -F "[,:] *| --> " '{print ($1 * 3600) + ($2 * 60) + $3 + ($4 / 1000)}')
    end_time_seconds=$(echo "$next_line" | awk -F "[,:] *| --> " '{print ($5 * 3600) + ($6 * 60) + $7 + ($8 / 1000)}')
    prev_csv_end_time=0
    csv_start_time_re=0

    # CSVファイルの内容を確認して条件に応じて出力を制御
    prev_csv_start_time_re=0  # CSV処理ループの外で初期化
    while IFS=, read -r csv_start_time csv_end_time; do
      if (( $(awk 'BEGIN {print ('"$start_time_seconds"' > '"$csv_start_time"') && ('"$start_time_seconds"' < '"$csv_end_time"') ? 1 : 0}') )); then
        csv_start_time_re=$(awk 'BEGIN {print ('"$csv_start_time"' - '"$prev_csv_end_time"')}') 

        # カンマで区切って配列に格納
        IFS=',' read -ra values <<< "$prev_csv_start_time_re"

        # 各数値を足し合わせる
        prev_csv_start_time_re_sum=0
        for value in "${values[@]}"; do
          prev_csv_start_time_re_sum=$(echo "$prev_csv_start_time_re_sum + $value" | bc)
        done

        start_time_seconds_re=$(awk 'BEGIN {print ('"$start_time_seconds"' - '"$csv_start_time_re"' - '"$prev_csv_start_time_re_sum"')}')
        end_time_seconds_re=$(awk 'BEGIN {print ('"$end_time_seconds"' - '"$csv_start_time_re"' - '"$prev_csv_start_time_re_sum"')}')
        #echo "$start_time_seconds_re --> $end_time_seconds_re"
        start_time_seconds_re_formatted=$(seconds_to_hh_mm_ss "$start_time_seconds_re")
        end_time_seconds_re_formatted=$(seconds_to_hh_mm_ss "$end_time_seconds_re")
        echo "$line" >> "$output_file"
        echo "$start_time_seconds_re_formatted --> $end_time_seconds_re_formatted" >> "$output_file"
        echo "$next_line_2" >> "$output_file"
        #echo "csv_start_time_re:$csv_start_time_re"
        #echo "prev_csv_start_time_re:$prev_csv_start_time_re"
        #echo "prev_csv_start_time_re_sum: $prev_csv_start_time_re_sum"
        echo "" >> "$output_file"
        csv_end_time_2=$csv_start_time_re
        
      fi
        # 各イテレーションの終了時に更新
      prev_csv_start_time_re+=,$(awk 'BEGIN {print ('"$csv_start_time"' - '"$prev_csv_end_time"')}') 
      #prev_csv_start_time_re+=$(echo "$csv_start_time - $prev_csv_end_time" | bc)
      prev_csv_end_time=$csv_end_time
    done < "$csv_file"
    
  fi
done < "$subtitle_file"
