# Vercel GitHub App 部署配置指南

## 📋 前提条件

- ✅ GitHub 仓库：`chrisjiang2016/PlantStory`
- ✅ Vercel 账号（使用 GitHub 登录）
- ✅ Flutter Web 构建产物位置：`client/build/web`

---

## 🚀 步骤 1：连接 Vercel 和 GitHub

### 1.1 登录 Vercel
访问：https://vercel.com/login

点击 **"Continue with GitHub"** 使用你的 GitHub 账号登录。

### 1.2 导入 GitHub 仓库

1. 在 Vercel Dashboard，点击右上角 **"Add New..."** → **"Project"**
2. 在 "Import Git Repository" 页面，找到 `chrisjiang2016/PlantStory`
3. 点击 **"Import"**

如果看不到仓库：
- 点击 **"Adjust GitHub App Permissions"**
- 授权 Vercel 访问 `PlantStory` 仓库

---

## ⚙️ 步骤 2：配置项目设置

### 2.1 基本配置

在 "Configure Project" 页面：

| 设置项 | 值 |
|--------|-----|
| **Project Name** | `plant-story`（或保持默认） |
| **Framework Preset** | `Other`（不选择 Flutter） |
| **Root Directory** | `.`（项目根目录） |

### 2.2 构建设置（重要！）

**Build & Development Settings:**

| 设置 | 值 | 说明 |
|------|-----|------|
| **Build Command** | `echo 'Build is done by GitHub Actions'` | 不在 Vercel 上构建 |
| **Output Directory** | `client/build/web` | Flutter Web 构建产物位置 |
| **Install Command** | `echo 'No installation needed'` | 跳过依赖安装 |

**为什么这样配置？**
- ✅ GitHub Actions 已经完成 Flutter 构建并提交了 `client/build/web`
- ✅ Vercel 只需要部署现成的静态文件，不需要重新构建
- ✅ 避免 Vercel 上安装 Flutter SDK（节省时间和资源）

### 2.3 环境变量

**不需要配置环境变量！** 

API_BASE_URL 已经在 GitHub Actions 构建时通过 `--dart-define` 注入。

---

## 🔧 步骤 3：确认 vercel.json 配置

项目根目录的 `vercel.json` 应该包含：

```json
{
  "version": 2,
  "cleanUrls": true,
  "buildCommand": "echo 'Build is done by GitHub Actions'",
  "outputDirectory": "client/build/web",
  "routes": [
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "installCommand": "echo 'No installation needed - using pre-built files'",
  "framework": null
}
```

**已确认 ✅**：当前仓库的 `vercel.json` 配置正确。

---

## ✅ 步骤 4：部署

点击 **"Deploy"** 按钮。

### 预期结果：

1. **构建步骤（< 1 分钟）**
   - Running Build Command: `echo 'Build is done by GitHub Actions'` ✅
   - Copying output from `client/build/web` ✅

2. **部署成功**
   - Production URL：`https://plant-story.vercel.app`（或类似）
   - Preview URL：每个 commit 都会生成一个预览 URL

---

## 🔄 后续自动部署

配置完成后：

- ✅ 每次推送到 `main` 分支 → 自动触发 Production 部署
- ✅ 每次推送到其他分支 → 自动触发 Preview 部署
- ✅ 不需要手动操作

**工作流：**
1. 本地修改代码 → `git push`
2. GitHub Actions 运行：Flutter analyze → test → build web
3. Vercel 自动检测到新 commit → 部署 `client/build/web`
4. 访问 Production URL 查看更新

---

## 🛡️ 步骤 5：权限设置（可选）

如果需要公开访问 Demo：

1. 在 Vercel Dashboard → 你的项目 → **Settings** → **Deployment Protection**
2. 确认设置为 **"All Deployments"** 或 **"Production Deployments Only"**
3. 关闭 **"Vercel Authentication"**（如果开启了）

---

## 🧪 验证部署

### 5.1 访问 Production URL

部署成功后，访问 Vercel 提供的 URL（类似 `https://plant-story.vercel.app`）。

### 5.2 测试 Demo 模式

1. 打开登录页
2. 点击 **"立即体验 Demo"**
3. 应该能看到演示数据的花园/提醒页面

### 5.3 测试真实 API 模式

1. 点击 **"注册"** → 创建新账号
2. 登录后应该能调用 Railway 后端 API
3. 测试添加植物、创建提醒等功能

### 5.4 检查网络请求

打开浏览器开发者工具 → Network 标签：
- Demo 模式：不应该有 API 请求
- 真实模式：应该看到向 `https://plantstory-production.up.railway.app/api/v1` 的请求

---

## 🎯 常见问题

### Q1: Vercel 报 "No Output Directory found"

**原因：** GitHub Actions 没有成功构建 `client/build/web`。

**解决：**
1. 检查 GitHub Actions 是否成功（应该全绿 ✅）
2. 确认 `client/build/web` 目录已提交到仓库
3. 重新触发 Vercel 部署

### Q2: 部署成功但页面 404

**原因：** 可能是 SPA 路由配置问题。

**解决：**
- 确认 `vercel.json` 包含 SPA 路由规则（已配置 ✅）
- 清除浏览器缓存
- 尝试访问 `/` 根路径而不是子路径

### Q3: 想要自定义域名

1. 在 Vercel Dashboard → 你的项目 → **Settings** → **Domains**
2. 添加你的域名（如 `plant.example.com`）
3. 按照 Vercel 提供的 DNS 配置说明操作

---

## 📝 注意事项

### ⚠️ 不要提交构建产物到 Git（当前例外）

**正常情况下**，`client/build/` 应该在 `.gitignore` 中，不提交到仓库。

**当前方案的特殊性：**
- 为了让 Vercel 不需要安装 Flutter SDK，我们在 GitHub Actions 构建后提交了 `client/build/web`
- 这样 Vercel 只需要复制现成的文件

**未来优化方向：**
- 使用 Vercel Build Cache 或 Artifacts
- 或者直接在 Vercel 上安装 Flutter（需要更长的构建时间）

### ✅ 当前部署状态

- **后端（Railway）：** ✅ 正常运行 → `https://plantstory-production.up.railway.app`
- **前端（Vercel）：** 🔄 等待配置 Vercel GitHub App
- **GitHub Actions：** ✅ 只负责构建，不负责部署

---

## 🎉 完成后的效果

- 📱 访问 Vercel URL 即可体验植の物语 Demo
- 🔄 每次推送代码自动部署
- 🌐 全球 CDN 加速
- 🔐 免费 HTTPS
- 📊 自动生成 Lighthouse 性能报告

---

**需要帮助？**

如果配置过程中遇到问题，请提供：
1. 当前操作的截图
2. Vercel 部署日志
3. 具体的错误信息

我会立即协助解决！🚀
