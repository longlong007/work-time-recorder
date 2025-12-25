# 工作时间记录器

一个简洁美观的Web应用，用于记录和管理工作时间。

## 功能特点

- ✅ **一键开始/结束** - 点击按钮即可记录工作开始和结束时间
- 📝 **工作内容记录** - 每次工作可以设置工作内容名称
- 📋 **历史记录查询** - 查看所有历史工作记录
- 📅 **日期筛选** - 按日期筛选查看特定日期的记录
- 📊 **统计信息** - 显示今日和本周的工作时长总计
- 💾 **本地存储** - 数据保存在浏览器本地，无需服务器
- 🎨 **现代化UI** - 美观的渐变设计和流畅的动画效果
- 📱 **响应式设计** - 支持手机和电脑访问
- 🌐 **GitHub Pages 部署** - 可轻松部署到 GitHub Pages

## 在线使用

🌐 **GitHub Pages 在线版本**：访问 [在线地址](https://YOUR_USERNAME.github.io/work-time-recorder/)

## 本地使用

1. 克隆或下载此仓库
2. 打开 `index.html` 文件（可以直接双击在浏览器中打开）
3. 点击"开始工作"按钮记录开始时间
4. 工作结束后点击"结束工作"按钮记录结束时间
5. 在历史记录区域查看所有记录
6. 使用日期筛选功能查看特定日期的记录
7. 查看统计信息了解今日和本周的工作时长

## 部署到 GitHub Pages

详细部署指南请查看 [DEPLOY.md](DEPLOY.md)

快速部署：
1. 创建 GitHub 仓库
2. 推送代码到仓库
3. 在仓库 Settings > Pages 中启用 GitHub Pages
4. 访问 `https://YOUR_USERNAME.github.io/work-time-recorder/`

## 文件说明

- `index.html` - 主页面文件
- `style.css` - 样式文件
- `script.js` - 功能逻辑文件
- `README.md` - 说明文档

## 技术栈

- HTML5
- CSS3 (渐变、动画、响应式设计)
- JavaScript (ES6+)
- LocalStorage (本地数据存储)

## 注意事项

- 数据存储在浏览器的LocalStorage中，清除浏览器数据会丢失记录
- 建议定期备份数据（可以导出JSON格式）
- 如果开始工作后未结束就关闭浏览器，下次打开时会自动恢复计时

## 浏览器支持

支持所有现代浏览器：
- Chrome
- Firefox
- Safari
- Edge

