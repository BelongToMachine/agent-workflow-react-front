# 品牌色与扁平化 UI 阶段 A 基线

> 更新日期：2026-09-29
>
> 对应计划：[flatUiBrandMigrationPlan.md](../flatUiBrandMigrationPlan.md)
>
> 结构基线：[uiBaseline.md](uiBaseline.md)

## 阶段 A 结论

阶段 A 的盘点已完成。当前 UI 已有一部分扁平化聊天样式，但主题 token 仍以中性色为主，重点色切换还没有覆盖全站，普通内容卡片和悬浮层的阴影规则也没有完全分开。下一步应先落地主题 token 和重点色映射，再逐页收敛卡片样式。

本阶段只记录基线与合同，没有覆盖工作区已有的聊天、消息和外观设置改动。

## 1. 证据与范围

### 已有视觉证据

- `docs/uiBaseline.md` 已记录迁移前登录页、Shadcn Dashboard 参考页、目标视口和全量路由状态。
- 用户提供的 composer、聊天气泡和 landingpage 截图作为本轮视觉参考：消息卡片低饱和、细边框、无重投影；composer 需要单层边框和横向箭头。
- 参考项目的实际 token 来自 `/Users/mac/Desktop/code/me_issue_tracker/landingpage/apps/web/app/globals.css`：浅色背景为冷灰白，主色为深青绿，辅助色为暖黄；深色模式使用亮青绿和亮暖黄。

本轮没有把浏览器截图二进制写入仓库，避免把临时截图伪装成可复用基线。正式实施时仍按 `docs/uiBaseline.md` 的 `1440 × 900`、`1024 × 768` 和 `390 × 844` 取样。

### 盘点文件范围

| 范围 | 主要文件 | 阶段 B 处理方式 |
| --- | --- | --- |
| 全局主题 | `src/globals.css`、`src/App.css` | 建立品牌和表面语义 token，清理遗留的非主题颜色。 |
| 重点色状态 | `src/lib/accentColor.ts`、`src/App.jsx`、`src/components/settings/appearanceSettings.tsx`、`src/lib/i18n.ts` | 保留现有存储键和值；把 `sage` 视觉改为青绿色，统一预览和文案。 |
| 基础控件 | `src/components/ui/button.tsx`、`input.tsx`、`textarea.tsx`、`inputGroup.tsx`、`select.tsx`、`badge.tsx`、`sidebar.tsx` | 主操作、选中、焦点使用品牌 token；普通表面保持中性。 |
| 聊天 | `src/components/chat/`、`src/components/ai-elements/` | 保留流式与 Artifact 行为，收敛消息、composer、建议入口和工具状态。 |
| 管理与业务页 | `src/components/settings/`、`src/components/upload/`、`src/components/businessTables/`、`src/components/auth/` | 普通卡片无阴影；悬浮菜单、弹窗和抽屉单独保留轻量层次。 |

## 2. 现有重点色合同

### 2.1 必须保持的运行时行为

| 项目 | 当前事实 | 迁移约束 |
| --- | --- | --- |
| 存储键 | `asianode-accent-color` | 不改名、不清空已有值。 |
| 存储值 | `neutral`、`blue`、`sage`、`amber`、`rose` | 五个值全部保留；不要新增第六个值破坏既有切换逻辑。 |
| 应用入口 | `applyAccentColor()` 设置 `document.documentElement.dataset.accentColor` | 继续用 `data-accent-color` 作为 CSS 方案选择器。 |
| 持久化入口 | `storeAccentColor()` 写入 localStorage 后立即应用 | 切换后当前页面立即更新；存储失败时仍应用内存中的视觉偏好。 |
| 首次默认值 | 当前无值时返回 `neutral`，并由 `App.jsx` 的 `AccentColorSync` 在 effect 中应用 | 阶段 B 将无偏好默认改为 `sage`/青绿色；显式保存的 `neutral` 不受影响，并检查首次绘制闪烁。 |

### 2.2 目标方案表

下表是阶段 B 的 token 合同，不是直接复制到组件里的颜色。具体对比度需要在代码落地后使用浏览器和主题矩阵复核。

| 方案值 | 浅色主色 | 深色主色 | 辅助色 | 说明 |
| --- | --- | --- | --- | --- |
| `sage`（界面可显示 Teal） | landingpage 深青绿，约 `hsl(191 92% 26%)` | landingpage 亮青绿，约 `hsl(190 100% 62%)` | 暖黄，约 `hsl(52 85% 90%)` / `hsl(43 100% 61%)` | 默认方案；主强调色和少量品牌提示。 |
| `neutral` | 当前中性主色 | 当前中性主色 | 中性浅表面 | 显式选择后保持灰阶。 |
| `blue` | 当前 `oklch(0.57 0.15 245)` | 同色相的深色可读变体 | 方案内低饱和浅蓝 | 保留当前用户偏好。 |
| `amber` | 当前 `oklch(0.64 0.16 80)` | 对应深色可读变体 | 低饱和暖黄 | 不改变 warning/error 的语义色。 |
| `rose` | 当前 `oklch(0.58 0.15 20)` | 对应深色可读变体 | 低饱和浅玫瑰 | 保留当前用户偏好。 |

### 2.3 语义 token 命名

阶段 B 应在 `src/globals.css` 中把品牌 token 和 Shadcn 的表面/状态 token 分开。建议最少建立以下变量：

| token | 用途 | 应用示例 |
| --- | --- | --- |
| `--brand-primary` | 当前方案的实色主强调 | 主按钮、当前导航、链接、发送箭头 |
| `--brand-primary-foreground` | 主强调上的前景色 | 主按钮文字、实心选中态 |
| `--brand-primary-soft` | 低饱和主色背景 | 用户消息、选中行、轻提示 |
| `--brand-primary-border` | 低强度品牌边框 | composer focus、选中卡片、标签 |
| `--brand-ring` | 键盘焦点 | `focus-visible` 轮廓，不用于 hover 阴影 |
| `--brand-secondary` | 少量暖黄辅助 | 品牌标识、极少量提示徽标或装饰点 |
| `--brand-secondary-foreground` | 暖黄上的文字 | 仅在对比度足够的辅助元素中使用 |
| `--message-accent-background` | 兼容现有聊天图标/等待状态 | 由当前方案映射，不再单独维护一套颜色 |
| `--user-message-background` | 用户消息浅色表面 | 由 `--brand-primary-soft` 或中性方案映射 |

以下 token 继续保持独立，不跟随重点色直接替换：`--success`、`--warning`、`--error`、`--destructive`、图表色以及普通的 `--secondary` / `--accent` 表面色。

## 3. 阴影与焦点盘点

### 3.1 处理分类

| 分类 | 当前位置 | 阶段 B 目标 |
| --- | --- | --- |
| 普通页面/内容卡片 | `src/App.jsx`、`fastapiConnectionTest.tsx`、`settingsPage.tsx`、`ai-elements/codeBlock.tsx`、`ai-elements/tool.tsx` | 默认 `box-shadow: none`，使用背景差和细边框建立层级。 |
| 业务表格内部效果 | `businessDataTablesPage.css` | 保留必要的内描边/表格层次，去掉普通容器的外投影。 |
| 聊天反馈 | `messages.tsx` 的新消息按钮、`suggestedActions.tsx`、`toolbar.tsx` | 常规 hover 不上浮；新消息/工具浮层可使用统一轻量阴影。 |
| 真正悬浮的层 | Dropdown、Select、HoverCard、Popover、Dialog、Sheet、Toast | 保留阴影，但统一 `--shadow-float`、边框和背景不透明度。 |
| 头像和附件关闭按钮 | `sidebarUserNav.tsx`、`previewAttachment.tsx` | 仅保留必要的环形边框或黑色媒体控件，不把阴影规则扩散到卡片。 |
| 动画与装饰 | `src/globals.css` 的 `glow-pulse`、`subtle-lift`、composer shadow token | 普通 hover 不使用；只保留明确的加载/悬浮反馈，且尊重 reduced motion。 |

### 3.2 已发现的问题

1. `src/globals.css` 同时定义 `--shadow-card`、`--shadow-float`、`--shadow-composer`、`--shadow-composer-focus`，但页面也直接使用 `shadow-sm/md/lg/xl/2xl`，阴影强度不一致。
2. `src/components/ui/input.tsx`、`textarea.tsx`、`select.tsx` 和 `inputGroup.tsx` 默认使用 3px focus ring；composer 通过局部 class 清除了其中一部分，容易形成双层轮廓或 hover 黑线。
3. `src/components/chat/messages.tsx` 的新消息按钮和若干弹层使用重阴影/模糊；这些可以保留悬浮层语义，但应统一 token。
4. `src/globals.css` 的 `glow-pulse` 使用固定蓝色 `oklch(0.55 0.12 250)`，不随重点色切换；阶段 B 要么改成 `--brand-ring`，要么移除该装饰效果。
5. `src/globals.css` 仍保留旧 RGB 变量块；需要确认没有引用后再清理，不能直接删除。

## 4. 阶段 B 的直接输入

阶段 A 已形成以下可执行输入：

- 重点色值和存储兼容策略：保留五个值，`sage` 承担青绿色默认方案。
- token 命名和普通表面/悬浮层/状态色的边界。
- 阴影与焦点的逐文件清单，优先处理基础控件和 composer。
- 验收组合：`1440 × 900`、`1024 × 768`、`390 × 844` × 浅/深色 × 中/英文；五个重点色至少各取一个代表页面。

阶段 B 的最小交付顺序是：先改 `accentColor.ts` 和全局 token，再改基础控件焦点状态，最后更新外观设置预览和文案。完成后才能进入聊天与管理页面的逐页扁平化。
