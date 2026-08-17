# 植の物语 Plant Story

植の物语是一款面向植物新手和日常养护用户的智能养花助手，目标覆盖识花、植物管理、养护提醒、日记、病虫害诊断、植物百科、收藏与成就体系。

当前仓库包含三部分：

- **NestJS 后端**：正式服务端主线，已完成 V1 核心模块第一轮实现与自动化测试。
- **Flutter 客户端**：正式客户端主线，已完成 Flutter Web 的 Auth / Garden / Reminders 真实 API 联调。
- **H5 MVP 原型**：用于产品视觉、交互和演示验证的 Express + 静态页面原型。

> 当前状态：开发中，尚未达到生产发布状态。

---

## 当前进度

截至 `2026-08-12`：

- 后端已完成 10 个业务模块第一轮实现：
  - Auth
  - Garden
  - Recognition
  - Reminders
  - CareLogs
  - Diaries
  - Favorites
  - Achievements
  - Diagnosis
  - Encyclopedia
- 后端自动化测试：`7 suites / 88 tests` 通过。
- Flutter Web 已完成：
  - 登录 / 注册
  - Web refresh-token HttpOnly Cookie 接入
  - 业务请求 401 自动刷新
  - App 启动静默恢复登录态
  - 花园列表
  - 提醒列表
  - 完成提醒
- Flutter 客户端测试：`14 tests` 通过。
- H5 MVP 可本地预览，用于原型和视觉调整。

详细进度见：

```text
docs/progress/植の物语-任务进度.md
```

---

## 技术栈

### 后端

- NestJS 11
- TypeScript
- Prisma 7.8
- SQLite（本地开发）
- PostgreSQL（目标生产环境）
- JWT Auth
- Swagger / OpenAPI
- Jest + Supertest

### 客户端

- Flutter 3.44+
- Dart 3.12+
- Riverpod
- go_router
- Dio
- Flutter Web

### H5 MVP

- Express
- Static HTML / CSS / JavaScript
- localStorage 原型状态

---

## 目录结构

```text
plant-story/
├── backend/                  # NestJS 后端
│   ├── src/                  # 后端业务模块
│   ├── prisma/               # Prisma schema 与 seed
│   ├── test/                 # Jest / E2E / 单元测试
│   └── package.json
├── client/                   # Flutter 客户端
│   ├── lib/                  # Flutter 应用源码
│   ├── test/                 # Flutter widget / network tests
│   └── pubspec.yaml
├── prototype/
│   └── h5-app/               # H5 MVP 原型
├── design/                   # 高保真设计稿
├── docs/                     # 产品、技术、进度和设计规范文档
└── README.md
```

---

## 本地启动

### 1. 后端服务

```powershell
cd backend
npm install
npm run prisma:push
npm run start:dev
```

后端默认地址：

```text
http://localhost:3000/api/v1
```

Swagger：

```text
http://localhost:3000/api/docs
```

### 2. Flutter Web 客户端

另开一个终端：

```powershell
cd client
flutter pub get
flutter run -d chrome --web-port 5173 --dart-define=API_BASE_URL=http://localhost:3000/api/v1
```

访问：

```text
http://localhost:5173
```

### 3. H5 MVP 原型

如果 3000 端口已经被后端占用，建议将 `prototype/h5-app/.env` 中的 `PORT` 改为 `3001`。

```powershell
cd prototype/h5-app
npm install
npm run dev
```

访问：

```text
http://localhost:3001
```

---

## 环境变量

后端环境变量示例见：

```text
backend/.env.example
```

常用变量：

```env
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zhinawuyu?schema=public"
JWT_SECRET="change-me"
JWT_REFRESH_SECRET="change-me"
BAIDU_AI_API_KEY=
BAIDU_AI_SECRET_KEY=
PERENUAL_API_KEY=
```

H5 MVP 也支持 `.env`：

```env
PORT=3001
BAIDU_AI_API_KEY=
BAIDU_AI_SECRET_KEY=
PERENUAL_API_KEY=
```

---

## 测试与验证

### 后端

```powershell
cd backend
npm run build
npm test
```

专项测试：

```powershell
npm run test:sprint-a
npm run test:sprint-b
npm run test:sprint-c
npm run test:sprint-d
npm run test:sprint-e
npm run test:sprint-f
```

### Flutter 客户端

```powershell
cd client
flutter analyze
flutter test
flutter build web --dart-define=API_BASE_URL=http://localhost:3000/api/v1
```

---

## 已实现功能概览

### 后端 API

- 用户注册、登录、Profile、修改资料、修改密码
- Web Cookie Auth：register / login / refresh / logout
- 我的植物 CRUD
- 识花识别、识别历史、植物百科搜索和详情
- 养护提醒、提醒完成、已完成提醒查询
- 养护记录
- 日记
- 收藏
- 成就
- 病虫害知识库和诊断记录
- 植物百科搜索、筛选、分页和详情

### Flutter Web

- 登录 / 注册
- access token 内存保存
- refresh token HttpOnly Cookie 方案
- 401 自动 refresh 并重试业务请求
- App 启动静默恢复登录态
- 花园列表
- 提醒列表和完成提醒
- 登出清理会话

### H5 MVP

- 首页
- 拍照识别
- 植物详情
- 养护提醒
- 病虫害诊断
- 植物百科
- 个人中心
- 我的收藏

---

## 当前限制

- 生产部署尚未完成。
- Docker / Compose / CI 尚未正式落地。
- PostgreSQL 生产环境迁移尚未完成。
- 图片上传、对象存储和生产级图片处理尚未完成。
- 自动病虫害 AI 诊断尚未完成；当前 Diagnosis 主要覆盖人工/用户确认诊断记录和病虫害知识库。
- Flutter 原生端真实设备联调尚未完成。
- 原生端安全存储方案仍需在无空格路径、CI 和真实设备上验证。
- H5 MVP 是原型演示，不代表正式数据链路。

---

## GitHub 发布前安全检查

发布到公开 GitHub 前，必须确认以下文件没有被提交：

```text
.env
.env.*
credentials.json
perenual key.txt
*.db
*.db-*
*.sqlite
node_modules/
build/
dist/
.dart_tool/
prototype/h5-app/uploads/
```

建议补充根目录 `.gitignore`，并只提交 `.env.example`，不要提交真实 API Key、JWT Secret、数据库文件或本地上传资源。

---

## 设计规范

H5 MVP 视觉规范见：

```text
docs/design/植の物语-H5-MVP-设计规范.md
```

后续 Flutter UI 还原应优先遵循该文档中的颜色、字号、间距、圆角、阴影、组件和交互状态规范。

---

## License

当前后端 `package.json` 标注为 MIT。正式公开发布前，请根据你的发布策略确认是否保留 MIT License，或改为私有仓库 / 暂不附加开源 License。
