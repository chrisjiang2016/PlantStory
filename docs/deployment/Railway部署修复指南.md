# Railway 部署修复指南

> 目标：修复 Railway 后端的数据库配置，解决注册接口 500 错误
> 
> Railway 部署地址：https://plantstory-production.up.railway.app/

---

## 问题现状

### ✅ 正常的部分
- Railway 服务运行正常
- `/api/v1/health` 端点返回 200 OK

### ❌ 存在的问题
- 注册接口返回 500 错误：`{"statusCode": 500, "message": "Internal server error"}`
- 原因：PostgreSQL 数据库未配置或表结构未初始化

---

## 修复步骤

### 步骤 1：登录 Railway 控制台

1. 访问：https://railway.app/
2. 登录你的账号
3. 找到项目：`plantstory-production`

---

### 步骤 2：添加 PostgreSQL 数据库（如果还没有）

#### 2.1 检查是否已有数据库

在项目页面查看是否有 PostgreSQL 插件：
- 如果有 PostgreSQL 图标，说明已添加，跳到步骤 3
- 如果没有，继续下面的操作

#### 2.2 添加 PostgreSQL

1. 点击项目右上角的 **New** 按钮
2. 选择 **Database**
3. 选择 **Add PostgreSQL**
4. Railway 会自动创建数据库并生成连接字符串

---

### 步骤 3：配置环境变量

在你的 NestJS 服务中，点击 **Variables** 标签页，添加以下环境变量：

#### 3.1 必需的环境变量

| 变量名 | 值 | 说明 |
|---|---|---|
| `DATABASE_URL` | `postgresql://用户名:密码@主机:端口/数据库名?schema=public` | PostgreSQL 连接字符串 |
| `JWT_SECRET` | `your-jwt-secret-key-change-in-production` | JWT 签名密钥，建议用随机字符串 |
| `JWT_REFRESH_SECRET` | `your-refresh-secret-key-change-in-production` | Refresh Token 密钥 |
| `PORT` | `$PORT` | Railway 自动注入的端口变量（保持不变） |

#### 3.2 获取 DATABASE_URL

如果你刚才添加了 PostgreSQL：
1. 点击 PostgreSQL 服务
2. 点击 **Variables** 标签页
3. 找到 `DATABASE_URL` 变量
4. 点击右侧的 **Copy** 按钮
5. 回到 NestJS 服务的 Variables 页面
6. 粘贴到 `DATABASE_URL` 变量中

#### 3.3 生成安全的密钥

你可以使用以下命令生成随机密钥（在本地终端运行）：

**PowerShell:**
```powershell
# 生成 JWT_SECRET
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# 生成 JWT_REFRESH_SECRET（再运行一次，使用不同的值）
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

**或使用 Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### 3.4 可选的环境变量

如果你的应用需要植物识别功能，还需要：

| 变量名 | 说明 |
|---|---|
| `BAIDU_AI_API_KEY` | 百度 AI 开放平台 API Key |
| `BAIDU_AI_SECRET_KEY` | 百度 AI 开放平台 Secret Key |
| `PERENUAL_API_KEY` | Perenual 植物数据 API Key |

**注意**：如果不配置这些变量，识别功能会失败，但不影响注册、登录、花园等基础功能。

---

### 步骤 4：初始化数据库表结构

#### 4.1 修改 package.json

为了让 Railway 在每次部署时自动初始化数据库，需要修改启动脚本。

在本地执行以下操作：

```powershell
cd plant-story/backend
```

打开 `package.json`，找到 `scripts` 部分，修改 `start:prod`：

**修改前：**
```json
"start:prod": "node dist/src/main.js"
```

**修改后：**
```json
"start:prod": "npx prisma db push --accept-data-loss && node dist/src/main.js"
```

**说明：**
- `prisma db push`：将 Prisma Schema 同步到数据库（创建表结构）
- `--accept-data-loss`：如果表结构已存在但有差异，强制更新（开发阶段可用）
- `&&`：前一个命令成功后才执行后面的命令

#### 4.2 提交并推送

```bash
cd plant-story
git add backend/package.json
git commit -m "fix: add database migration to Railway start script"
git push origin main
```

#### 4.3 等待 Railway 重新部署

- Railway 检测到 Git 推送后会自动重新部署
- 在 Railway 控制台的 **Deployments** 标签页可以查看部署日志
- 部署过程中会自动运行 `prisma db push` 初始化数据库

---

### 步骤 5：手动初始化数据库（可选）

如果不想修改 `package.json`，也可以在 Railway 控制台手动运行命令：

1. 在 Railway 项目中点击 NestJS 服务
2. 找到右上角的 **...** 菜单
3. 选择 **Run a Command**（或类似的选项，具体名称可能不同）
4. 输入命令：
   ```bash
   npx prisma db push
   ```
5. 执行完成后，重启服务

**注意**：这种方式只是临时解决，每次重新部署后需要重新执行。建议使用步骤 4 的方式。

---

### 步骤 6：验证修复

#### 6.1 检查数据库表

如果 Railway 提供了数据库管理界面（如 Adminer 或 pgAdmin），可以检查是否已创建以下表：

- `User`
- `PlantSpecies`
- `MyPlant`
- `Recognition`
- `Favorite`
- `CareLog`
- `Diary`
- `Reminder`
- `Diagnosis`
- `Disease`
- `Achievement`
- `UserAchievement`

#### 6.2 测试注册接口

在本地终端执行：

```powershell
$body = @{username='testuser001';password='Test123456'} | ConvertTo-Json
Invoke-RestMethod -Uri 'https://plantstory-production.up.railway.app/api/v1/auth/web/register' -Method Post -ContentType 'application/json' -Body $body
```

**期望结果：**
```json
{
  "user": {
    "id": 1,
    "username": "testuser001",
    "nickname": null,
    "avatarUrl": null
  }
}
```

如果返回 500 错误，查看 Railway 部署日志中的错误信息。

#### 6.3 测试登录接口

```powershell
$body = @{username='testuser001';password='Test123456'} | ConvertTo-Json
Invoke-RestMethod -Uri 'https://plantstory-production.up.railway.app/api/v1/auth/web/login' -Method Post -ContentType 'application/json' -Body $body
```

**期望结果：**
```json
{
  "user": {
    "id": 1,
    "username": "testuser001",
    ...
  }
}
```

**注意**：Web Cookie 会通过 `Set-Cookie` 响应头返回，在浏览器中可以看到。

---

### 步骤 7：在 Vercel Demo 中验证

1. 访问：https://plant-story.vercel.app
2. 点击"注册"标签页
3. 输入用户名和密码（密码只能包含英文和数字，6-32位）
4. 点击"注册并登录"
5. 如果成功，应该会跳转到花园页面

---

## 常见问题排查

### Q1: 注册还是返回 500 错误

**检查项：**
1. Railway 的 `DATABASE_URL` 是否正确配置
2. PostgreSQL 服务是否正常运行
3. 查看 Railway 部署日志中的具体错误信息
4. 确认 `prisma db push` 是否执行成功

**解决方法：**
- 在 Railway 日志中搜索 "Prisma" 或 "database" 关键词
- 如果看到连接错误，检查 `DATABASE_URL` 格式
- 如果看到表不存在错误，手动运行 `npx prisma db push`

### Q2: 密码验证失败

**错误信息：**
```json
{
  "message": ["密码只允许英文和数字"],
  "error": "Bad Request",
  "statusCode": 400
}
```

**原因：**
- 密码包含特殊字符
- 系统要求：6-32位，仅英文字母和数字

**解决方法：**
- 使用符合规则的密码，例如：`Test123456`

### Q3: 用户名已存在

**错误信息：**
```json
{
  "statusCode": 409,
  "message": "用户名已存在"
}
```

**原因：**
- 该用户名已被注册

**解决方法：**
- 换一个不同的用户名

### Q4: CORS 错误

**错误信息（在浏览器控制台）：**
```
Access to fetch at 'https://plantstory-production.up.railway.app/...' from origin 'https://plant-story.vercel.app' has been blocked by CORS policy
```

**原因：**
- 后端 CORS 配置未包含 Vercel 域名

**解决方法：**
- 检查 `backend/src/main.ts` 中的 CORS 配置
- 确认包含：`/^https:\/\/plant-story[a-z0-9-]*\.vercel\.app$/`

---

## Railway 环境变量检查清单

在 Railway 控制台 Variables 标签页，确认以下变量已配置：

- [ ] `DATABASE_URL` — PostgreSQL 连接字符串
- [ ] `JWT_SECRET` — JWT 签名密钥（不要使用默认值）
- [ ] `JWT_REFRESH_SECRET` — Refresh Token 密钥（不要使用默认值）
- [ ] `PORT` — `$PORT`（Railway 自动注入，保持默认）
- [ ] `BAIDU_AI_API_KEY`（可选，识别功能需要）
- [ ] `BAIDU_AI_SECRET_KEY`（可选，识别功能需要）
- [ ] `PERENUAL_API_KEY`（可选，植物百科需要）

---

## 后续优化建议

### 1. 使用 Prisma Migrate 代替 db push

**当前方式（db push）：**
- 优点：简单快速，适合快速迭代
- 缺点：不记录迁移历史，不适合生产环境

**推荐方式（migrate）：**
- 在本地生成迁移文件：
  ```bash
  npx prisma migrate dev --name init
  ```
- 提交迁移文件到 Git
- Railway 启动脚本改为：
  ```json
  "start:prod": "npx prisma migrate deploy && node dist/src/main.js"
  ```

### 2. 添加健康检查端点

在 Railway 中配置 Health Check：
- Path: `/api/v1/health`
- Interval: 60 seconds

### 3. 配置环境变量分组

将开发、生产环境的配置分开管理：
- 使用 Railway 的 Environment 功能
- 或使用 `.env.production` 文件

### 4. 监控和日志

- 在 Railway 中查看实时日志
- 配置告警（部署失败、服务宕机等）
- 考虑接入第三方监控服务

---

## 相关文档

- [Railway 官方文档](https://docs.railway.app/)
- [Prisma 部署指南](https://www.prisma.io/docs/guides/deployment)
- [NestJS 生产部署最佳实践](https://docs.nestjs.com/techniques/performance)

---

**文档更新时间：** 2026-09-04  
**适用版本：** 植の物语 V1.0  
**部署平台：** Railway
