#!/bin/bash
set -euo pipefail
# 启动 ShareSim 股票模拟交易后端服务

cd "$(dirname "$0")"

PY=${PYTHON:-python3}
WORKERS=${WORKERS:-2}
BIND=${BIND:-127.0.0.1:8080}
VENV_DIR=${VENV_DIR:-venv}
VENV_PY="./${VENV_DIR}/bin/python"
VENV_GUNICORN="./${VENV_DIR}/bin/gunicorn"

ensure_venv() {
  if ! "$PY" -m venv --help >/dev/null 2>&1; then
    if [ -f /etc/debian_version ]; then
      echo "检测到 Debian/Ubuntu 系统，正在安装 python3-venv..."
      apt update && apt install -y python3-venv python3-pip
    else
      echo "当前系统未启用 venv，请手动安装对应的 python venv 包"
      exit 1
    fi
  fi
}

bootstrap_venv() {
  ensure_venv
  "$PY" -m venv "$VENV_DIR"
  "$VENV_PY" -m pip install -U pip setuptools wheel
  "$VENV_PY" -m pip install -r requirements.txt
}

if [ ! -d "$VENV_DIR" ]; then
  echo "正在创建虚拟环境并安装依赖..."
  bootstrap_venv
fi

if [ ! -x "$VENV_PY" ]; then
  echo "检测到虚拟环境不完整，正在重建..."
  rm -rf "$VENV_DIR"
  bootstrap_venv
fi

if ! "$VENV_PY" -m pip --version >/dev/null 2>&1; then
  echo "检测到 pip 不可用，正在修复..."
  rm -rf "$VENV_DIR"
  bootstrap_venv
fi

if [ ! -x "$VENV_GUNICORN" ]; then
  echo "检测到 gunicorn 未安装，正在安装依赖..."
  "$VENV_PY" -m pip install -r requirements.txt
fi

if [ -z "${TUSHARE_TOKEN-}" ]; then
  echo "提示：未检测到 TUSHARE_TOKEN 环境变量，实时行情可能不可用"
fi

echo "正在启动 Gunicorn..."
exec "$VENV_GUNICORN" -w "$WORKERS" -b "$BIND" 'app:create_app()'
