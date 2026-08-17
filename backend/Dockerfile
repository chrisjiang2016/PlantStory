# ============================================
# 植の物语 Backend Dockerfile
# ============================================
# 多阶段构建：builder（构建） + production（运行）
# ============================================

# -------------------- Stage 1: Builder --------------------
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖清单
COPY package*.json ./
COPY prisma ./prisma/

# 安装所有依赖（包括 devDependencies，用于构建）
RUN npm install

# 复制源代码
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# 构建 NestJS 应用
RUN npm run build

# -------------------- Stage 2: Production --------------------
FROM node:20-alpine AS production

WORKDIR /app

# 复制依赖清单
COPY package*.json ./
COPY prisma ./prisma/

# 仅安装生产依赖
RUN npm install --omit=dev

# 生成 Prisma Client（生产环境也需要）
RUN npx prisma generate

# 从 builder 复制构建产物
COPY --from=builder /app/dist ./dist

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# 启动命令（会先运行 Prisma 迁移，再启动服务）
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
