# GitHub Pages 部署指南

本指南将帮助您将这个工作时间记录器部署到 GitHub Pages。

## 前置要求

- 已安装 Git
- 拥有 GitHub 账号

## 部署步骤

### 1. 初始化 Git 仓库

在项目目录下打开终端/命令行，执行以下命令：

```bash
# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 提交文件
git commit -m "Initial commit: 工作时间记录器"
```

### 2. 创建 GitHub 仓库

1. 登录 GitHub
2. 点击右上角的 "+" 号，选择 "New repository"
3. 填写仓库信息：
   - Repository name: `work-time-recorder` (或您喜欢的名称)
   - Description: `工作时间记录器 - 一个简洁美观的Web应用`
   - 选择 Public (GitHub Pages 免费版需要公开仓库)
   - **不要**勾选 "Initialize this repository with a README"
4. 点击 "Create repository"

### 3. 连接本地仓库到 GitHub

在终端执行以下命令（将 `YOUR_USERNAME` 替换为您的 GitHub 用户名）：

```bash
# 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/work-time-recorder.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 4. 启用 GitHub Pages

1. 在 GitHub 仓库页面，点击 "Settings"（设置）
2. 在左侧菜单中找到 "Pages"
3. 在 "Source" 部分：
   - 选择 "Deploy from a branch"
   - Branch 选择 "main"
   - Folder 选择 "/ (root)"
4. 点击 "Save"

### 5. 访问您的网站

等待几分钟后，您的网站将在以下地址可用：
```
https://YOUR_USERNAME.github.io/work-time-recorder/
```

GitHub 会显示您的网站地址，您也可以在 Settings > Pages 页面看到。

## 更新网站

当您修改代码后，执行以下命令更新网站：

```bash
# 添加更改的文件
git add .

# 提交更改
git commit -m "更新描述"

# 推送到 GitHub
git push
```

推送后，GitHub Pages 会自动更新（通常需要几分钟）。

## 注意事项

1. **数据存储**：本应用使用浏览器的 LocalStorage 存储数据，每个用户的数据都保存在各自的浏览器中。

2. **HTTPS**：GitHub Pages 自动提供 HTTPS，确保数据传输安全。

3. **自定义域名**：如果您有自己的域名，可以在 Settings > Pages 中设置自定义域名。

4. **文件结构**：确保 `index.html` 在仓库根目录，GitHub Pages 才能正确识别。

## 故障排除

### 网站显示 404
- 确保仓库是 Public
- 检查 Settings > Pages 中的配置是否正确
- 等待几分钟让 GitHub 完成部署

### 样式或脚本不加载
- 检查文件路径是否正确（使用相对路径）
- 确保所有文件都已提交到仓库

### 数据丢失
- 这是正常的，因为数据存储在浏览器本地
- 清除浏览器缓存会删除数据
- 如需持久化存储，需要后端服务

## 快速部署命令（一键执行）

如果您已经创建了 GitHub 仓库，可以一次性执行以下命令：

```bash
git init
git add .
git commit -m "Initial commit: 工作时间记录器"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/work-time-recorder.git
git push -u origin main
```

然后将 `YOUR_USERNAME` 替换为您的 GitHub 用户名，`work-time-recorder` 替换为您的仓库名。

