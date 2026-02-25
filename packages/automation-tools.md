# 自动化工具完全指南

本知识包涵盖Python自动化、n8n工作流、Zapier集成以及5个可直接使用的脚本模板，帮助你实现日常工作的自动化。

---

## 一、Python自动化三剑客

### 1. requests - 简单HTTP请求

```python
import requests

# GET请求
response = requests.get("https://api.github.com/users/octocat")
print(response.status_code)
print(response.json())

# POST请求（提交表单）
data = {"username": "test", "password": "123456"}
response = requests.post("https://httpbin.org/post", data=data)
print(response.json())

# 带Header和超时
headers = {"Authorization": "Bearer YOUR_TOKEN"}
response = requests.get("https://api.example.com/data", 
                       headers=headers, timeout=10)
```

### 2. Selenium - 浏览器自动化

```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# 无头模式配置
options = Options()
options.add_argument("--headless")
options.add_argument("--no-sandbox")

driver = webdriver.Chrome(options=options)
driver.get("https://www.google.com")

# 等待元素加载
search_box = WebDriverWait(driver, 10).until(
    EC.presence_of_element_located((By.NAME, "q"))
)
search_box.send_keys("Python自动化")
search_box.submit()

# 截图保存
driver.save_screenshot("result.png")
driver.quit()
```

### 3. Playwright - 现代浏览器自动化

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # 拦截请求
    page.route("**/*.{png,jpg,jpeg}", lambda route: route.abort())
    
    page.goto("https://example.com")
    print(page.title())
    
    # 填写表单
    page.fill("#username", "myuser")
    page.fill("#password", "mypass")
    page.click("#submit")
    
    browser.close()
```

---

## 二、n8n本地部署与使用

### Docker部署

```bash
# 基础运行
docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n

# 持久化数据
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# 带环境变量（支持OpenAI等）
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  -e OPENAI_API_KEY=your_key \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=password \
  n8nio/n8n
```

### 常用工作流示例

**定时抓取网页数据：**
1. 添加 Cron 节点 → 设置 cron 表达式 `0 9 * * *`（每天9点）
2. 添加 HTTP Request 节点 → URL填目标网站 → 设置CSS选择器提取数据
3. 添加 Google Sheets 节点 → 写入表格

**邮件通知工作流：**
1. 触发节点（Webhooks/定时）
2. HTTP Request 获取数据
3. IF 节点判断条件
4. Email Send 节点发送通知

---

## 三、Zapier免费版使用教程

### 注册与基础设置

1. 访问 zapier.com 注册账号
2. 免费版限制：100次/月，2步工作流，5个Zaps
3. 常用触发器：Gmail、Slack、Google Sheets、Zoom、HubSpot

### 实战：Gmail到Slack通知

1. **Trigger**: 选择 Gmail → "New Email"
2. 授权Gmail账户，设置过滤条件（来自特定发件人/包含关键词）
3. **Action**: 选择 Slack → "Send Channel Message"
4. 授权Slack，选择频道，编辑消息模板：
   ```
   📧 新邮件来自: {{from_name}}
   主题: {{subject}}
   预览: {{snippet}}
   ```

### 常用Zap模板推荐

- Google Sheets 新行 → 自动发送邮件
- Typeform 提交 → 创建 Trello 卡片
- Instagram → 自动 新帖子发 Twitter
- Shopify 新订单 → 发送 Slack 通知

---

## 四、常用自动化场景

### 场景1：定时发送邮件

```python
import smtplib
from email.mime.text import MIMEText
import schedule
import time

def send_daily_report():
    msg = MIMEText("今日数据报告已生成", "plain", "utf-8")
    msg["Subject"] = "每日报告"
    msg["From"] = "your_email@gmail.com"
    msg["To"] = "recipient@example.com"
    
    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login("your_email@gmail.com", "app_password")
        server.send_message(msg)

# 每天早上9点执行
schedule.every().day.at("09:00").do(send_daily_report)

while True:
    schedule.run_pending()
    time.sleep(60)
```

### 场景2：抓取网页数据

```python
import requests
from bs4 import BeautifulSoup
import csv

url = "https://news.ycombinator.com/"
headers = {"User-Agent": "Mozilla/5.0"}

response = requests.get(url, headers=headers)
soup = BeautifulSoup(response.text, "html.parser")

titles = []
for item in soup.select(".titleline")[:10]:
    titles.append({
        "title": item.get_text(),
        "link": item.a["href"]
    })

# 保存为CSV
with open("hackernews.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["title", "link"])
    writer.writeheader()
    writer.writerows(titles)
```

### 场景3：自动提交表单

```python
from selenium.webdriver.common.by import By

# 登录并提交表单示例
driver.get("https://example.com/form")
driver.find_element(By.NAME, "email").send_keys("test@test.com")
driver.find_element(By.NAME, "password").send_keys("password")
driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
```

---

## 五、实用脚本模板5个

### 模板1：文件批量重命名

```python
import os
import glob

folder = "./files"
for i, filepath in enumerate(glob.glob(f"{folder}/*"), 1):
    dirname = os.path.dirname(filepath)
    ext = os.path.splitext(filepath)[1]
    new_name = f"file_{i:03d}{ext}"
    os.rename(filepath, os.path.join(dirname, new_name))
    print(f"重命名: {filepath} -> {new_name}")
```

### 模板2：图片批量压缩

```python
from PIL import Image
import os

def compress_image(input_path, output_path, quality=70):
    img = Image.open(input_path)
    img.save(output_path, "JPEG", quality=quality, optimize=True)

for file in os.listdir("./images"):
    if file.endswith((".jpg", ".jpeg", ".png")):
        compress_image(f"./images/{file}", f"./compressed/{file}")
```

### 模板3：PDF批量加水印

```python
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from PyPDF2 import PdfReader, PdfWriter

def add_watermark(input_pdf, output_pdf, watermark_text):
    reader = PdfReader(input_pdf)
    writer = PdfWriter()
    
    for page in reader.pages:
        c = canvas.Canvas("temp_watermark.pdf", pagesize=letter)
        c.drawString(100, 700, watermark_text)
        c.save()
        
        watermark = PdfReader("temp_watermark.pdf").pages[0]
        page.merge_page(watermark)
        writer.add_page(page)
    
    with open(output_pdf, "wb") as f:
        writer.write(f)
```

### 模板4：Excel数据汇总

```python
import pandas as pd

# 读取多个Excel并合并
files = ["sales1.xlsx", "sales2.xlsx", "sales3.xlsx"]
df = pd.concat([pd.read_excel(f) for f in files], ignore_index=True)

# 数据清洗
df.dropna(subset=["金额"], inplace=True)
df["日期"] = pd.to_datetime(df["日期"])
df["月份"] = df["日期"].dt.to_period("M")

# 按月汇总
monthly = df.groupby("月份")["金额"].sum().reset_index()
monthly.to_excel("monthly_summary.xlsx", index=False)
```

### 模板5：API批量请求

```python
import requests
import concurrent.futures
import time

def fetch_data(url):
    try:
        r = requests.get(url, timeout=10)
        return {"url": url, "status": r.status_code, "data": r.json()}
    except Exception as e:
        return {"url": url, "error": str(e)}

urls = [f"https://api.example.com/item/{i}" for i in range(100)]

with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(fetch_data, urls))

print(f"成功: {sum(1 for r in results if 'data' in r)}")
```

---

## 资源推荐

- **Selenium文档**: https://www.selenium.dev/documentation/
- **Playwright文档**: https://playwright.dev/python/
- **n8n工作流模板**: https://n8n.io/workflows/
- **Zapier集成**: https://zapier.com/apps/
