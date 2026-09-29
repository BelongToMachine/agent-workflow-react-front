# Asianode Agent 前端 → 移动端 WebView 应用改造计划

> 目标：把现有 React + Vite 前端（
>
> `asianodeagent-front`
>
> ）以
>
> **Capacitor 包壳**
>
>  方式打包成 iOS / Android 原生 App，WebView 直接运行现有代码，业务代码零重写。
> 基准：2026-09，基于当前仓库实际代码核对（见 §2 现状盘点）。



***

## 0. 结论摘要



1. **技术路线**：Capacitor（官方维护的 WebView 容器）。现有 `dist/` 构建产物直接作为 WebView 的 web 资源，原生壳只负责承载和系统能力。

2. **工作量分布**：不是 "重写 App"，而是四件事 ——**网络 / 鉴权打通（最难点）→ 移动端布局适配 → 原生壳配置 → 打包签名分发**。

3. **可行性依据**：现有请求层在生产构建下已强制走 direct 模式（直接请求后端绝对地址），这是本方案能零重写的关键前提（§2.1）。

4. **主要风险**：WebView 跨源 Cookie（SameSite）兼容、Pyodide CDN 加载、上架合规，均有明确兜底方案（§5）。



***

## 1. 待确认项（开工前拍板）



| # | 决策点      | 选项                             | 影响                                              |
| - | -------- | ------------------------------ | ----------------------------------------------- |
| A | 平台范围     | **双端 ✓（已确认）**                | iOS + Android 两个原生工程并行（详见 §7）                    |
| B | 后端手机可达地址 | 已有 HTTPS 域名 / 只有局域网地址 / 尚未部署   | 决定 Phase 2 走 HTTPS+Cookie 正式配置，还是先用 http + 明文调试 |
| C | 发布目标     | TestFlight / 内部分发 APK / 上架应用商店 | 决定签名、隐私政策、合规工作量（Phase 6）                        |

> 当前约定：**双端（iOS + Android）并行开发（已确认）**；后端先用局域网 http 跑通；暂不提交商店。



***

## 2. 现状盘点（已核对代码）



| 关注点   | 现状                                                                                                                                                 | 对 WebView 方案的影响                               |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 请求模式  | `src/lib/backend/mode.ts`：`isFastApiDirectMode = isProduction \|\| ...`，**生产构建强制直连后端**                                                             | 打包后自动走 direct，不依赖 Vite dev proxy ✅            |
| 请求入口  | `src/lib/backend/directClient.ts` `apiFetch/apiUpload`：生产下把 `/api/*` 映射为 `/api/v1/*` 绝对 URL，`credentials: "include"` + `X-CSRF-Token` 头 + 403 自动重试 | 跨源 Cookie 与 CSRF 机制已就位，只需后端放行跨源               |
| 鉴权    | FastAPI HttpOnly Session Cookie + 本地 CSRF token（`src/lib/auth/localSession.ts`）                                                                    | WebView 需能存取跨源 Cookie（Phase 2 关键点）            |
| 流式聊天  | AI SDK `useChat` + fetch 流（SSE）                                                                                                                    | WKWebView / Android WebView 均支持 fetch 流，需真机验证 |
| 文件上传  | XHR + `withCredentials`（`apiUpload`）                                                                                                               | 与 Cookie 跨源同一条链路处理                            |
| 代码执行  | `src/artifacts/code/client.tsx` 用 Pyodide，运行时从 `cdn.jsdelivr.net` 加载                                                                               | WebView 内可运行 ✅；注意 CDN 可达性与首次加载体积              |
| 构建    | `bun run build` → `dist/`                                                                                                                          | Capacitor `webDir` 直接指向 `dist`                |
| 路由    | `BrowserRouter`（无服务端路由）                                                                                                                            | 本地静态壳天然兼容，深链接按需再做                             |
| 移动端基础 | `index.html` 已配 `viewport-fit=cover`、`interactive-widget=resizes-content`；侧边栏 / Artifact 已有响应式实现                                                   | 基础已铺好，Phase 3 只需细化窄屏体验                        |
| 包管理   | bun（`bun.lock`）                                                                                                                                    | Capacitor 命令用 `bunx` 执行即可                     |

### 2.1 为什么能零重写（关键机制）



* `mode.ts` 中 `isFastApiDirectMode = isProduction || ...`：**生产构建永远走 direct**，请求目标 = `VITE_FASTAPI_URL`。

* 因此移动端包不需要任何 "代理层"：打包后的 WebView 直接用绝对 URL 请求后端，与网页版生产环境行为一致。

* 唯一要动的前端：**构建期环境变量**（新建 `.env.production.local`），以及少量可选的原生能力判断。



***

## 3. 前置条件



* **macOS** + **Xcode**（iOS 编译）+ CocoaPods（`pod --version` 确认）

* **Android Studio / Android SDK**（Android 编译，含 JDK 17+）

* 一台真机（模拟器无法完整验证 Cookie、键盘、性能）

* 后端（`asianode-fastapi`）可被手机访问：HTTPS 域名或局域网地址（§1 决策 B）



***

## 4. 分阶段计划

### Phase 1 — 接入 Capacitor，壳先跑起来（0.5–1 天）

目标：真机 / 模拟器能启动 App 并显示到登录页（纯静态资源，暂不调通网络）。



| 步骤  | 操作                                                                                                    | 验证                        |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------- |
| 1.1 | 安装依赖：`bun add @capacitor/core @capacitor/cli`（当前最新稳定版，6.x/7.x 命令一致）                                   | `package.json` 出现依赖       |
| 1.2 | 初始化：`bunx cap init <AppName> <com.yourcompany.asianode>`                                              | 生成 `capacitor.config.ts`  |
| 1.3 | 配置 `capacitor.config.ts`：`webDir: "dist"`；调试期 `server.cleartext: true`；`androidScheme: "https"`（保持默认） | 配置可被 CLI 读取               |
| 1.4 | 添加平台：`bunx cap add ios`、`bunx cap add android`                                                        | 生成 `ios/`、`android/` 原生工程 |
| 1.5 | 首次构建同步：`bun run build && bunx cap sync`                                                               | `dist/` 被拷贝进原生工程          |
| 1.6 | 启动：`bunx cap open ios` / `bunx cap open android`，模拟器运行                                                | 显示 App 名称的 WebView 页面     |

> 原生工程目录（
>
> `ios/`
>
> 、
>
> `android/`
>
> ）建议提交到仓库（签名、权限、图标都要在这里改）；
>
> `dist/`
>
>  仍按现有约定不提交。

### Phase 2 — 网络与鉴权打通（1–3 天，关键路径）

这是全项目最可能踩坑的部分：WebView 的源（`capacitor://localhost` / `https://localhost`）与后端域名不同，属于**跨源请求**。

#### 2.1 后端侧（`asianode-fastapi`，单独仓库）



1. **CORS 放行 WebView 源**（`allow_credentials=True`）：

* iOS：`capacitor://localhost`

* Android（Capacitor 5+ 默认 scheme）：`https://localhost`

* 开发期：`http://localhost:5173`（网页端）、Vite livereload 用的局域网地址

* 显式放行请求头：`X-CSRF-Token`、`Content-Type` 等（或用 `allow_headers=["*"]` 快速验证）

1. **会话 Cookie 跨源可用**：Session Cookie 需为 `SameSite=None; Secure`（跨源 fetch 不会被 Lax 规则带上；`Secure` 要求 HTTPS，所以生产必须上 HTTPS）。

2. 确认 `/api/v1/*` 与 SSE 流在跨源请求下正常（CORS 允许后 fetch 流本身无特殊处理）。

#### 2.2 前端侧（本仓库）

新建 `.env.production.local`（不提交）：



```
VITE_FASTAPI_URL=https://copilot.asianodeatlas.com   # 或局域网 http://192.168.x.x:8000

NEXT_PUBLIC_API_MODE=fastapi-direct

NEXT_PUBLIC_USE_FASTAPI_BACKEND=1

VITE_SINGLE_WORKSPACE_MODE=true

VITE_WORKSPACE_ID=00000000-0000-0000-0000-000000000001
```

然后 `bun run build && bunx cap sync`。

#### 2.3 平台侧



| 平台      | 调试期（http 后端）                                                                                                | 生产（https 后端）   |
| ------- | ----------------------------------------------------------------------------------------------------------- | -------------- |
| iOS     | `Info.plist` 加 ATS 例外：`NSAppTransportSecurity > NSAllowsLocalNetworking = true`（或按域名加 `NSExceptionDomains`） | 不需要额外配置        |
| Android | `AndroidManifest.xml` 的 `<application>` 加 `android:usesCleartextTraffic="true"`                             | 关闭该选项，强制 HTTPS |

#### 2.4 验收（真机）



1. 登录 → 页面跳转成功（Cookie 已写入 WebView 存储）

2. **杀进程重开 → 仍保持登录**（Cookie 持久化）

3. 发送聊天消息 → SSE 流式输出正常

4. 上传文件 → 进度与完成正常

5. 连续操作不出现 CSRF 403

> **兜底方案**
>
> ：若 WKWebView 跨源 Cookie 在特定 iOS 版本不稳定，改用 Capacitor 原生 HTTP 插件（
>
> `CapacitorHttp`
>
> ）发请求 —— 需在
>
> `directClient.ts`
>
>  的
>
> `apiFetch/apiUpload`
>
>  中打一层补丁（约 +1 天工作量），Cookie 由原生层携带，不受 WebView 限制。

### Phase 3 — 移动端 UI 适配（2–4 天）

现有布局已有响应式基础，这一步是**细化窄屏体验**，不是重做：



| 页面 / 组件       | 适配项                                                                                                                       | 涉及文件（现有）                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 侧边栏           | 默认收起为抽屉；iOS 侧滑手势返回；会话列表触控目标 ≥44px                                                                                         | `src/components/chat/appSidebar`、`src/components/ui/sidebar` |
| 聊天页           | 输入框贴安全区（`env(safe-area-inset-bottom)`）；虚拟键盘弹出时输入框不被遮挡（`index.html` 已配 `interactive-widget=resizes-content`，验证即可）；消息列表惯性滚动 | `src/components/chat/chatPage`、`dataStreamProvider`          |
| Artifact 面板   | 窄屏下全屏化；工具栏可换行；表格（AG Grid /react-data-grid）横向滚动；代码编辑器字号与软键盘共存                                                              | `src/components/chat/artifact`、`src/artifacts/*`             |
| 登录 / 设置 / 上传页 | 窄屏布局检查、输入框不被键盘遮挡                                                                                                          | `src/App.jsx` 内各页面组件                                         |
| 全局            | 顶部状态栏区域不被内容侵入（配合 Phase 4 StatusBar 插件）                                                                                    | `src/globals.css`                                            |

**验收**：iPhone SE（最小逻辑宽度）与主流 Android 屏，无溢出、无遮挡、无横向误滚动。

### Phase 4 — 原生体验增强（1–2 天）



| 步骤  | 操作                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | 安装插件：`bun add @capacitor/status-bar @capacitor/splash-screen @capacitor/keyboard @capacitor/haptics @capacitor/app @capacitor/network` |
| 4.2 | `index.html` 补充 meta：`apple-mobile-web-app-capable`、`apple-mobile-web-app-status-bar-style`、`mobile-web-app-capable`                   |
| 4.3 | 状态栏：深色 / 浅色主题联动、沉浸式（`status-bar` 插件）                                                                                                   |
| 4.4 | 键盘：`keyboard` 插件处理 resize 与避让（Android `adjustResize`）                                                                                  |
| 4.5 | 启动图与图标：`bunx @capacitor/assets generate --iconBackgroundColor ... --splashBackgroundColor ...` 从一张源图生成全平台尺寸                            |
| 4.6 | 可选：触感反馈（`haptics`）、App 前后台状态（`app`）、弱网提示（`network`）                                                                                    |
| 4.7 | 可选：深链接 `cap://asianode/chat/<id>` 直达聊天页（`app` 插件 `addListener('appUrlOpen')`）                                                          |

### Phase 5 — 真机调试（1 天）



| 步骤  | 操作                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------ |
| 5.1 | 热更新调试：`bunx cap run ios --livereload --external`（Vite dev server 通过局域网供真机加载，后端经 `VITE_FASTAPI_URL` 指向本机可达地址） |
| 5.2 | iOS 调试：Safari → 开发 → 设备 → Web Inspector（DOM / 网络 / Console）                                                  |
| 5.3 | Android 调试：Chrome `chrome://inspect`（DOM / 网络 / Console）                                                     |
| 5.4 | 网络核对：Charles / Fiddler 抓包确认 Cookie、CORS、CSRF 头正确                                                             |
| 5.5 | 弱网专项：断网重连、SSE 中断恢复、上传失败重试、超时提示                                                                               |

### Phase 6 — 构建、签名与分发（1–2 天）



| 步骤  | 操作                                                                                   |
| --- | ------------------------------------------------------------------------------------ |
| 6.1 | 正式产物：`bun run build && bunx cap sync`（用 `.env.production.local` 的 HTTPS 地址）          |
| 6.2 | iOS 签名：Xcode 工程 → Signing & Capabilities → 选择团队证书 → `Product > Archive` → TestFlight |
| 6.3 | Android 签名：生成 `keystore` → 构建 `aab`（上架 Google Play）或 `apk`（内部分发）                     |
| 6.4 | 版本管理：原生工程版本号与前端构建号同步（`npx cap sync` 每次重新拷贝 web 资源）                                   |
| 6.5 | 上架前材料：隐私政策、账号协议、App 截图、权限说明（若上架，见 §5 风险）                                             |

### Phase 7 — 回归验证清单（上线前过一遍）



* [ ] 登录 / 登出 / 修改密码，杀进程后会话保持

* [ ] 聊天：新建、流式输出、历史、删除、多语言切换

* [ ] Artifact：文本 / 代码（**运行 Python，含 matplotlib 出图**）/ 表格 / 图片，打开、编辑、保存、版本切换

* [ ] 知识库：文件上传、文件列表、权限入口（有权限 / 无权限分别验证）

* [ ] 设置页：外观（主题 / 强调色）、FastAPI 连接测试页

* [ ] 弱网 / 断网 / 后台恢复 / 深链接



***

## 5. 风险与决策点



| 风险                                          | 影响                        | 缓解                                                                     |
| ------------------------------------------- | ------------------------- | ---------------------------------------------------------------------- |
| WebView 跨源 Cookie（SameSite / 第三方 Cookie 限制） | 登录态失效                     | 后端 Cookie 设 `SameSite=None; Secure` + 正确 CORS；兜底 `CapacitorHttp`（§2.4） |
| Pyodide 从 `cdn.jsdelivr.net` 加载             | 首次运行慢；部分地区 CDN 不可达        | 把 Pyodide 静态资源自托管到后端 / CDN，改 `indexURL` 指向（改动极小）                       |
| 后端未上线 HTTPS                                 | Cookie `Secure` 无法启用、上架被拒 | 开发期用 http 明文 + cleartext 配置；**上线前必须 HTTPS**                            |
| 上架合规（隐私、账号、App 权限）                          | 审核不通过                     | 提前准备隐私政策与协议；上架前专门过一遍（§6.5）                                             |
| WKWebView 流式读取行为差异                          | 聊天流偶发缓冲                   | Phase 5 真机专项验证；必要时在 SSE 处理处加 `flush` 兼容                                |
| 首屏加载体积（Pyodide 10MB+、图表库）                   | 启动慢、流量大                   | 保持现有 chunk 拆包；按需评估移动端预加载策略                                             |



***

## 6. 里程碑与工作量



| 里程碑 | 内容                      | 预估（单人） |
| --- | ----------------------- | ------ |
| M1  | 壳跑通 + 网络鉴权打通（Phase 1–2） | 2–4 天  |
| M2  | 移动端可用（Phase 3–4）        | 3–6 天  |
| M3  | 可分发（Phase 5–6 + 回归）     | 2–4 天  |

**总计约 1.5–2.5 周**（不含上架审核排队）。

---

## 7. 双端（iOS + Android）并行开发指南

### 7.1 架构：一套代码，两个原生壳

| 层 | 内容 | 双端关系 |
|----|------|----------|
| 共享 | 全部 React/Vite 业务代码（`src/`、`dist/`）、`capacitor.config.ts`、Capacitor 插件、环境变量 | 只写一份 |
| 独立 | `ios/`（Xcode 工程：签名、`Info.plist`、权限）、`android/`（Gradle 工程：`AndroidManifest.xml`、`build.gradle`、签名） | 各自维护 |
| 平台分支 | 少量 `Capacitor.getPlatform() === "ios" / "android"` 判断（如状态栏样式、深链接协议） | 收敛到独立文件，避免散落 |

**规则**：业务逻辑永远只写一份；平台差异一律收敛到 ① 原生工程配置 ② 集中的平台判断文件。

### 7.2 日常开发循环

| 动作 | 命令 | 说明 |
|------|------|------|
| 纯前端开发 | `bun run dev`（浏览器） | 不碰原生，最快迭代 |
| 跑 iOS 真机/模拟器 | `bunx cap run ios` | 自动 build + sync + 安装 |
| 跑 Android 真机/模拟器 | `bunx cap run android` | 同上 |
| 热更新调试 | `bunx cap run ios --livereload --external` / 同 Android | Vite dev server 走局域网供真机加载 |
| 同步 web 改动进原生 | `bun run build && bunx cap sync` | 把最新 `dist/` 和插件配置同时拷进两个原生工程（**双端一条命令搞定**） |
| 改原生配置 | 直接改 `ios/`、`android/`，然后重新构建该平台 | `cap sync` 不会覆盖原生工程手工改动 |

### 7.3 推荐的并行节奏

1. **先在 iOS 上打通关键链路**（Phase 2 的网络/鉴权/SSE）：WKWebView 是 WebView 兼容性里最严格的标准（第三方 Cookie、流式读取），在 iOS 上跑通后，Android 通常直接通过；
2. 再跑 **Android 专项**：键盘避让（`adjustResize`）、全面屏安全区、低端机性能（Pyodide/大表格）；
3. 每个功能验收坚持 **iPhone + Android 双机** 过一遍 Phase 7 回归清单——两端的 WebView 渲染差异只有真机才暴露得出来。

### 7.4 平台差异对照（双端都要处理，别只做一边）

| 差异点 | iOS | Android | 处理位置 |
|--------|-----|---------|----------|
| WebView 源 | `capacitor://localhost` | `https://localhost`（Capacitor 5+ 默认） | 后端 CORS **两端都要放行** |
| 跨源 Cookie | WKWebView 第三方 Cookie 限制严格 | 相对宽松 | 后端 `SameSite=None; Secure`，**以 iOS 为准验证** |
| http 明文（仅调试期） | ATS 例外（`Info.plist`） | `android:usesCleartextTraffic="true"`（Manifest） | 原生工程各配各的 |
| 虚拟键盘 | 系统自动避让 + `keyboard` 插件 | 需 `adjustResize` + `keyboard` 插件 | 原生工程 + 插件 |
| 安全区 | 刘海 + 底部 Home 条（`env(safe-area-inset-*)`） | 全面屏手势区 | CSS |
| 状态栏 | `@capacitor/status-bar`，样式按平台设 | 同左 | 代码（集中判断） |
| 字体/渲染 | `-apple-system`/SF 字体 | Roboto，注意 `text-size-adjust` | CSS |
| 深链接 | Xcode 配 URL scheme / Universal Links | `intent-filter` | 原生工程 |
| 版本号 | Xcode 工程 `CFBundleShortVersionString` / `CFBundleVersion` | `build.gradle` `versionName` / `versionCode`（整数，只增不减） | 原生工程 |
| 性能关注点 | 整体较稳 | 低端机 WebView 卡顿、Pyodide 内存占用 | Phase 5/7 回归 |

### 7.5 构建、签名与分发

| 平台 | 打包 | 签名 | 产物 |
|------|------|------|------|
| iOS | Xcode `Product > Archive` | Apple Developer 账号 + 证书/描述文件（Xcode 自动管理） | TestFlight / App Store |
| Android | `cd android && ./gradlew bundleRelease`（Play）或 `assembleRelease`（内部分发） | `keytool` 生成 keystore，配到 `android/app/build.gradle` | `aab` / `apk` |

- **keystore 生成**（一次性，妥善保管）：`keytool -genkey -v -keystore release.keystore -alias asianode -keyalg RSA -keysize 2048 -validity 10000`
- **版本号同步**：建议加一个脚本同时递增 iOS 版本与 Android `versionCode/versionName`，避免两边版本对不上。

### 7.6 CI 双端流水线（可选，强烈建议）

- 两个并行 job，一个 web 构建共享：
  - **ios**：macOS runner → `xcodebuild archive` → fastlane 传 TestFlight
  - **android**：ubuntu/macOS runner → `gradlew bundleRelease` → 产出 `aab`/`apk` 到 artifact
- 敏感信息全走 CI secrets：iOS 证书/描述文件、keystore 与密码、Apple/Google 账号。
- 触发：打 tag 或手动触发，保证双端产物来自同一次 `dist/` 构建。
