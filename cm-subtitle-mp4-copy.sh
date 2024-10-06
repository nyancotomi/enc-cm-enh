#!/bin/bash

# 字幕ファイルのパス
ts_file_input='/srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/Recorded/Movie/金曜ロードショー「耳をすませば」★青春物語の名作を実写映画化★地上波初放送[解][字][デ]-2024年05月10日21時.ts'
output_file="$OUTPUT"
fps=29.97

# ファイル名のみを抜き取り、拡張子を除外する
ts_file_name=$(basename "$ts_file_input")

input_file="/home/pi/CmcutScp/result/$ts_file_name/join_logo_scp.csv"

# input_fileの内容を出力する
echo "$input_file"
