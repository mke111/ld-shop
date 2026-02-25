# 科学上网与代理配置指南

本指南介绍主流科学上网方案，包括V2Ray/Xray一键部署和客户端配置。

## 一、Xray/V2Ray一键安装脚本

V2Ray是优秀的开源代理项目，Xray是其分支，功能更强大。

### 一键安装脚本

使用x-ui面板管理，简化配置流程：

```bash
bash <(curl -Ls https://raw.githubusercontent.com/vaxilu/x-ui/master/install.sh)
```

### 安装步骤

1. **连接服务器**
   ```bash
   ssh root@你的服务器IP
   ```

2. **执行安装**
   ```bash
   bash <(curl -Ls https://raw.githubusercontent.com/vaxilu/x-ui/master/install.sh)
   ```

3. **配置选项**
   - 提示时选择安装（Install）
   - 设置用户名和密码
   - 设置端口（默认54321）
   - 确认安装

4. **访问面板**
   - 浏览器打开：`http://你的服务器IP:54321`
   - 使用设置的账户登录

### 常见问题

- **端口被占用**：更换端口或停止占用进程
- **防火墙拦截**：开放端口 `ufw allow 54321`
- **重启服务**：`x-ui restart`

### 手动安装（备选方案）

```bash
# 安装V2Ray
bash <(curl -L https://raw.githubusercontent.com/v2fly/fhs-install-v2ray/master/install-release.sh)

# 启动服务
systemctl start v2ray
systemctl enable v2ray
```

## 二、Clash for Windows配置教程

Clash是一款支持多种协议的代理客户端。

### Windows配置

1. **下载客户端**
   - GitHub: github.com/Fndroid/clash_for_windows_pkg
   - 下载最新版本的`.zip`文件

2. **安装与配置**
   - 解压后运行 `Clash for Windows.exe`
   - 首次运行会创建配置目录

3. **导入节点**
   - 方式1：粘贴订阅地址 → 点击确定
   - 方式2：手动导入配置yaml文件

4. **设置系统代理**
   - 开启「系统代理」开关
   - 浏览器即可访问外网

### 配置文件结构说明

```yaml
# 基础配置
port: 7890
socks-port: 7891
allow-lan: false
mode: rule

# 代理节点
proxies:
  - name: "节点名称"
    type: ss
    server: 服务器地址
    port: 端口
    cipher: aes-256-gcm
    password: 密码

# 代理组（自动选择）
proxy-groups:
  - name: "自动选择"
    type: select
    proxies:
      - 节点名称
      - DIRECT
```

### Android配置

1. **下载Clash for Android**
   - GitHub下载或从应用商店安装
   - 版本：Clash for Android

2. **导入配置**
   - 方式1：输入订阅地址
   - 方式2：导入本地yaml文件
   - 方式3：扫描二维码

3. **启动代理**
   - 开启「连接」开关
   - 可选路由模式：代理/直连/规则

### 进阶设置

1. **代理组配置**
   ```yaml
   proxy-groups:
     - name: "负载均衡"
       type: load-balance
       url: 'http://www.gstatic.com/generate_204'
       interval: 300
       proxies:
         - 节点1
         - 节点2
   ```

2. **规则分流**
   - 使用 `rule-providers` 加载在线规则
   - 常见规则：广告拦截、国内直连、海外代理

## 三、免费节点订阅获取

### 订阅地址来源

1. **免费公益节点**
   - 搜索GitHub上的免费节点项目
   - 关键词：free v2ray/clash node

2. **机场订阅**
   - 机场提供付费/免费订阅
   - 试用期间可获取免费节点

3. **自建节点分享社区**
   - Reddit r/V2Ray、r/Clash相关板块
   - Telegram群组

### 注意事项

- 免费节点通常不稳定，速度有限制
- 不要在免费节点上输入敏感信息
- 建议自建或使用可信机场

## 四、常见问题与解决方案

### DNS泄露检测

DNS泄露会导致真实IP暴露，检测方法：

1. **在线检测网站**
   - dnsleaktest.com
   - ipleak.net

2. **检测结果判断**
   - 如果显示的IP与代理IP一致→正常
   - 如果显示本地ISP IP→存在DNS泄露

3. **解决方案**
   - 启用DNS加密（DoH/DoT）
   - 在配置中添加：
   ```yaml
   dns:
     enable: true
     enhanced-mode: fake-ip
     nameserver:
       - 8.8.8.8
       - 1.1.1.1
   ```

### 速度慢解决方案

1. **检查服务器延迟**
   - 使用ping命令测试服务器响应
   - 选择延迟低的节点

2. **切换协议**
   - 尝试不同协议：VMess/VLESS/Shadowsocks
   - 测试TCP/UDP传输

3. **优化配置**
   - 开启mKCP加速
   - 启用TUN模式
   ```yaml
   tun:
     enable: true
     stack: system
   ```

4. **更换节点**
   - 尝试其他节点或服务器
   - 考虑升级带宽

### 其他常见问题

**无法连接**
- 检查服务器是否在线
- 确认端口和协议配置正确
- 检查防火墙是否放行

**频繁断线**
- 检查网络稳定性
- 尝试更换传输协议
- 降低加密等级

**代理不生效**
- 确认系统代理已开启
- 检查排除列表配置
- 浏览器插件需要单独设置

## 总结

科学上网方案选择建议：
- **个人使用**：自建V2Ray/Xray
- **团队使用**：机场或自建多节点
- **临时使用**：免费节点或机场试用

注意：科学上网仅用于学习和正常工作需要，请遵守当地法律法规。
