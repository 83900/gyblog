# ShareSim 部署指南（Apache / 博客附属模块）

本系统作为你博客的附属功能部署在 `share/` 目录下，后端为 Flask + Gunicorn，前端页面在 `share/static/`。上线部署的目标是让用户通过：

- `https://你的域名/share/login.html` 访问登录页
- `https://你的域名/share/trade.html` 访问交易页

核心思路：Gunicorn 只监听本机 `127.0.0.1:8080`，由 Apache 在 `/share/` 路径上做反向代理。

## 1. 服务器准备（Ubuntu/Debian）

安装 Python 组件（用于修复 venv/ensurepip 报错）：

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip
```

设置环境变量（建议写入 systemd 或 shell profile）：

```bash
export TUSHARE_TOKEN=你的_tushare_token
export TUSHARE_PROXY=http://你的代理地址:端口/
export STOCKSIM_SECRET_KEY=$(openssl rand -hex 32)
```

说明：
- `TUSHARE_TOKEN`：用于盘后/历史 K 线与部分接口；未配置时会影响行情数据可用性
- `TUSHARE_PROXY`：可选，网络受限时使用
- `STOCKSIM_SECRET_KEY`：可选但建议配置，避免服务重启导致会话失效

## 2. 启动后端（Gunicorn）

进入 `share` 目录并启动：

```bash
cd /www/wwwroot/guyivip.top/guyivip.top/share
./start.sh
```

首次启动会自动创建 `venv/` 并安装依赖（含 gunicorn）。

本机验证：

```bash
curl -fsS http://127.0.0.1:8080/login.html | head -n 3
```

如果你需要后台运行（快速方式）：

```bash
nohup ./start.sh >/var/log/sharesim.out 2>&1 &
tail -f /var/log/sharesim.out
```

## 3. Apache 反向代理到 /share（关键）

确保 Apache 已启用反向代理模块：

```bash
sudo a2enmod proxy proxy_http headers
sudo systemctl reload apache2
```

在你的站点 VirtualHost 配置中追加（`<VirtualHost *:80>` 或 `<VirtualHost *:443>` 内）：

```apache
ProxyPreserveHost On
RequestHeader set X-Forwarded-Proto "https"

ProxyPass        /share/  http://127.0.0.1:8080/
ProxyPassReverse /share/  http://127.0.0.1:8080/
```

注意事项：
- `ProxyPass /share/ http://127.0.0.1:8080/` 末尾的 `/` 必须保留，否则子路径会重写失败
- 如果你同时在磁盘上有 `/share/` 静态目录，需确保该目录不会被 Apache 的 `Alias` 或 `DocumentRoot` 静态规则优先命中（优先让 `/share/` 走代理）

重载并验证：

```bash
sudo apache2ctl -t && sudo systemctl reload apache2
curl -I https://你的域名/share/login.html
```

## 4. 建议：用 systemd 做开机自启（稳定方式）

创建服务文件：

```bash
sudo nano /etc/systemd/system/sharesim.service
```

填入（按你的真实目录修改 `WorkingDirectory`）：

```ini
[Unit]
Description=ShareSim (Flask/Gunicorn)
After=network.target

[Service]
Type=simple
WorkingDirectory=/www/wwwroot/guyivip.top/guyivip.top/share
Environment=TUSHARE_TOKEN=你的_tushare_token
Environment=TUSHARE_PROXY=http://你的代理地址:端口/
Environment=STOCKSIM_SECRET_KEY=替换为一段随机字符串
ExecStart=/www/wwwroot/guyivip.top/guyivip.top/share/start.sh
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

启用并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sharesim
sudo systemctl status sharesim --no-pager
```

## 5. 常见问题排查

- 访问 `/share/login.html` 返回 404
  - 检查 VirtualHost 是否加了 `ProxyPass /share/ ...` 且末尾带 `/`
  - `sudo apache2ctl -S` 确认当前生效的站点配置
  - `tail -n 200 /var/log/apache2/error.log`
- venv/ensurepip 报错
  - `sudo apt install -y python3-venv python3-pip`
  - 删除旧 venv 后重启：`rm -rf venv && ./start.sh`
- 后端没有监听 8080
  - `ss -ltnp | grep 8080`
  - `ps aux | grep gunicorn`

## 6. 文件位置说明

- 后端入口与路由：`share/app.py`（工厂模式 `create_app()`，路由支持 `.html` 后缀）
- 启动脚本：`share/start.sh`（自动创建 venv 并启动 gunicorn）
- 依赖清单：`share/requirements.txt`
- 前端页面：`share/static/*.html`
- 前端资源：`share/static/styles.css`、`share/static/js/*.js`
