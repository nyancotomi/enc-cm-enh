import json
v=json.load(open("channels","r"))
print("#EXTM3U")
url1="http://192.168.1.83:8888/api/streams/live/"
url2="/m2ts?mode=2"

#url1b="http://192.168.1.83:8888/api/streams/live/"
for i in v:
    print("#EXTINF: 0,"+i["name"])
    print(url1+str(i["id"])+url2)
   # print("#EXTINF: 0,vp:"+i["name"])
   # print(url1b+str(i["id"])+url2)