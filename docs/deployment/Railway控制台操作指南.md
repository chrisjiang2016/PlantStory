# Railway 控制台操作指南

> 帮助你在 Railway 控制台中定位并配置后端服务

---

## 第一步：找到正确的项目

你的 Railway 账号下有两个项目：
- **resilient-quietude**
- **adequate-fascination**

我们需要找到哪个项目包含域名 `plantstory-production.up.railway.app`

### 操作步骤：

1. 访问 https://railway.app/dashboard
2. 你会看到所有项目的列表
3. **逐个点开**这两个项目
4. 在项目里找**服务列表**（通常在页面中间或左侧）
5. 点击每个服务，查看它的 **Settings** 或 **Domains** 标签页
6. 看看哪个服务的域名是：`plantstory-production.up.railway.app`
7. 找到后，**记下这个项目的名称**

---

## 第二步：识别 NestJS 后端服务

在正确的项目里，你应该能看到多个"卡片"或"方块"，每个代表一个服务。

### NestJS 后端服务的特征：

**可能的名称：**
- `backend`
- `nestjs`
- `plant-story-backend`
- `api`
- `server`
- 或者其他自定义名称

**如何确认：**
1. 点击这个服务
2. 查看 **Settings** 标签页
3. 在 **Service Details** 或 **Source** 部分，应该能看到：
   - **Repository**: `chrisjiang2016/PlantStory`（或类似的 GitHub 仓库）
   - **Root Directory**: `backend/` 或留空
   - **Start Command**: `npm run start:prod` 或类似命令

**域名确认：**
- 在 **Settings** 标签页，找到 **Domains** 或 **Networking** 部分
- 应该能看到：`plantstory-production.up.railway.app`

---

## 第三步：检查并添加 PostgreSQL 数据库

### 3.1 检查是否已有数据库

在项目页面（显示所有服务的地方），找找有没有一个**大象图标**的服务：
- 图标：🐘（灰色大象）
- 名称可能是：`Postgres`、`PostgreSQL`、`Database`

### 3.2 如果**没有**大象图标（说明没有数据库）

**操作步骤：**
1. 在项目页面右上角，点击 **+ New** 按钮
2. 在弹出的菜单中，选择 **Database**
3. 再选择 **Add PostgreSQL**
4. 等待 10-30 秒，Railway 会自动创建数据库
5. 创建完成后，你会看到一个新的大象图标服务

### 3.3 如果**已有**大象图标（说明数据库已存在）

直接进入下一步。

---

## 第四步：配置环境变量

### 4.1 获取数据库连接字符串

1. **点击大象图标**（PostgreSQL 服务）
2. 点击 **Variables** 标签页
3. 在变量列表中找到 **`DATABASE_URL`**
4. 点击这行右边的**复制按钮**（📋 图标）
5. 连接字符串已复制到剪贴板，格式类似：
   ```
   postgresql://postgres:密码@主机.railway.app:5432/railway
   ```

### 4.2 配置 NestJS 服务的环境变量

1. **点击 NestJS 后端服务**（不是数据库）
2. 点击 **Variables** 标签页
3. 你会看到已有的环境变量列表

**检查清单：**

| 变量名 | 是否存在 | 期望的值 |
|---|---|---|
| `PORT` | ✅ 应该已存在 | `$PORT`（保持不变）|
| `DATABASE_URL` | ❓ **最关键** | 刚才复制的 PostgreSQL 连接字符串 |
| `JWT_SECRET` | ❓ 需要添加 | 任意长字符串，如 `plant-story-jwt-2026` |
| `JWT_REFRESH_SECRET` | ❓ 需要添加 | 另一个长字符串，如 `plant-story-refresh-2026` |

### 4.3 添加缺失的环境变量

**如果 `DATABASE_URL` 不存在：**
1. 点击 **+ Add Variable** 或 **New Variable** 按钮
2. **Variable Name** 输入：`DATABASE_URL`
3. **Value** 粘贴刚才复制的数据库连接字符串
4. 点击 **Add** 或 **Save**

**如果 `JWT_SECRET` 不存在：**
1. 点击 **+ Add Variable**
2. **Variable Name** 输入：`JWT_SECRET`
3. **Value** 输入：`plant-story-jwt-secret-change-in-production-2026`
4. 点击 **Add**

**如果 `JWT_REFRESH_SECRET` 不存在：**
1. 点击 **+ Add Variable**
2. **Variable Name** 输入：`JWT_REFRESH_SECRET`
3. **Value** 输入：`plant-story-refresh-secret-change-in-production-2026`
4. 点击 **Add**

---

## 第五步：重新部署

### 5.1 方式A：自动重新部署（推荐）

添加环境变量后，Railway 通常会**自动重新部署**服务。

**确认方式：**
1. 在 NestJS 服务页面，点击 **Deployments** 标签页
2. 看最上面的部署记录
3. 如果状态是 **Building** 或 **Deploying**，说明正在部署
4. 等待状态变为 **Active** 或 **Success**（通常需要 2-5 分钟）

### 5.2 方式B：手动触发部署

如果没有自动部署：
1. 在 **Deployments** 标签页
2. 点击右上角的 **Deploy** 或 **Redeploy** 按钮
3. 确认后，等待部署完成

---

## 第六步：查看部署日志（重要）

部署过程中，你需要确认数据库初始化是否成功：

1. 在 **Deployments** 标签页
2. 点击最新的部署记录（最上面的那条）
3. 在日志中搜索以下关键字：

**成功的标志：**
```
✅ "Prisma schema loaded"
✅ "Your database is now in sync with your schema"
✅ "The database is now in sync"
✅ "Nest application successfully started"
```

**失败的标志：**
```
❌ "Error: P1001: Can't reach database server"
❌ "Environment variable not found: DATABASE_URL"
❌ "Connection refused"
```

如果看到失败标志，说明：
- 环境变量配置有问题
- 或者数据库服务没有启动

---

## 第七步：验证修复

部署成功后，在你的本地电脑终端运行：

```powershell
# 测试注册
$body = @{username='testuser003';password='***'} | ConvertTo-Json
Invoke-RestMethod -Uri 'https://plantstory-production.up.railway.app/api/v1/auth/web/register' -Method Post -ContentType 'application/json' -Body $body
```

**成功响应：**
```json
{
  "user": {
    "id": 1,
    "username": "testuser003",
    "nickname": null,
    "avatarUrl": null
  }
}
```

**如果还是 500 错误：**
- 回到部署日志，查看具体的错误信息
- 截图发给我，我帮你分析

---

## 常见问题

### Q1: 找不到 Variables 标签页

**可能的原因：**
- 你点击的不是服务，而是项目本身
- 界面布局不同（Railway 会更新 UI）

**解决方法：**
- 确保你点击的是**服务卡片**（有域名的那个）
- 在服务详情页，Variables 通常在顶部标签栏或左侧菜单

### Q2: 添加变量后没有 Add 按钮

**可能的原因：**
- Railway UI 已改版，可能需要按 **Enter** 键保存

**解决方法：**
- 输入完变量值后，按键盘 **Enter** 键
- 或者点击空白处，变量会自动保存

### Q3: 部署日志看不懂

**关键信息位置：**
- **Build Logs**: 编译过程，看有没有报错
- **Deploy Logs**: 启动过程，这里会显示 `prisma db push` 的输出
- **Application Logs**: 运行时日志，可以看到 API 请求

**重点关注：**
- 搜索 "error"、"failed"、"prisma"、"database"

### Q4: 数据库连接字符串在哪里

**完整步骤：**
1. 项目页面 → 点击 **Postgres** 服务（大象图标）
2. 点击 **Variables** 标签页
3. 找到 `DATABASE_URL` 这一行
4. 点击右边的复制图标
5. 不要手动修改连接字符串，直接粘贴到 NestJS 服务的变量中

---

## 需要帮助？

如果按照以上步骤操作后仍然有问题，请提供：

1. **项目名称**：resilient-quietude 还是 adequate-fascination？
2. **服务名称**：NestJS 后端服务的名称是什么？
3. **环境变量截图**：NestJS 服务的 Variables 标签页（注意遮挡敏感信息）
4. **部署日志截图**：最新部署的日志，特别是带有 "error" 或 "prisma" 的部分

---

**文档更新时间**：2026-09-04 13:45  
**适用对象**：不熟悉 Railway 控制台的用户  
**前置条件**：已有 Railway 账号和项目
