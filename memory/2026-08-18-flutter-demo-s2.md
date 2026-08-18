# 2026-08-18 — Flutter Web Demo 模式 / 切片 2

## 目标

让 Flutter Web Demo 花园在不依赖 Railway / Nest API 的前提下，形成可操作的本地闭环：添加、删除并在浏览器刷新后保留。

## 完成内容

- 新增 `client/lib/src/features/garden/data/demo_garden_controller.dart`：
  - 内置绿萝、龟背竹、薄荷三条 Demo 初始数据。
  - 新增植物、删除植物状态管理。
  - Web 端将植物数组 JSON 写入 `shared_preferences`（浏览器 localStorage）。
  - 启动 Demo 时恢复本地花园；损坏数据自动回退为初始样例。
  - 非 Web 环境不触碰浏览器存储，避免影响既有 Widget 测试。
- `gardenPlantsProvider` 在 Demo 模式下改为读取 `demoGardenProvider`；真实模式仍调用 Garden API。
- App 的启动页和 AuthenticatedShell 在恢复 Demo 模式时同步恢复本地花园。
- Garden UI 仅在 Demo 模式显示：
  - 顶部“添加植物”按钮。
  - 植物名称（必填）、昵称与摆放位置（可选）的添加表单。
  - 单株植物的删除按钮与二次确认弹窗。
- 下拉刷新在 Demo 模式下会从浏览器 localStorage 恢复花园数据。

## 验证

在 `plant-story/client/` 执行：

- `flutter analyze`：通过，无 issues。
- `flutter test`：16 tests passed。
- `flutter build web --release`：通过。
  - 保留已有 `flutter_secure_storage_web` 的 Wasm dry-run 警告，不影响标准 JS Web release 构建。

## 下一切片

切片 3：Demo 提醒页 Mock 数据、本地完成状态和添加养护提醒；保持完全本地化，随后再实现识别结果进入 Demo 花园。
