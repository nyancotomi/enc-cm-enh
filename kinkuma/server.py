#/home/pi/CmcutScp/kinkuma/server.py
import http.server
import socketserver

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="/home/pi/CmcutScp/kinkuma", **kwargs)
        self.directory_listing = False

# ポート番号を指定
PORT = 3600

# サーバを起動
with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
    print(f"Serving at port {PORT}")
    httpd.serve_forever()