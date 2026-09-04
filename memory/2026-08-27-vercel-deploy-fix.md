# 2026-08-27 Vercel 部署修复记录

## 问题背景

从上一个会话继续，GitHub Actions workflow "Build and Deploy Flutter Web" 连续多次失败，失败步骤为 "Deploy to Vercel"。

## 问题诊断

### 查看 GitHub Actions 历史
- **Run #24** (commit `f41e96f`): 失败于 "Deploy to Vercel" 步骤
- **Run #23**: 同样失败
- 其他多次尝试均失败

### 根本原因分析

通过查看 workflow 配置文件 `.github/workflows/deploy.yml`，发现 Vercel 部署步骤：

```yaml
- name: Deploy to Vercel
  working-directory: client/build/web
  env:
    VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
    VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
    VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
  run: |
    npm install --global vercel@latest
    vercel deploy --prod --token="${VERCEL_TOKEN}" --yes
```

**问题：** Vercel CLI 执行 `vercel deploy` 时，无法识别要部署到哪个项目，因为：
1. 工作目录 `client/build/web` 中没有 `.vercel/project.json` 配置文件
2. 虽然设置了环境变量 `VERCEL_ORG_ID` 和 `VERCEL_PROJECT_ID`，但 Vercel CLI 默认从 `.vercel/project.json` 读取项目信息

## 解决方案

在部署前动态创建 `.vercel/project.json` 文件，包含项目和组织 ID：

```yaml
- name: Deploy to Vercel
  working-directory: client/build/web
  env:
    VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
    VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
    VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
  run: |
    npm install --global vercel@latest
    mkdir -p .vercel
    echo '{"orgId":"'"$VERCEL_ORG_ID"'","projectId":"'"$VERCEL_PROJECT_ID"'"}' > .vercel/project.json
    vercel deploy --prod --token="${VERCEL_TOKEN}" --yes
```

## 执行步骤

1. 修改 `.github/workflows/deploy.yml`
2. 提交并推送：
   ```bash
   git commit -m "fix: create .vercel/project.json before deploying to enable project identification"
   git push origin main
   ```
3. 触发 GitHub Actions Run #25

## 验证状态

- **Commit:** `696a72c`
- **Run #25:** 正在运行中（启动时间：2026-08-27 00:17）
- **预期结果:** 部署成功

## 下一步

- 等待 Run #25 完成
- 确认 Vercel 部署成功
- 测试生产环境 Flutter Web 应用
