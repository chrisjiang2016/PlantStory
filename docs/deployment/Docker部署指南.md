# 植の物语 Docker 部署指南

## 目录
- [本地验证部署](#本地验证部署)
- [云服务器部署](#云服务器部署)
- [环境变量配置](#环境变量配置)
- [常见问题](#常见问题)

---

## 本地验证部署

### 前置要求
- Docker Desktop（Windows/macOS）或 Docker Engine（Linux）
- Docker Compose V2+

### 步骤

#### 1. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，修改以下必填项：
# - POSTGRES_PASSWORD（数据库密码）
# - JWT_SECRET（JWT 密钥）
# - JWT_REFRESH_SECRET（Refresh Token 密钥）
# - BAIDU_API_KEY / BAIDU_SECRET_KEY（百度 AI）
# - PERENUAL_API_KEY（植物数据）
```

生成强密钥（推荐）：
```bash
# Windows PowerShell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))

# Linux/macOS
openssl rand -base64 48
```

#### 2. 启动服务
```bash
# 构建并启动所有服务
docker compose up -d --build

# 查看日志
docker compose logs -f

# 查看服务状态
docker compose ps
```

#### 3. 访问应用
- **前端：** http://localhost
- **后端 API：** http://localhost:3000/api/v1
- **健康检查：** http://localhost:3000/api/v1/health

#### 4. 停止服务
```bash
# 停止服务（保留数据）
docker compose down

# 停止服务并删除数据卷（⚠️ 会清空数据库）
docker compose down -v
```

---

## 云服务器部署

### 推荐配置
- **服务器：** 阿里云/腾讯云轻量应用服务器
- **规格：** 2 核 4 GB 内存 + 40 GB SSD
- **系统：** Ubuntu 22.04 LTS
- **成本：** 约 ¥100/月

### 步骤

#### 1. 安装 Docker
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo apt install docker-compose-plugin -y

# 验证安装
docker --version
docker compose version
```

#### 2. 上传代码
```bash
# 方法 A：使用 Git
git clone <你的仓库地址>
cd plant-story

# 方法 B：使用 scp 上传
# 在本地机器执行：
scp -r plant-story root@<服务器IP>:/root/
```

#### 3. 配置环境变量
```bash
cd plant-story
cp .env.example .env
nano .env  # 或使用 vim 编辑

# 修改以下配置：
# - POSTGRES_PASSWORD：使用强密码
# - JWT_SECRET / JWT_REFRESH_SECRET：生产环境密钥
# - BAIDU_API_KEY / BAIDU_SECRET_KEY
# - PERENUAL_API_KEY
```

#### 4. 启动服务
```bash
# 构建并启动（后台运行）
docker compose up -d --build

# 查看日志（确认启动成功）
docker compose logs -f backend
docker compose logs -f frontend

# 查看服务状态
docker compose ps
```

#### 5. 配置防火墙
```bash
# 开放 80 端口（前端）
sudo ufw allow 80/tcp

# 如果需要 HTTPS（推荐）
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable
```

#### 6. 访问应用
- **HTTP：** http://服务器公网IP
- 建议配置域名 + HTTPS（见下文）

---

## 环境变量配置

### 必填项
| 变量名 | 说明 | 示例 |
|--------|------|------|
| `POSTGRES_PASSWORD` | 数据库密码 | `MyStr0ngP@ssw0rd!` |
| `JWT_SECRET` | JWT 密钥 | 至少 32 位随机字符串 |
| `JWT_REFRESH_SECRET` | Refresh Token 密钥 | 与 JWT_SECRET 不同 |
| `BAIDU_API_KEY` | 百度 AI API Key | 从百度 AI 控制台获取 |
| `BAIDU_SECRET_KEY` | 百度 AI Secret Key | 从百度 AI 控制台获取 |
| `PERENUAL_API_KEY` | Perenual API Key | 从 Perenual 官网获取 |

### 可选项
| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `POSTGRES_PORT` | 5432 | 数据库端口 |
| `BACKEND_PORT` | 3000 | 后端 API 端口 |
| `FRONTEND_PORT` | 80 | 前端端口 |
| `JWT_EXPIRES_IN` | 7d | JWT 过期时间 |
| `JWT_REFRESH_EXPIRES_IN` | 30d | Refresh Token 过期时间 |

---

## 配置域名 + HTTPS（可选但推荐）

### 使用 Nginx + Certbot

#### 1. 安装 Nginx 和 Certbot
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

#### 2. 配置 Nginx 反向代理
```bash
sudo nano /etc/nginx/sites-available/plant-story
```

粘贴以下配置：
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/plant-story /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 3. 申请 SSL 证书
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot 会自动配置 HTTPS 并设置自动续期。

---

## 数据备份与恢复

### 备份数据库
```bash
# 导出数据库
docker compose exec postgres pg_dump -U plant_story_user plant_story > backup.sql

# 或使用 Docker 卷备份
docker run --rm -v plant-story-postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data
```

### 恢复数据库
```bash
# 从 SQL 文件恢复
docker compose exec -T postgres psql -U plant_story_user plant_story < backup.sql

# 从卷备份恢复
docker run --rm -v plant-story-postgres-data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

---

## 常见问题

### 1. 容器启动失败

**查看日志：**
```bash
docker compose logs backend
docker compose logs frontend
docker compose logs postgres
```

**常见原因：**
- 环境变量配置错误（检查 `.env` 文件）
- 端口被占用（修改 `FRONTEND_PORT` 或 `BACKEND_PORT`）
- 数据库连接失败（检查 `DATABASE_URL`）

### 2. 前端无法访问后端 API

**检查：**
- 后端服务是否正常：`docker compose ps`
- 健康检查：`curl http://localhost:3000/api/v1/health`
- Nginx 配置是否正确：查看 `client/nginx.conf`

### 3. 数据库迁移失败

**手动运行迁移：**
```bash
docker compose exec backend npx prisma migrate deploy
```

### 4. 镜像构建慢

**优化：**
- 使用国内 Docker 镜像源
- 使用多阶段构建缓存
- 分层构建（先安装依赖，再复制代码）

### 5. 前端白屏

**检查：**
- 浏览器控制台错误信息
- Flutter Web 是否正确构建：`docker compose exec frontend ls /usr/share/nginx/html`
- Nginx 配置是否正确

---

## 监控与维护

### 查看资源占用
```bash
docker stats
```

### 查看日志
```bash
# 实时日志
docker compose logs -f

# 最近 100 行
docker compose logs --tail=100

# 指定服务
docker compose logs -f backend
```

### 重启服务
```bash
# 重启单个服务
docker compose restart backend

# 重启所有服务
docker compose restart
```

### 更新应用
```bash
# 拉取最新代码
git pull

# 重新构建并重启
docker compose up -d --build

# 运行数据库迁移
docker compose exec backend npx prisma migrate deploy
```

---

## 安全建议

1. **密钥管理**
   - 定期轮换 JWT 密钥（至少每 90 天）
   - 使用密钥管理服务（如阿里云 KMS）
   - 不要将 `.env` 提交到版本库

2. **数据库**
   - 使用强密码（至少 16 位，包含大小写字母、数字、特殊字符）
   - 定期备份数据库
   - 限制数据库访问（不对外暴露 5432 端口）

3. **网络**
   - 使用 HTTPS（Let's Encrypt 免费证书）
   - 配置防火墙，只开放必要端口（80、443）
   - 使用反向代理（Nginx）隐藏后端端口

4. **日志**
   - 配置日志轮转（避免磁盘占满）
   - 定期检查日志中的异常

---

## 技术支持

如果遇到问题，请提供以下信息：
1. 操作系统和 Docker 版本
2. `docker compose ps` 输出
3. 相关服务日志（`docker compose logs <service>`）
4. 环境变量配置（隐藏敏感信息）
