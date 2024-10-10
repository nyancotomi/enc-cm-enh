import yt_dlp

def download_video(url, output_path):
    ydl_opts = {
        'format': 'best',
        'outtmpl': f'{output_path}/%(title)s.%(ext)s',
        'postprocessors': [{
            'key': 'FFmpegVideoConvertor',
            'preferedformat': 'mp4',
        }]
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

# 使用例
video_url = 'https://www.amazon.co.jp/%E6%99%82%E5%85%89%E4%BB%A3%E7%90%86%E4%BA%BA-LINK-CLICK-%E2%85%A1/dp/B0CVBMVQJN/ref=sr_1_1?crid=2TYK7AMFB96&dib=eyJ2IjoiMSJ9.2pcBSPojPpXi-gW6EW4Vngrj5sogjYGMnY2KeRkLBku1vTHsPcfhUzhbN4Y1dQszrlVPPUh2w3rZaLceZMsYCBUMcENz_Tq7i55I4uL0_J-U3ejOds7Wp2vCb4aC7XBdkus4X-CHWplpnsVcwln3R4TPnkeHgDBQsFUwn7EtX7ENYEAPIgjXRUxFylQWFUNVJOvUMcRJyjeUzgdaNknWof8gAqYP9IoNuVRYKCceAXc.DeZO6fME2T40TC0h95XhEjVN9oWW3fFV4fRr4q8MP3k&dib_tag=se&keywords=%E6%99%82%E5%8A%B9%E4%BB%A3%E7%90%86%E4%BA%BA&qid=1728469926&s=instant-video&sprefix=%E6%99%82%E5%8A%B9%E4%BB%A3%E7%90%86%E4%BA%BA%2Cinstant-video%2C240&sr=1-1'  # ダウンロードする動画のURLを指定
output_directory = '/srv/dev-disk-by-uuid-D454C24354C22856/NAS_4_1/Recorded/2024-4cours'  # 保存先のディレクトリを指定
download_video(video_url, output_directory)
