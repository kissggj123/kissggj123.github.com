import json
import requests
from bs4 import BeautifulSoup
import filecmp
import time
import threading


class listenThread(threading.Thread):
 def __init__(self, url, originFile, newFile, content):
  threading.Thread.__init__(self)
  self.url = url
  self.originFile = originFile
  self.newFile = newFile
  self.content = content

 def listen(self):
  headers = {
   "User-Agent": "Mozilla/5.0 (Linux; Android 9; SM-A102U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.93 Mobile Safari/537.36",
   'Content-Type': 'application/json'
  }
  html = requests.get(url=self.url, headers=headers)
  soup = BeautifulSoup(html.text, 'lxml')
  html.close()
  target = str(soup.find('div', id='availability_feature_div'))
  filetxt = open(self.originFile, 'w', encoding='utf-8')
  filetxt.write(target)
  filetxt.close()
  while True:
   target = str(soup.find('div', id='availability_feature_div'))
   filetxt = open(self.newFile, 'w', encoding='utf-8')
   filetxt.write(target)
   filetxt.close()
   if filecmp.cmp(self.originFile, self.newFile) == False:
    post_push('c234703ff007468495587ddef16fa23d', 'xbox update', self.content)
    fileAvail = open(self.originFile, 'w')
    fileAvail.write(target)
    fileAvail.close()
   time.sleep(30)
 def run(self):
  self.listen()


def post_push(token, title, content):
 url = 'http://pushplus.hxtrip.com/send'
 data = {
  "token": token,
  "title": title,
  "content": content
 }
 body = json.dumps(data).encode(encoding='utf-8')
 headers = {'Content-Type': 'application/json'}
 requests.post(url, data=body, headers=headers)


if __name__ == '__main__':
 detect_url = 'https://www.amazon.co.jp/-/en/dp/B08GGKZ34Z/ref=sr_1_2?dchild=1&keywords=xbox&qid=1611674118&sr=8-2'
 #url_special = 'https://www.amazon.co.jp/-/en/dp/B08GG17K5G/ref=sr_1_6?dchild=1&keywords=xbox%E3%82%B7%E3%83%AA%E3%83%BC%E3%82%BAx&qid=1611722050&sr=8-6'
 url_germany = 'https://www.amazon.de/Microsoft-RRT-00009-Xbox-Series-1TB/dp/B08H93ZRLL/ref=sr_1_2?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&dchild=1&keywords=xbox&qid=1611742161&sr=8-2'
 xbox = listenThread(url=detect_url,originFile='avail.txt',newFile='avail_now.txt',content='日亚')
 #xbox_sp = listenThread(url=detect_url,originFile='avail_sp.txt',newFile='avail_now_sp.txt')
 xbox_germany = listenThread(url=url_germany,originFile='avail_sp.txt',newFile='avail_now_sp.txt',content='德亚')
 xbox.start()
 #xbox_sp.start()
 xbox_germany.start()
 print("监控程序正在进行")
