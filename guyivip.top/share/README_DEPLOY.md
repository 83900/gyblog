# ShareSim 部署指南（Ubuntu 24.04 LTS / 博客附属）

本系统作为你博客的附属功能部署在 `share/` 目录下，后端基于 Flask + Gunicorn，前端采用 Apple 风格设计。下列步骤在 Ubuntu 24.04 LTS 上验证通过。

## 一、准备环境
- 更新并安装必备组件（修复 ensurepip/venv 报错）：
  ```bash
  sudo apt update
  sudo apt install -y python3-venv python3-pip nginx
  ```
- 可选：启用 Tushare 代理（已内置默认代理），设置你的 Token：
  ```bash
  export TUSHARE_TOKEN=你的Token
  # 如需自定义代理（可选）
  export TUSHARE_PROXY=http://你的代理地址:端口/
  ```
- 可选：设置后端会话密钥（不设置则自动生成）：
  ```bash
  export STOCKSIM_SECRET_KEY=$(openssl rand -hex 32)
  ```

## 二、启动后端服务
- 进入 `share` 目录并启动：
  ```bash
  cd /www/wwwroot/guyivip.top/guyivip.top/share
  ./start.sh
  ```
  - 首次启动会自动创建虚拟环境并安装依赖（含 gunicorn）。
  - 启动成功后监听在 `127.0.0.1:8080`。验证：
    ```bash
    curl -fsS http://127.0.0.1:8080/login.html | head -n 3
    ```
  - 后台运行（可选）：
    ```bash
    nohup ./start.sh >/var/log/sharesim.out 2>&1 &
    tail -f /var/log/sharesim.out
    ```

## 三、Nginx 反向代理到 /share
- 在你的站点 `server {}` 块中追加（关键：proxy_pass 结尾带 `/`，用于子路径重写）：
  ```nginx
  location /share/ {
      proxy_pass http://127.0.0.1:8080/;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
  }
  ```
- 重载 Nginx：
  ```bash
  sudo nginx -t && sudo systemctl reload nginx
  ```
- 验证外网访问：
  ```bash
  curl -I https://guyivip.top/share/login.html
  ```

## 四、博客入口链接
- 博客首页导航已改为指向：`share/login.html`（相对路径）。只要 Nginx 映射了 `/share/`，点击即可跳转到系统登录页。

## 五、常见问题与排查
- 报错 “ensurepip is not available”：未安装 `python3-venv`，按「一、准备环境」安装后重启 `./start.sh`。
- 从首页点击出现 404：通常是 Nginx 未配置 `location /share/` 或 `proxy_pass` 缺少结尾 `/` 导致子路径未重写。按「三、Nginx 反向代理到 /share」修正。
- 实时行情为空：需要设置 `TUSHARE_TOKEN`，或网络受限时设置 `TUSHARE_PROXY`。
- 查看后端状态：
  ```bash
  ps aux | grep gunicorn
  ss -ltnp | grep 8080
  tail -n 200 /var/log/nginx/access.log
  tail -n 200 /var/log/nginx/error.log
  ```

## 六、文件位置说明
- 后端入口与路由：`share/app.py`（工厂模式 `create_app()`，路由同时支持 `.html` 后缀）
- 启动脚本：`share/start.sh`（自动修复 venv，Gunicorn 以 `app:create_app()` 启动）
- 依赖清单：`share/requirements.txt`（包含 `Flask`、`tushare`、`pandas`、`gunicorn`）
- 前端页面：`share/static/*.html`，公共逻辑 `share/static/js/common.js`（自动识别子路径 Base）
