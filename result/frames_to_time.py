def frames_to_time(frame_number, frame_rate):
    time_in_seconds = frame_number / frame_rate
    hours, remainder = divmod(int(time_in_seconds), 3600)
    minutes, seconds = divmod(remainder, 60)
    return "{:02d}:{:02d}:{:02d}".format(hours, minutes, seconds)

def main():
    # フレーム数とフレームレートの設定
    frame_number = int(input("フレーム数を入力してください: "))
    frame_rate = 29.97

    # 時刻の計算
    time_formatted = frames_to_time(frame_number, frame_rate)

    # 結果の表示
    print(f"{frame_number} フレームは {time_formatted} に相当します。")

if __name__ == "__main__":
    main()
