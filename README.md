# 信封动画项目

这是一个美丽的信封打开动画，包含个性化的纸条信息。

## 功能特点

- 🎯 **触摸交互**：支持触摸滑动打开/关闭信封
- 📱 **响应式设计**：适配移动端和平板设备
- 🎨 **精美动画**：流畅的信封打开和纸条显示效果
- 💫 **视觉效果**：渐变背景和浮动粒子效果
- 🔊 **音效支持**：预留音效接口（可自行添加音频文件）

## 使用方法

1. **本地预览**：
   ```bash
   # 使用Python启动本地服务器
   python3 -m http.server 8000

   # 或使用Node.js的http-server
   npx http-server

   # 或使用任何其他静态文件服务器
   ```

2. **打开链接**：
   将 `index.html` 部署到任何静态文件托管服务（如GitHub Pages、Netlify、Vercel等）

3. **交互操作**：
   - 👆 **向上滑动**：打开信封查看纸条内容
   - 👇 **向下滑动**：关闭信封
   - 🖱️ **点击**：也可用于打开/关闭信封

## 文件结构

```
/
├── index.html      # 主页面
├── styles.css      # 样式文件
├── script.js       # JavaScript交互逻辑
└── README.md       # 项目说明
```

## 自定义内容

要修改纸条内容，请编辑 `index.html` 文件中的 `.paper-content` 部分：

```html
<div class="paper-content">
    <p>你的个性化内容...</p>
</div>
```

## 添加音效

如需添加音效，请：

1. 在项目根目录添加音频文件（如 `open-envelope.mp3` 和 `close-envelope.mp3`）
2. 取消注释 `script.js` 中的音效播放代码：

```javascript
// 取消注释这两行来启用音效
const audio = new Audio('open-envelope.mp3');
audio.play();
```

## 技术栈

- **HTML5**：语义化结构
- **CSS3**：动画和响应式设计
- **Vanilla JavaScript**：触摸事件处理和动画控制

## 浏览器兼容性

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ iOS Safari 12+
- ✅ Android Chrome 60+

## 部署建议

推荐使用以下平台进行部署：

- **GitHub Pages**：免费托管
- **Netlify**：支持自定义域名和自动部署
- **Vercel**：优秀的性能和开发者体验
- **Surge.sh**：快速部署命令行工具

祝你使用愉快！🎉