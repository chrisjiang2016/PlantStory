# ============================================
# 植の物语 Frontend Dockerfile
# ============================================
# 多阶段构建：builder（构建 Flutter Web） + nginx（托管静态文件）
# ============================================

# -------------------- Stage 1: Builder --------------------
FROM ghcr.io/cirruslabs/flutter:stable AS builder

WORKDIR /app

# 复制依赖清单
COPY pubspec.* ./

# 安装依赖
RUN flutter pub get

# 复制源代码
COPY . .

# 构建 Flutter Web（生产模式）
RUN flutter build web --release

# -------------------- Stage 2: Nginx --------------------
FROM nginx:1.25-alpine AS production

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 从 builder 复制构建产物
COPY --from=builder /app/build/web /usr/share/nginx/html

# 创建非 root 用户
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001 -G nginx-user && \
    chown -R nginx-user:nginx-user /usr/share/nginx/html && \
    chown -R nginx-user:nginx-user /var/cache/nginx && \
    chown -R nginx-user:nginx-user /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx-user:nginx-user /var/run/nginx.pid

USER nginx-user

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
