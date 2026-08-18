# 2026-08-18 — Flutter Web Demo 模式 / 切片 1

## 目标

为“接近真实 App 效果、无需后端即可体验”的 Flutter Web Demo 建立最小可用基础；按小切片推进，本切片不改真实 API 和生产认证流程。

## 完成内容

- 新增 `client/lib/src/core/demo/demo_mode_controller.dart`：
  - Demo 模式开关。
  - Web 端使用 `shared_preferences`（浏览器 localStorage）持久化 Demo 标记。
  - 非 Web / widget test 环境跳过偏好插件，保持既有测试确定性。
- 登录页新增“立即体验 Demo”入口和说明文案。
- App 启动和受保护 Shell 支持 Demo 模式直接进入 `/garden`，无需注册或登录。
- `gardenPlantsProvider` 在 Demo 模式返回 3 条本地 Mock 植物：绿萝、龟背竹、薄荷；真实模式仍调用既有 Garden API。
- `pubspec.yaml` / `pubspec.lock` 加入 `shared_preferences`。

## 验证

在 `client/` 下执行：

- `flutter analyze`：通过。
- `flutter test`：16 tests passed。
- `flutter build web --release`：通过。
  - 输出存在 WebAssembly dry-run 警告，来源为现有 `flutter_secure_storage_web` 对 wasm 构建的兼容性；本次为 JS Web release 构建，不阻塞 Demo。
- 本地 `flutter run -d chrome --web-port=5190` 已显示登录页与“立即体验 Demo”入口。

## 未完成 / 下一切片

切片 2：将 Garden 的 Mock 数据从静态常量升级为可通过 Demo UI 添加/删除并写入 localStorage 的状态；不接 Railway 后端。

后续切片：Demo 提醒页 Mock 与完成状态、Demo 识别流程和结果入园、移动端 App Shell 视觉完善、独立 Flutter Web 构建部署。
