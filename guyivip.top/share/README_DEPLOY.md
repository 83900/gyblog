# ShareSim 部署指南（附属博客版）

本系统是一个完全体的虚拟股票交易系统，数据接入 Tushare 获取实时行情，用户数据通过 SQLite 存储（极低成本，适合 20 人以内的小团队），并采用 Apple.com 级别的极简毛玻璃美学设计。

## 1. 启动后端服务

由于系统包含用户注册、持仓计算等动态功能，必须运行后端的 Flask 服务。

1. 进入 `share` 目录。
2. 确保已经安装 Python 3 环境。
3. 执行启动脚本：
   ```bash
   ./start.sh
   ```
   > 提示：如果要在云服务器上后台持续运行，建议使用 `systemd` 或 `nohup ./start.sh &`，并将 Tushare Token 添加到环境变量中：
   > `export TUSHARE_TOKEN=rBMCVWMrHgzcCpCXWGDfBkXkGIzfWRjOKXGSgxOQCGPhrOLGhwwszTezscmCVDTo`

## 2. Nginx 反向代理配置

你的博客主站（如 `guyivip.top`）通常由 Nginx 驱动。为了让本系统作为附属功能在 `https://guyivip.top/share` 完美运行，你需要在原有的 Nginx 配置文件（`server` 块内）追加以下路由转发规则：

```nginx
    # 博客原有的配置保持不变...

    # ShareSim 虚拟股票交易系统代理
    location /share/ {
        # 将请求转发给本地运行的 Gunicorn 后端
        proxy_pass http://127.0.0.1:8080/;
        
        # 确保代理传递真实的 IP 和 Host
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
```

配置完成后，重载 Nginx：`sudo nginx -s reload`。

## 3. 访问系统
在博客首页顶部的导航栏，点击【Others -> 虚拟股票交易】，即可直接跳转到你的完整版交易系统。
