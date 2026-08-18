# 2026-08-19 植の物语开发交接记录

## Flutter Web 公网 Demo：切片 4 — 本地植物识别体验

### 已完成

- 新增 `client/lib/src/features/recognition/data/demo_recognition.dart`：提供自包含的龟背竹示例识别结果、置信度、学名和养护说明。
- Demo 模式下，识别页的“从相册选择”和“拍照识别”按钮改为本地示例识别，不请求图片选择器、不上传图片、不依赖 NestJS 或外部 AI API。
- 保留约 550ms 识别等待反馈，增强公开 Demo 的真实体验。
- Demo 识别结果继续复用现有结果卡片和“添加到我的花园”弹窗。
- Demo 模式添加植物时写入 `DemoGardenController`，浏览器刷新后继续保留；真实模式仍调用 `GardenRepository.addPlant` 和正式 Recognition API，不改变真实链路。
- 新增 `client/test/demo_flow_test.dart`，覆盖示例识别数据、识别结果加入 Demo 花园、创建并完成本地提醒三个环节。

### 验证

```text
flutter analyze              ✅ No issues found
flutter test                 ✅ 19 tests passed
flutter build web --release  ✅ Built build/web
```

- Web build 仍有既有 `flutter_secure_storage_web` Wasm dry-run 提示；不影响标准 Web Release 构建。

### 下一步建议

- 切片 5：Demo 体验收口，例如在识别成功后提供“去创建养护提醒”快捷入口，或切换 Vercel 到 Flutter Web Demo。
