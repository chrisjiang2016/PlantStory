# 植の物语 — 客户端 Token 存储策略

> 状态：Sprint F 第 4 切片 Flutter Web Cookie 链路已接入  
> 日期：2026-08-11

## 结论

当前 Flutter 客户端继续使用 `MemoryTokenStore` 保存短生命周期 access token；Web refresh token 通过后端 HttpOnly Cookie 持有，前端 JavaScript 不读取、不存储 refresh token。

原因：

1. `flutter_secure_storage` 在当前 Windows 用户目录路径含空格（`C:\Users\Chris J`）时触发 native-assets hook 路径拆分问题，导致 Flutter 测试链路失败。
2. 直接把 refresh token 写入 Web `localStorage` / `sessionStorage` 风险过高，XSS 后可被脚本读取，不作为生产方案。
3. Sprint F 当前目标是 Auth/Garden/Reminders 主链路联调与自动化测试，不应把原生插件兼容性问题混入同一切片。

## 当前实现

- `TokenStore` 是抽象接口：`read()` / `save()` / `clear()`。
- 默认 provider 使用 `MemoryTokenStore`，只保存 access token。
- Flutter Web 已接入 `/api/v1/auth/web/login`、`/api/v1/auth/web/register`、`/api/v1/auth/web/refresh`、`/api/v1/auth/web/logout`。
- Dio Web adapter 已开启 `withCredentials`，允许浏览器自动携带 HttpOnly refresh cookie。
- 普通业务请求遇到 401 时，会调用 `/auth/web/refresh` 刷新 access token；成功后重试原请求一次，失败则清空内存 access token。
- App 重启或页面刷新后内存 access token 会丢失；后续可通过启动时调用 `/auth/web/refresh` 静默恢复登录态。

## 生产候选方案

### 移动端 / 桌面端

优先使用平台安全存储：

- iOS：Keychain
- Android：EncryptedSharedPreferences / Keystore
- macOS：Keychain
- Windows：Credential Locker

Flutter 层可通过 `flutter_secure_storage` 或等价插件接入，但必须先在无空格路径、CI 和真实设备上完成验证。

### Web

推荐方向：

- access token 短生命周期，仅保存在内存。
- refresh token 优先由后端设置 HttpOnly + Secure + SameSite Cookie。
- 前端不直接读取 refresh token。
- 刷新接口通过 Cookie 自动携带 refresh token，返回新的 access token。

Sprint F 第 3/4 切片已落地后端接口边界与 Flutter Web 客户端接入：

| 接口 | 说明 | refresh token 暴露方式 |
|---|---|---|
| `POST /api/v1/auth/web/register` | Web 注册并登录 | 写入 `ps_refresh_token` HttpOnly Cookie，响应体不返回 refresh token |
| `POST /api/v1/auth/web/login` | Web 登录 | 写入 `ps_refresh_token` HttpOnly Cookie，响应体不返回 refresh token |
| `POST /api/v1/auth/web/refresh` | 从 Cookie 刷新 access token | 从 `ps_refresh_token` Cookie 读取并 rotate，新 Cookie 覆盖旧 Cookie |
| `POST /api/v1/auth/web/logout` | Web 退出登录 | `Max-Age=0` 清除 `ps_refresh_token` Cookie |

当前 Cookie 属性：

- `HttpOnly`
- `Path=/api/v1/auth/web`
- `SameSite=Lax`
- `Max-Age=604800`

上线到 HTTPS 环境时必须补充 `Secure`。本地 HTTP 开发环境暂不启用 `Secure`，否则浏览器不会在 HTTP 下可靠设置 Cookie。

不推荐：

- refresh token 存入 `localStorage`。
- refresh token 存入可被 JS 读取的普通 Cookie。
- 为了“记住登录”而绕过 XSS 风险评估。

## 后续切片

Sprint F 后续应单独做：

1. 在无空格路径/CI 环境验证 `flutter_secure_storage`。
2. App 启动时调用 `/auth/web/refresh` 静默恢复 Web 登录态。
3. 上线 HTTPS 环境后为 refresh cookie 增加 `Secure`，并根据部署域名评估 `SameSite=Strict/Lax/None`。
4. 为 TokenStore 增加平台分发实现。
5. 补端到端浏览器级 Cookie 登录/刷新测试。
