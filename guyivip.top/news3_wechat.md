# 在树莓派5上部署 Ollama 并配置 8GB 交换空间以使用 LLM

> **ATTENTION：** 配置为树莓派5 8GB 版本，实践成功时间为 2025.8.25，部分指令及配置步骤可能有所变化。

---

## Step 1：SD 卡烧录以及远程登录树莓派

1. 下载树莓派烧录软件 [Raspberry Pi Imager](https://www.raspberrypi.org/software/)

2. 插入 SD 卡，选择系统 **Raspberry Pi OS (64-bit)**

> ⚠️ 如果你使用的是常见的 3.5 英寸串口屏，请务必向商家索要**特制系统**（内置屏幕驱动），否则开机会白屏。

![烧录设置](https://guyivip.top/images/resource/news3-fig1.png)

### 📌 无屏幕用户的额外步骤

**breach1：** 无显示屏时，请提前在烧录时配置好网络，并在"服务"页面开启 SSH。

![网络配置](https://guyivip.top/images/resource/news3-fig2.png)

> 💡 **Tip：** 两个设备必须处于同一网络，这是 SSH 连接的基础。

**breach2：** 在 SD 卡根目录创建一个名为 `ssh` 的空白文件（**无任何扩展名**），用于开启 SSH 服务。
- Windows：请打开扩展名显示确认
- Mac：请在文件设置中确认

3. 插入 SD 卡到树莓派，检查指示灯状态。

4. 登录树莓派：
```
ssh pi@树莓派IP地址
```

例如：
```
ssh pi@192.168.1.100
```

默认用户名：`pi`，默认密码：`raspberry`

---

## Step 2：配置交换空间（可选但推荐）

由于树莓派5 8GB 版本内存有限，Ollama 默认需要 16GB 内存，因此需要配置交换空间。

**1. 检查 SD 卡挂载情况：**
```bash
df -h
```

**2. 创建交换文件（8GB）：**
```bash
sudo fallocate -l 8G /mnt/swapfile
```

**3. 设置权限：**
```bash
sudo chmod 600 /mnt/swapfile
```

**4. 格式化为交换格式：**
```bash
sudo mkswap /mnt/swapfile
```

**5. 启用交换文件：**
```bash
sudo swapon /mnt/swapfile
```

**6. 验证：**
```bash
df -h
```

**7. 设置开机自动挂载：**
```bash
sudo nano /etc/fstab
```

在文件末尾添加：
```
/mnt/swapfile none swap defaults 0 0
```

按 `Ctrl+X` → `Y` → `Enter` 保存退出。

---

## Step 3：安装 Ollama

### 方法一：在线安装（需要代理，不推荐）
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 方法二：离线安装（推荐）✅

1. 在本地电脑下载 [Ollama Linux arm64 版本](https://github.com/ollama/ollama/releases/latest)

2. 传输到树莓派（U盘拷贝或 SCP）：
```bash
scp ollama-linux-arm64 pi@树莓派IP地址:/home/pi
```

3. 解压并安装：
```bash
cd /home/pi
sudo tar -C /usr/local -xzf ollama-linux-arm64.tgz
```

4. 移动二进制文件：
```bash
sudo mv bin/ollama /usr/local/bin/
```

5. 刷新依赖库：
```bash
sudo ldconfig
```

6. 验证安装：
```bash
ollama --version
```

### 配置开机自启动（systemd）

创建服务文件：
```bash
sudo nano /etc/systemd/system/ollama.service
```

写入以下内容：
```ini
[Unit]
Description=Ollama Service
After=network.target

[Service]
User=pi
Group=pi
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=3
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

[Install]
WantedBy=multi-user.target
```

保存退出后执行：
```bash
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama
sudo systemctl status ollama
```

看到 `Active: active (running)` 即表示成功。

> 💡 如果未配置自启动，每次开机后手动运行：`ollama serve`

---

## Step 4：下载模型

**拉取模型（以 Llama 为例）：**
```bash
ollama pull llama:latest
```

或指定版本：
```bash
ollama pull llama:7b
```

> 📋 [Ollama 模型库](https://ollama.ai/library) 可查询所有可用模型，包括视觉模型。

**查看已下载模型：**
```bash
ollama list
```

**删除模型：**
```bash
ollama rm llama:latest
```

---

## Step 5：启动模型并对话

```bash
ollama run llama:latest
```

即可直接与模型对话。视觉模型可在对话中直接上传图片，具体指令请参考模型文档。

**退出对话：** 输入 `exit` 或 `/bye`

---

*原文链接：https://guyivip.top/news3.html*
