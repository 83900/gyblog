# Seek4nothing 技术博客

[![Website](https://img.shields.io/website?url=https%3A%2F%2Fguyivip.top)](https://guyivip.top)
[![License](https://img.shields.io/github/license/83900/gyblog)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/83900/gyblog)](https://github.com/83900/gyblog)

> 专注于技术分享的个人博客，涵盖树莓派开发、人工智能、编程教程和技术资源分享。

🌐 **在线访问**: [guyivip.top](https://guyivip.top)

## 📖 项目简介

这是一个基于静态HTML的技术博客网站，主要分享：
- 🔧 树莓派开发与应用
- 🤖 人工智能与机器学习
- 💻 编程教程与技术文档
- 🛠️ 实用工具与资源分享
- 📱 项目展示与演示

## ✨ 主要功能

### 🏠 博客主站
- **响应式设计**: 支持桌面端和移动端访问
- **SEO优化**: 完整的meta标签和结构化数据
- **多页面结构**: 首页、文章页、关于页面等
- **现代化UI**: 基于Bootstrap的美观界面

### 🛠️ 实用工具
- **股票盈亏计算器** (`stock_profit_calculator.py`)
  - 精确计算交易成本（佣金、印花税、过户费）
  - 支持批量计算和详细报告
  - 命令行界面，易于使用

### 📱 项目展示
- **WanderLog旅行日记应用** (`WL_En.html`)
  - 完整的项目演示页面
  - 交互式界面展示
  - 响应式设计演示

### 🔧 资源工具页
- **在线工具集合** (`resources.html`)
  - 移动端预览工具
  - 实用资源链接
  - 开发者工具集

## 🚀 技术栈

- **前端**: HTML5, CSS3, JavaScript
- **框架**: Bootstrap 4/5
- **后端工具**: Python 3
- **部署**: 静态文件托管
- **版本控制**: Git

## 📁 项目结构

```
gyblog/
├── guyivip.top/              # 网站根目录
│   ├── index.html            # 首页
│   ├── about.html            # 关于页面
│   ├── contact.html          # 联系页面
│   ├── resources.html        # 资源工具页
│   ├── WL_En.html           # WanderLog项目展示
│   ├── news1-4.html         # 文章页面
│   ├── stock_profit_calculator.py  # 股票计算器
│   ├── css/                 # 样式文件
│   ├── js/                  # JavaScript文件
│   ├── images/              # 图片资源
│   ├── fonts/               # 字体文件
│   ├── .htaccess           # Apache配置
│   ├── robots.txt          # 搜索引擎配置
│   └── sitemap.xml         # 网站地图
├── README.md               # 项目说明
└── LICENSE                 # 开源协议
```

## 🛠️ 本地开发

### 环境要求
- Web服务器 (Apache/Nginx) 或本地开发服务器
- Python 3.6+ (用于运行计算器工具)
- 现代浏览器

### 快速开始

1. **克隆项目**
```bash
git clone https://github.com/83900/gyblog.git
cd gyblog
```

2. **启动本地服务器**
```bash
# 使用Python内置服务器
cd guyivip.top
python -m http.server 8000

# 或使用Node.js
npx serve .

# 或使用PHP
php -S localhost:8000
```

3. **访问网站**
打开浏览器访问 `http://localhost:8000`

### 使用股票计算器
```bash
cd guyivip.top
python stock_profit_calculator.py
```

## 🚀 部署指南

### 传统Web服务器部署
1. 将 `guyivip.top/` 目录内容上传到服务器
2. 配置域名指向该目录
3. 确保 `.htaccess` 文件生效（Apache）

### 云服务器部署
```bash
# 在服务器上克隆项目
git clone https://github.com/83900/gyblog.git
cd gyblog

# 配置Git（首次）
git config --global user.name "你的用户名"
git config --global user.email "你的邮箱"

# 设置远程仓库
git remote set-url origin https://github.com/83900/gyblog.git
```

### 同步更新
```bash
# 拉取最新更改
git pull origin main

# 推送本地更改
git add .
git commit -m "更新描述"
git push origin main
```

## 🔧 配置说明

### SEO配置
- 修改各页面的 `<title>` 和 `<meta>` 标签
- 更新 `sitemap.xml` 中的URL
- 配置 `robots.txt` 文件

### 自定义样式
- 主要样式文件: `css/style.css`
- 响应式样式: `css/responsive.css`
- Bootstrap样式: `css/bootstrap.css`

## 📝 内容管理

### 添加新文章
1. 复制 `news_model.html` 作为模板
2. 修改文章内容和meta信息
3. 更新导航菜单链接
4. 提交到Git仓库

### 更新工具
- 股票计算器: 修改 `stock_profit_calculator.py`
- 在线工具: 编辑 `resources.html`

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 开源协议

本项目采用 MIT 协议 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

- **网站**: [guyivip.top](https://guyivip.top)
- **GitHub**: [83900/gyblog](https://github.com/83900/gyblog)
- **邮箱**: 通过网站联系页面获取

## 🙏 致谢

- Bootstrap 团队提供的优秀前端框架
- 所有为开源社区做出贡献的开发者们

---

⭐ 如果这个项目对你有帮助，请给它一个星标！