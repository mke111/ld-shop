# 数据分析完全指南

本知识包涵盖Python pandas数据分析、Excel数据透视表、Google Looker Studio可视化以及实用案例，帮助你快速掌握数据分析技能。

---

## 一、Python Pandas基础

### 环境准备

```bash
pip install pandas numpy matplotlib openpyxl
```

### 读取数据

```python
import pandas as pd

# 读取CSV
df = pd.read_csv("data.csv")

# 读取Excel（指定sheet）
df = pd.read_excel("data.xlsx", sheet_name="Sheet1")

# 读取JSON
df = pd.read_json("data.json")

# 读取数据库
import sqlite3
conn = sqlite3.connect("database.db")
df = pd.read_sql("SELECT * FROM users", conn)

# 读取网页表格
df = pd.read_html("https://example.com/table")[0]
```

### 数据清洗

```python
# 查看数据基本信息
print(df.head())        # 前5行
print(df.shape)         # 行数列数
print(df.dtypes)        # 数据类型
print(df.isnull().sum())# 缺失值统计

# 删除缺失值
df.dropna()                    # 删除有缺失的行
df.dropna(axis=1)             # 删除有缺失的列
df.dropna(subset=["列名"])    # 指定列删除缺失

# 填充缺失值
df.fillna(0)                           # 用0填充
df.fillna(df.mean())                   # 用均值填充
df["列名"].fillna(method="ffill")      # 前向填充

# 删除重复行
df.drop_duplicates()

# 字符串处理
df["name"] = df["name"].str.strip()           # 去除空格
df["email"] = df["email"].str.lower()         # 转小写
df["phone"] = df["phone"].str.replace("-", "") # 替换

# 数据类型转换
df["date"] = pd.to_datetime(df["date"])
df["price"] = df["price"].astype(float)
```

### 统计分析

```python
# 描述性统计
df.describe()                    # 数值列统计
df.describe(include="object")   # 字符串列统计

# 分组统计
df.groupby("category")["sales"].sum()
df.groupby(["year", "month"])["revenue"].mean()

# 排序
df.sort_values("price", ascending=False)
df.sort_index()

# 筛选
df[df["price"] > 100]
df[(df["price"] > 100) & (df["sales"] > 50)]

# 新增列
df["profit"] = df["revenue"] - df["cost"]
df["discount_price"] = df["price"] * 0.9
```

### 数据可视化

```python
import matplotlib.pyplot as plt

# 折线图
df.plot(x="date", y="sales", kind="line")
plt.title("Sales Trend")
plt.show()

# 柱状图
df.groupby("category")["sales"].sum().plot(kind="bar")
plt.title("Sales by Category")
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()

# 饼图
df["category"].value_counts().plot(kind="pie", autopct="%1.1f%%")
plt.title("Category Distribution")
plt.show()

# 散点图
df.plot(x="price", y="sales", kind="scatter")
plt.show()

# 保存图片
plt.savefig("chart.png", dpi=300)
```

### 数据导出

```python
# 导出CSV
df.to_csv("output.csv", index=False)

# 导出Excel（多个sheet）
with pd.ExcelWriter("output.xlsx") as writer:
    df1.to_excel(writer, sheet_name="Sheet1")
    df2.to_excel(writer, sheet_name="Sheet2")
```

---

## 二、Excel数据透视表教程

### 创建数据透视表

1. 选中数据区域（包含表头）
2. 插入 → 数据透视表
3. 选择放置位置（新工作表/现有工作表）
4. 拖拽字段到行/列/值/筛选区域

### 字段配置

| 区域 | 用途 | 示例 |
|-----|------|------|
| 行 | 分组显示 | 地区、产品 |
| 列 | 横向分类 | 年份、月份 |
| 值 | 计算汇总 | 销售额求和、数量计数 |
| 筛选 | 全局过滤 | 日期范围、客户类型 |

### 常用计算

**值字段设置：**
- 求和：销售总额
- 计数：订单数量
- 平均：平均单价
- 最大/最小：极值
- % of Grand Total：占比

### 切片器（Slicer）

1. 点击数据透视表
2. 分析 → 插入切片器
3. 选择要筛选的字段
4. 切片器可多选，实时过滤

### 实战案例：销售报表

1. **行区域**：产品类别 → 客户地区
2. **值区域**：销售额（求和）+ 订单数（计数）
3. **列区域**：季度
4. **筛选**：年份
5. 添加切片器：销售渠道、产品线
6. 条件格式：销售总额用色阶标记

### 注意事项

- 源数据不要有空行或合并单元格
- 建议将数据转换为表格（Ctrl+T）
- 数据更新后刷新透视表（右键→刷新）

---

## 三、Google Looker Studio入门

### 注册与基础

1. 访问 lookerstudio.google.com
2. 用Google账号登录
3. 点击"创建" → 数据源
4. 选择数据连接器

### 连接数据源

**支持的数据源：**
- Google Sheets（最常用）
- Google Analytics
- BigQuery
- MySQL/PostgreSQL
- CSV/Excel上传

### 创建报表流程

1. 选择数据源 → 点击"创建报表"
2. 添加组件：
   - 表格
   - 折线图
   - 柱状图
   - 饼图
   - 分数卡
   - 地理图
3. 配置维度（dimensions）和指标（metrics）
4. 设置日期范围
5. 添加筛选器

### 常用图表配置

**分数卡（Scorecard）：**
- 单指标展示
- 设置对比日期（vs上周/上月）
- 显示趋势箭头

**表格：**
- 添加维度（可多列）
- 添加指标
- 设置排序、样式

**图表通用设置：**
- 数据标签显示
- 图例位置
- 颜色主题

### 分享与协作

1. 点击"分享"按钮
2. 设置查看/编辑权限
3. 可嵌入网站（发布→嵌入代码）
4. 定期查看数据自动更新

### 实战：电商销售仪表盘

**组件布局：**
- 顶部：4个分数卡（GMV、订单数、客单价、转化率）
- 中左：月度趋势折线图
- 中右：品类占比饼图
- 底部：地区热力地图 + Top10产品表格

---

## 四、实用案例

### 案例1：股票数据分析

```python
import pandas as pd
import yfinance as yf
import matplotlib.pyplot as plt

# 获取数据
stock = yf.download("AAPL", start="2023-01-01", end="2024-01-01")

# 计算指标
stock["MA5"] = stock["Close"].rolling(5).mean()
stock["MA20"] = stock["Close"].rolling(20).mean()
stock["Daily_Return"] = stock["Close"].pct_change()

# 统计
print(f"最高价: {stock['High'].max()}")
print(f"最低价: {stock['Low'].min()}")
print(f"平均收盘价: {stock['Close'].mean():.2f}")
print(f"年化收益率: {stock['Daily_Return'].mean()*252*100:.2f}%")
print(f"波动率: {stock['Daily_Return'].std()*252**0.5*100:.2f}%")

# 可视化
fig, axes = plt.subplots(2, 1, figsize=(12, 8))

# 价格图
axes[0].plot(stock["Close"], label="收盘价")
axes[0].plot(stock["MA5"], label="MA5", alpha=0.7)
axes[0].plot(stock["MA20"], label="MA20", alpha=0.7)
axes[0].set_title("AAPL股价走势")
axes[0].legend()
axes[0].grid(True)

# 收益分布
axes[1].hist(stock["Daily_Return"].dropna(), bins=50, edgecolor="black")
axes[1].set_title("日收益率分布")
axes[1].set_xlabel("收益率")
axes[1].set_ylabel("频次")

plt.tight_layout()
plt.show()
```

### 案例2：电商销售分析

```python
import pandas as pd
import matplotlib.pyplot as plt

# 读取数据
df = pd.read_csv("sales.csv")

# 数据清洗
df["订单日期"] = pd.to_datetime(df["订单日期"])
df["月份"] = df["订单日期"].dt.to_period("M")
df["销售额"] = df["数量"] * df["单价"]

# 按月趋势
monthly = df.groupby("月份")["销售额"].sum()
print("月度销售趋势:")
print(monthly)

# 按产品品类
category = df.groupby("品类")["销售额"].sum().sort_values(ascending=False)
print("\n品类销售排名:")
print(category)

# 按地区
region = df.groupby("地区")["订单数"].count()
print("\n地区订单分布:")
print(region)

# Top10客户
top_customers = df.groupby("客户ID")["销售额"].sum().nlargest(10)
print("\nTop10客户:")
print(top_customers)

# 可视化
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# 月度趋势
monthly.plot(kind="line", ax=axes[0,0], marker="o")
axes[0,0].set_title("月度销售额趋势")
axes[0,0].tick_params(axis="x", rotation=45)

# 品类分布
category.plot(kind="bar", ax=axes[0,1], color="steelblue")
axes[0,1].set_title("品类销售排名")
axes[0,1].tick_params(axis="x", rotation=45)

# 地区分布饼图
region.plot(kind="pie", ax=axes[1,0], autopct="%1.1f%%")
axes[1,0].set_title("地区订单占比")

# Top客户
top_customers.plot(kind="barh", ax=axes[1,1], color="coral")
axes[1,1].set_title("Top10客户")

plt.tight_layout()
plt.show()
```

---

## 五、数据分析学习路径

### 入门阶段（1-2个月）

1. **Excel进阶**
   - 数据透视表（必须精通）
   - VLOOKUP/XLOOKUP
   - 条件格式与图表
   - 推荐课程：Excel函数大全

2. **Python基础**
   - 变量、数据类型、流程控制
   - 函数与模块
   - 推荐资源：Python官方教程

3. **Pandas入门**
   - 数据读取与导出
   - 数据清洗基础
   - 简单统计分析

### 进阶阶段（2-3个月）

1. **数据可视化**
   - Matplotlib/Seaborn
   - Plotly交互图表
   - Looker Studio

2. **SQL查询**
   - SELECT/WHERE/GROUP BY
   - JOIN多表查询
   - 子查询与窗口函数

3. **统计基础**
   - 描述性统计
   - 概率基础
   - 假设检验入门

### 实战阶段（持续）

1. ** Kaggle 竞赛**
   - 从Titanic入门
   - 参与入门级竞赛
   - 学习开源方案

2. **项目作品集**
   - 电商数据分析
   - 用户行为分析
   - 股票/金融分析

3. **业务理解**
   - 理解核心业务指标
   - AARRR模型
   - 漏斗分析

### 推荐资源

| 类型 | 资源 |
|-----|------|
| 书籍 | Python数据分析、SQL必知必会 |
| 网站 | Kaggle, LeetCode SQL |
| 课程 | Coursera IBM Data Analysis |
| 工具 | Jupyter Notebook, VS Code |

---

## 快速实践建议

1. **每天一个分析小项目**：用Pandas分析一个小数据集
2. **每周一个可视化**：用Matplotlib/Looker Studio
3. **每月一个完整项目**：从数据获取到洞察输出
4. **建立作品集**：GitHub/个人博客展示

