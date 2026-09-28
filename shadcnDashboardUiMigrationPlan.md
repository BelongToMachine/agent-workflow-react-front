# Asianode 前端 UI 迁移计划：参考 Shadcn Dashboard

> 创建日期：2026-09-29
>
> 当前前端基线：`asianodeagent-front` / `1d2be8a`
>
> 视觉参考基线：`../shadcndashboard` / `6f99c0b`

## 执行进度

- [ ] 阶段 0：建立视觉基线与页面清单
- [x] 阶段 1：主题 token 与基础组件
- [ ] 阶段 2：应用侧栏与顶部栏
- [ ] 阶段 3：以外观设置和成员设置作为页面样板
- [ ] 阶段 4：聊天主界面与 Artifact
- [ ] 阶段 5：知识库、上传和业务数据页面
- [ ] 阶段 6：认证、异常与收尾页面
- [ ] 阶段 7：清理与最终验收

## 1. 目标与范围

把 Asianode Agent 的视觉语言逐步调整为 Shadcn Dashboard 的后台工作台风格：中性色主题、Geist 字体、紧凑而清晰的控件、内嵌式侧栏、顶部工具栏、统一的卡片/表单/表格层级，同时保留聊天与 Artifact 作为产品主场景。

迁移范围包括全局主题、基础控件、应用布局、聊天、Artifact、知识库、上传、业务表格、成员设置、认证及状态页。每一阶段完成后，现有页面仍应可独立使用，最后再清理旧样式。

本仓库继续作为 React + Vite 前端运行；路由、FastAPI 请求层、HttpOnly Session Cookie、React Query/SWR 状态和 AI SDK 流式消息沿用当前实现。`../shadcndashboard` 是视觉及组件结构参考，其业务示例使用 MSW 假数据，不能接入 Asianode 的业务链路。

## 2. 两个项目的对应关系

| 区域 | Asianode 当前实现 | Shadcn Dashboard 参考 | 迁移方式 |
| --- | --- | --- | --- |
| 主题与字体 | `src/globals.css`、`src/lib/accentColor.ts`、`src/components/themeProvider.tsx` | `../shadcndashboard/src/css/globals.css`、`../shadcndashboard/src/css/styles/style-lyra.css` | 提炼颜色、字体、圆角、阴影和密度规则，保留聊天消息强调色设置。 |
| 基础控件 | `src/components/ui/`，以 Radix 为基础 | `../shadcndashboard/src/components/ui/`，以 Base UI 为基础 | 优先调整现有控件的样式和变体；确有缺口时按现有组件接口补充。 |
| 应用框架 | `src/App.jsx`、`src/components/chat/appSidebar.tsx` | `../shadcndashboard/src/layouts/full/FullLayout.tsx`、`../shadcndashboard/src/layouts/full/vertical/sidebar/Sidebar.tsx`、`../shadcndashboard/src/layouts/full/vertical/header/Header.tsx` | 借鉴侧栏、顶部栏和内容区比例，接入现有路由、权限和聊天历史。 |
| 聊天与 Artifact | `src/components/chat/`、`src/components/ai-elements/`、`src/artifacts/*/client.tsx` | 模板无同等业务页面 | 用新主题重做视觉和容器布局，保留流式与编辑交互。 |
| 管理页面 | `src/components/settings/`、`src/components/upload/`、`src/components/businessTables/` | `../shadcndashboard/src/views/pages/`、`../shadcndashboard/src/components/tables/` | 参考页面标题、卡片、筛选区、表单和表格视觉；继续使用现有数据请求和 AG Grid。 |
| 认证与状态页 | `src/App.jsx`、`src/components/auth/localAccountPages.jsx` | `../shadcndashboard/src/views/auth/` | 借鉴版式，保持 FastAPI 本地账号与当前状态流转。 |

### 已确认的适配点

- 当前前端入口 `src/main.jsx` 只导入 `src/globals.css`；`src/index.css` 属于需要核实引用后再处理的旧样式。模板还有较广的 `../shadcndashboard/src/css/pages/app.css`，应按实际页面提取规则，避免全局选择器影响聊天编辑器和 AG Grid。
- 模板使用 `@base-ui/react`、`react-router`、SWR 和 MSW；当前项目已有 Radix、`react-router-dom`、React Query 与 FastAPI。组件外观可以借鉴，路由及数据层无需跟随模板迁移。
- 当前 `src/App.jsx` 同时承载认证守卫、权限路由、设置页框架和聊天布局。调整应用外壳时要维持这些入口及异常状态。
- 模板的演示导航包含 Blog、Notes、Tickets 等页面。Asianode 导航只展示现有功能，并继续由 FastAPI 返回的权限决定可见入口。
- 模板字体和中文界面要一起检查。正文优先保持可读字号，紧凑字号用于标签和辅助信息；中英文长标题都要处理换行或截断。

## 3. 分阶段实施

### 阶段 0：建立视觉基线与页面清单

**工作**

1. 分别运行两个前端，在桌面宽屏、平板和手机宽度记录浅色/深色界面。
2. 为 Asianode 的路由建立截图清单：聊天 `/` 与 `/chat/:id`、成员 `/settings/members`、知识库 `/settings/knowledge-bases` 与 `/settings/knowledge-bases/files`、上传 `/upload`、业务表格 `/admin/data-tables`、外观 `/settings/appearance`、登录与账户状态页。
3. 标记每页的加载、空数据、错误、无权限、弹窗及移动端状态；记录模板中可借鉴的侧栏、标题、卡片、表单、表格和主题细节。
4. 固定参考仓库 commit；若之后升级模板，先比对视觉规则变化。

**完成标准**：有可核对的页面/状态清单和迁移前截图；所有现有路由都能在清单中找到归属。

### 阶段 1：主题 token 与基础组件

**工作**

1. 在 `src/globals.css` 整理浅色/深色语义变量：背景、文字、边框、卡片、弹层、侧栏、状态色、圆角与阴影；按模板的中性色与 Geist 字体建立目标外观。
2. 保留 `src/lib/accentColor.ts` 的用户偏好，把它映射到聊天强调色；统一外观设置页的预览与实际效果。
3. 逐个调整 `src/components/ui/` 中正在使用的 Button、Input、Select、Dialog、Dropdown、Sidebar、Tooltip、Badge、Skeleton 等控件。优先维持现有 props、焦点与键盘行为。
4. 只为真实页面补充缺少的 Card、Tabs、Breadcrumb、Avatar 等组件；统一加载、禁用、悬停、聚焦和错误状态。
5. 检查 `src/index.css`、`src/App.css` 的实际引用，避免旧变量或全局规则覆盖新主题。

**完成标准**：基础控件在浅色/深色模式下可读、可操作；已有页面虽未逐页改版，也没有大面积样式回退。

### 阶段 2：应用侧栏与顶部栏

**工作**

1. 参考模板的 inset sidebar、边框包裹内容区、顶部工具栏，调整 `src/App.jsx`、`src/components/chat/appSidebar.tsx` 和现有 Sidebar 组件。
2. 导航按 Asianode 功能组织：新建聊天和历史、知识库/上传、业务数据、成员与个人设置。保留当前权限入口控制、聊天历史/删除、用户菜单与移动端抽屉行为。
3. 为管理页建立统一的标题、说明、操作区和内容容器；聊天页单独适配全高滚动和 Artifact 分屏，不套用模板的固定宽度与页脚。
4. 统一当前路由高亮、折叠态、移动端关闭逻辑和顶部栏的主题/账户操作。

**完成标准**：桌面侧栏展开/收起、移动端抽屉、路由高亮和权限入口正常；聊天与管理页都没有双滚动条或内容遮挡。

### 阶段 3：以外观设置和成员设置作为页面样板

**工作**

1. 先改 `src/components/settings/appearanceSettings.tsx`：用新卡片、表单标签、说明文字和预览区验证主题规则。
2. 再改 `src/components/settings/memberPermissions.tsx`：统一列表密度、角色/权限标识、操作菜单、确认弹窗及反馈状态。
3. 把样板中稳定的页面标题、分区、空状态和操作区抽成可复用的页面级组合，而非逐页复制 class。

**完成标准**：两页的加载、空、错误、成功、拒绝访问状态视觉一致；浅色/深色、手机/桌面均通过人工查看；成员权限仍以 FastAPI 结果为准。

### 阶段 4：聊天主界面与 Artifact

**工作**

1. 调整 `src/components/chat/shell.tsx`、`chatHeader.tsx`、`messages.tsx`、`multimodalInput.tsx`、`sidebarHistory.tsx` 的视觉层级、间距、输入区和操作反馈，让聊天与新应用外壳形成同一风格。
2. 对 `src/components/ai-elements/` 的消息、reasoning、tool、Markdown/代码块统一字体、边框、状态色与展开样式；保持流式内容稳定滚动。
3. 调整 `src/components/chat/artifact.tsx` 及文本、代码、图片、表格编辑器的面板、工具栏、版本切换和保存反馈；保持桌面分屏与移动端覆盖模式。
4. 对长消息、代码块、表格、附件、SSE 等待状态和错误提示逐一检查，确保新容器宽度不会影响交互。

**完成标准**：聊天发送/停止/重试、历史切换、SSE 流式渲染、Artifact 打开/编辑/保存/版本切换在新外观下正常；手机屏幕可操作且输入框不被键盘或安全区遮挡。

### 阶段 5：知识库、上传和业务数据页面

**工作**

1. 迁移 `src/components/settings/knowledgeBaseWorkspace.tsx`、`knowledgeBaseManagement.tsx`、`knowledgeBaseGrants.tsx`：统一导航、列表、表单、授权弹窗和状态页。
2. 迁移 `src/components/upload/uploadPage.tsx` 与 `knowledgeFileLibrary.tsx`：统一拖拽区、步骤/进度、解析预览、文件列表和错误反馈。
3. 迁移 `src/components/businessTables/businessDataTablesPage.tsx` 及其 CSS：采用新主题的标题、筛选、工具栏、表格颜色/边框/行高；保留当前 AG Grid 的排序、筛选、列宽与数据行为。
4. 将表格和上传页面的视觉规则反向沉淀到公共组件或 token，减少大段局部样式重复。

**完成标准**：知识库与上传的加载、空、失败、成功和后端拒绝状态清楚；业务表格的密度、横向滚动、键盘操作与移动端行为可用。

### 阶段 6：认证、异常与收尾页面

**工作**

1. 参考模板认证页版式，调整登录、激活、密码修改和账户状态页，统一品牌、表单、错误提示与响应式布局。
2. 统一 403、404、待开通、停用、FastAPI 连接检查等页面的标题、说明和返回操作。
3. 检查中文和英文文案的长度，以及暗色模式下的对比度。

**完成标准**：本地账号登录、退出、激活和密码修改流程保持正常；异常页在没有侧栏的布局下仍与整体产品一致。

### 阶段 7：清理与最终验收

**工作**

1. 清除确认无引用的旧 CSS、重复组件及演示资源；核对 `bun.lock`，只保留实际使用的新增依赖。
2. 如果复制了模板代码或资源，保留其 MIT 版权与许可证文本，并落实模板 README 提到的页脚署名要求；逐项核对第三方字体与图像来源。
3. 逐路由比较迁移前后截图，检查桌面/移动端、浅色/深色、权限差异及长内容。
4. 每个涉及代码的阶段执行 `bun run lint`、`bun run build`；聊天和 API 相关页面连同 FastAPI 手动走通关键业务链路。

**完成标准**：页面清单全部验收；功能链路与现有 API 合同一致；构建与 lint 通过；没有模板演示导航、模拟数据或冗余主题代码混入正式应用。

## 4. 阶段交付顺序

建议每阶段形成独立、可回退的变更：`视觉基线 → token/基础组件 → 应用框架 → 设置样板 → 聊天/Artifact → 知识库/数据页 → 认证/异常页 → 清理验收`。阶段 3 是首个完整页面验收点；其样式规则稳定后再扩展到聊天和复杂表格。

## 5. 关键验收清单

- [ ] 所有现有路由、权限入口和深链接可达。
- [ ] 浅色/深色主题、用户强调色、中文/英文界面一致。
- [ ] 侧栏折叠、历史记录、移动端抽屉和账户菜单正常。
- [ ] 登录、成员权限、知识库、上传、业务表格、聊天及 Artifact 功能正常。
- [ ] 加载、空、错误、无权限和成功反馈有统一样式。
- [ ] 390px 手机宽度无横向溢出；聊天输入与 Artifact 移动端可操作。
- [ ] 键盘焦点、弹窗、Tooltip、表格和聊天滚动行为保持可用。
- [ ] `bun run lint` 与 `bun run build` 通过；许可证与署名已处理。
