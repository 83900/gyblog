#!/bin/bash
# 启动 ShareSim 股票模拟交易后端服务

# 进入当前目录
cd "$(dirname "$0")"

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "正在创建虚拟环境并安装依赖..."
    python3 -m venv venv
    ./venv/bin/pip install -r requirements.txt
fi

# 启动 Gunicorn 服务 (运行在 8080 端口)
echo "正在启动 Gunicorn..."
./venv/bin/gunicorn -w 2 -b 127.0.0.1:8080 app:app
