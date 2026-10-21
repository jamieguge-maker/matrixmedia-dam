# 二改版改动登记（DAM 薄壳）

基线：官方 `hanliang97/MatrixMedia` tag `v0.12.9`。
本文件登记所有对**上游文件**的改动。每次同步官方新 tag 时，先对照这里检查冲突。
`src/dam/**` 为新增目录，不在此表逐文件登记。

---

## 1. 锚点（仅 3 个文件、10 行以内）

| 编号 | 文件                          | 位置                                  | 内容                     |
| ---- | ----------------------------- | ------------------------------------- | ------------------------ |
| A1   | `src/main/index.js`           | 其它 import 之后、`cliMode` 判断之前   | `import "./dam";`        |
| A2   | `src/renderer/main.js`        | `import "windi.css";` 之后             | `import "./dam";`        |
| A3   | `src/renderer/layout/index.vue` | 内容区 `<sidebar>` 之前               | `<dam-rail />`           |

> 顶部导航（`Navbar.vue`）**不再改动**：左侧主导航接管菜单后，由 `DamRail.vue`
> 里的全局样式把 `.navbar-header-fixed` 隐藏。
> 上游 Sidebar 保留，仅用于「账号数据 / 媒体平台管理」这类需要分组二级导航的页面；
> DAM 页面通过 `meta.noSlide` 关闭它，避免与左侧主导航重复。

校验：

```bash
node scripts/dam-anchors.mjs --check
node scripts/dam-anchors.mjs --report
```

---

## 2. 身份与打包参数（`package.json`）

| 字段                   | 值                                   | 原因                                  |
| ---------------------- | ------------------------------------ | ------------------------------------- |
| `name`                 | `matrixmedia-dam`                    | 与官方 `matrix-video` 区分             |
| `version`              | `<上游版本>-dam.<N>`                 | 二改版版本序列                         |
| `build.appId`          | `com.guocio.matrix.dam`              | 避免覆盖官方安装                       |
| `build.executableName` | `matrixmedia-dam`                    | 避免与官方 CLI 命令 `matrixmedia` 冲突 |
| `build.productName`    | `矩媒（DAM 版）`                     | 用户可区分两个版本                     |
| `build.artifactName`   | `MatrixMedia-DAM-${version}-...`     | 安装包命名可区分                       |

---

## 3. 运行时行为（不改上游文件）

| 能力           | 实现位置                  | 说明                                                                 |
| -------------- | ------------------------- | -------------------------------------------------------------------- |
| 应用身份隔离   | `src/main/dam/index.js`   | `app.setPath("userData", %APPDATA%/matrixmedia-dam)`                 |
| 更新检查接管   | `src/main/dam/ipc.js`     | `removeHandler` + 重新注册 `check-for-updates` / `start-update-download` |
| DAM 登录态     | `src/main/dam/session.js` | `safeStorage` 加密保存 JWT；不保存密码                                |
| 壳内配置       | `src/main/dam/config.js`  | `userData/dam-config.json`（API 地址、同步间隔）                      |
| 壳内 IPC       | `src/main/dam/ipc.js`     | 统一 `dam:*` 前缀                                                     |
| 壳内路由与页面 | `src/renderer/dam/**`     | `constantRouterMap.push` 注册 `/dam`                                  |
| 左侧主导航     | `src/renderer/dam/components/DamRail.vue` | 工作区 + 系统设置两组；隐藏上游顶部菜单；矩媒页面归到系统设置 |
| 添加媒体账号   | `src/renderer/dam/components/AddAccountDialog.vue` | 复刻 Navbar 的新增账号流程，避免隐藏顶栏后功能缺失 |
| DAM API 客户端 | `src/renderer/dam/api/client.js` | 统一超时 / 重试 / 401；登录接口的 401 不当作会话过期 |
| 登录态         | `src/renderer/dam/store/session.js` | 内存状态 + 主进程令牌；启动时用 `/auth/profile` 校验 |
| 路由守卫       | `src/renderer/dam/index.js` | `/dam/**` 未登录跳 `/dam/login`，并记住 redirect |
| 素材检索       | `src/renderer/dam/views/assets/index.vue` | 关键词 / 板块 / 系列 / 品类 / 类型 / 语言 / 尺寸 + 快捷筛选 |
| 缩略图         | `src/renderer/dam/api/assets.js` | 批量 `POST /assets/thumb-urls`，整页一次签发 |
| 素材详情       | `src/renderer/dam/components/AssetDetailDialog.vue` | 预览主文件/封面 + 元数据 + 发布记录 |

### 身份隔离的两个坑（已处理）

1. **只改 `app.name` 不够**：Electron 在 JS 执行前就按 package.json 算好了 userData，
   必须显式 `app.setPath("userData", ...)`。
2. **上游会覆盖 `app.name`**：`src/main/index.js` 在 import 之后强制
   `app.name = "matrix-video"`（为了让 dev/cli/打包路径一致）。
   因此我们在 `setImmediate` 里再设置一次，userData 已由 setPath 固定，不受影响。

---

## 4. 配置项

| 配置             | 说明                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------- |
| `DAM_UPDATE_URL` | 公司更新清单地址（https），格式兼容 GitHub Release latest；未设置时不检查更新           |
| `dam-config.json`| `apiBase`（默认 `https://dam.guocio.cn/api`）、`syncIntervalMin`                        |

---

## 5. 已知限制

- 二改版不接收官方安装包的升级（appId 不同，会被当成另一款软件）。
- 上游若重命名更新 IPC 通道，接管会静默失效，需要更新 `src/main/dam/ipc.js`。
- 构建环境要求 Node 20.x；本次用 Node 24 验证可编译，正式出包前应在 Node 20 复核。
- `build:dir` 只编译，安装包需额外执行 `electron-builder --win --x64`。
- **Windows 打包报 `Cannot create symbolic link ... darwin\...\libcrypto.dylib`**：
  `winCodeSign-2.6.0.7z` 里含 macOS 符号链接，普通用户没有创建符号链接的特权。
  已内置 `scripts/fix-wincodesign-cache.mjs`：解压时排除 `darwin/`，并通过 `prebuild`
  钩子在 `yarn build` 前自动执行；也可手工运行 `yarn fix:wincodesign`。
- 当前页面进度：M0 / M0.1 / M1 已完成，素材检索详情按 M2 继续。

---

## 6. 同步记录

### 2026-10-20 · 建立基线 v0.12.9

- 上游变更：无（基线）
- 锚点：全部新插入
- 验证：锚点 check ✅ / `yarn build:dir` ✅ / CLI `accounts` ✅ / 官方四页 ✅ / 壳内六页 ✅ / 更新接管 ✅
- 版本：`0.12.9-dam.1`

### 2026-10-20 · 左侧主导航（v0.12.9-dam.2）

- 导航改版：顶部菜单隐藏，新增 `DamRail` 左侧主导航（工作区 + 系统设置）
- 矩媒原生页面（账号数据 / 视频管理 / 媒体平台管理 / 项目详情）归入「系统设置」分组
- DAM 页面加 `meta.noSlide`，避免左侧主导航与上游 Sidebar 重复
- 新增「添加媒体账号」弹窗，补上隐藏顶栏后缺失的入口
- 锚点调整：移除 Navbar 的 3 处改动，改为 `layout/index.vue` 的 `<dam-rail />`（A3）
- 验证：9 条路由均正常、高亮正确、无控制台错误；新增账号弹窗可开可关
- 版本：`0.12.9-dam.2`

### 2026-10-20 · M1 登录与素材列表（v0.12.9-dam.3）

- 新增 DAM API 客户端：超时、GET 重试、统一错误、401 清理会话
- 新增壳内登录：账号密码、路由守卫、redirect 回跳、会话持久化（safeStorage）
- 登录接口的 401 单独处理为「用户名或密码不正确」
- 素材库从占位改为真实列表：统计卡片 + 表格 + 分页，数据来自 `/assets`、`/assets/stats`
- 设置页接入账号信息、退出登录、服务端地址变更后强制重新登录
- 验证：未登录跳登录页 ✅ / 登录成功读素材 ✅ / 重启免登录 ✅ / 退出登录 ✅ / 重新登录 ✅ / 无控制台错误 ✅
- 打包：`yarn build` 通过，产物 `build\MatrixMedia-DAM-0.12.9-dam.3-win-x64.exe`（约 68 MB）
- 打包修复：新增 `scripts/fix-wincodesign-cache.mjs`，绕过 winCodeSign 里 macOS 符号链接的解压失败
- 版本：`0.12.9-dam.3`

### 2026-10-21 · M2 素材检索（v0.12.9-dam.4）

- 筛选：关键词、板块、系列/名称、品类（产品）、素材类型、语言、尺寸
- 快捷筛选：近 7 天 / 尚未发布 / 视频缺封面 / 上传失败
- 列表：缩略图（封面或图片，批量签名地址）、发布平台标记、素材摘要
- 详情：弹窗预览图片/视频、完整元数据、云端路径、校验值、发布记录
- 验证：关键词 `彭文斌` 命中 1 条；重置回 2 条；尚未发布 1 条；近 7 天 0 条；
  板块筛选（公司活动）2 条；缩略图 4 张全部加载成功；详情视频可播放；无控制台错误
- 版本：`0.12.9-dam.4`
