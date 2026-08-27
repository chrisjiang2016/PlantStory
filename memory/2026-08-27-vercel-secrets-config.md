# 2026-08-27：Vercel 部署 Secrets 配置完成

**日期：** 2026-08-27 19:29 GMT+8  
**负责人：** Kiro AI Assistant  
**状态：** ✅ 已完成

---

## 一、任务背景

在之前的部署尝试中，GitHub Actions workflow 使用自定义 Vercel CLI 部署流程，但在执行 `vercel link` 步骤时失败，原因是缺少必需的 Vercel 项目配置 secrets：
- `VERCEL_PROJECT_ID`
- `VERCEL_ORG_ID`

虽然 `VERCEL_TOKEN` 已经存在（上周添加），但缺少项目和组织 ID 导致 Vercel CLI 无法正确链接项目。

---

## 二、今天完成的工作

### 1. 获取 Vercel 项目配置信息

通过浏览器访问 Vercel 控制台，从项目设置中获取了必需的配置信息：

```
Project ID: prj_18XnVbbJE4tufu7iYE70LjjzI2hJ
Organization ID: team_3sBxPMPXjcXo9OjDdpoZAQdg
```

### 2. 在 GitHub 添加 Repository Secrets

在 `https://github.com/chrisjiang2016/PlantStory/settings/secrets/actions` 页面依次添加了两个新的 secrets：

1. **VERCEL_PROJECT_ID**
   - 值：`prj_18XnVbbJE4tufu7iYE70LjjzI2hJ`
   - 添加时间：2026-08-27 约 19:20

2. **VERCEL_ORG_ID**
   - 值：`team_3sBxPMPXjcXo9OjDdpoZAQdg`
   - 添加时间：2026-08-27 约 19:25

### 3. 确认现有的 Secrets

确认了 GitHub Repository Secrets 中现在包含所有 Vercel 部署所需的三个关键配置：

- ✅ `VERCEL_TOKEN`（上周已添加）
- ✅ `VERCEL_PROJECT_ID`（今天添加）
- ✅ `VERCEL_ORG_ID`（今天添加）

---

## 三、操作步骤记录

### 步骤 1：添加 VERCEL_PROJECT_ID

1. 打开 GitHub PlantStory 仓库的 Secrets 页面
2. 点击 "New repository secret"
3. Name 字段输入：`VERCEL_PROJECT_ID`
4. Secret 字段输入：`prj_18XnVbbJE4tufu7iYE70LjjzI2hJ`
5. 点击 "Add secret"
6. 成功提示：✅ Repository secret added

### 步骤 2：添加 VERCEL_ORG_ID

1. 在 Secrets 列表页点击 "New repository secret"
2. Name 字段输入：`VERCEL_ORG_ID`
3. Secret 字段输入：`team_3sBxPMPXjcXo9OjDdpoZAQdg`
4. 点击 "Add secret"
5. 成功提示：✅ Repository secret added

### 步骤 3：确认最终状态

访问 Actions secrets 页面，确认三个 secrets 都已正确添加：

```
Repository secrets:
- VERCEL_ORG_ID       (刚刚添加)
- VERCEL_PROJECT_ID   (2 分钟前添加)
- VERCEL_TOKEN        (上周添加)
```

---

## 四、技术说明

### Vercel CLI 部署流程需要的 Secrets

Vercel CLI 在 CI/CD 环境中进行部署时需要以下三个关键配置：

1. **VERCEL_TOKEN**
   - 用途：API 认证令牌，授权 CLI 访问 Vercel 账户
   - 获取方式：Vercel Dashboard → Settings → Tokens

2. **VERCEL_ORG_ID**
   - 用途：标识 Vercel 组织/团队
   - 格式：`team_` 前缀的字符串
   - 获取方式：项目设置或 `.vercel/project.json`

3. **VERCEL_PROJECT_ID**
   - 用途：标识具体的 Vercel 项目
   - 格式：`prj_` 前缀的字符串
   - 获取方式：项目设置或 `.vercel/project.json`

### GitHub Actions Workflow 中的使用

这些 secrets 在 `.github/workflows/*.yml` 中通过 `${{ secrets.SECRET_NAME }}` 语法引用：

```yaml
- name: Deploy to Vercel
  env:
    VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
    VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
    VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
  run: |
    vercel link --yes --token=$VERCEL_TOKEN
    vercel deploy --prod --token=$VERCEL_TOKEN
```

---

## 五、后续验证步骤（待执行）

虽然 secrets 已经配置完成，但还需要以下验证步骤：

1. **触发新的 GitHub Actions 运行**
   - 可以通过推送一个小的提交来触发
   - 或手动触发 workflow（如果配置了 `workflow_dispatch`）

2. **验证 Vercel 部署是否成功**
   - 检查 Actions 运行日志
   - 确认 `vercel link` 步骤不再失败
   - 确认 `vercel deploy` 成功完成

3. **验证生产环境访问**
   - 访问 Vercel 分配的部署 URL
   - 确认 Flutter Web Demo 可以正常加载
   - 测试核心功能（登录、Demo 模式等）

---

## 六、已知问题与注意事项

### 1. Vercel Deployment Protection

根据之前的检查记录，Vercel Production deployment 可能启用了 Deployment Protection，导致部署 URL 跳转到 Vercel 登录页面。

**解决方案：**
- 在 Vercel 控制台关闭 Deployment Protection
- 或配置公开访问规则
- 绑定稳定的自定义域名

### 2. GitHub Actions Workflow 状态

当前项目有两套部署机制：
- Vercel GitHub App（自动部署）
- 自定义 GitHub Actions + Vercel CLI（手动配置）

需要确认：
- 哪一套是主要的部署方式
- 是否需要保留两套
- 如何避免冲突

### 3. Railway 后端状态

Flutter Web Demo 需要连接后端 API，但当前 Railway 后端健康检查返回 404。需要单独解决后端部署问题。

---

## 七、文件变更

本次操作**没有修改任何代码文件**，所有变更都在 GitHub 平台侧：

- 修改内容：GitHub Repository Secrets
- 变更类型：新增配置
- 影响范围：GitHub Actions workflow 的环境变量

---

## 八、总结

✅ **今天完成的核心工作：**
- 成功添加 `VERCEL_PROJECT_ID` 和 `VERCEL_ORG_ID` 到 GitHub Secrets
- GitHub Actions workflow 现在拥有 Vercel 部署所需的全部三个 secrets
- 为下一次 CI/CD 运行扫清了配置障碍

⏳ **待后续验证：**
- 触发新的 workflow 运行
- 验证 Vercel 部署是否成功
- 检查生产环境可访问性

🎯 **对项目的意义：**
- 这是部署链路收口的关键一步
- 解决了之前 CI/CD 失败的根本原因
- 为实现自动化部署奠定了基础

---

**记录结束时间：** 2026-08-27 19:29 GMT+8
