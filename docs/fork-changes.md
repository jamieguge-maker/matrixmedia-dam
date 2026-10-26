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
| 发布中心       | `src/renderer/dam/views/publish/index.vue` | 选素材 → 选账号 → 文案 → 时间 → 提交 → 结果 |
| 发布链路       | `src/renderer/dam/api/publish.js`、`api/matrixmedia.js` | 先落记录、调本机 `/publish`、回写状态 |
| 素材选择器     | `src/renderer/dam/components/AssetPickerDialog.vue` | 关键词/板块筛选 + 跨页多选 |
| 素材入库       | `src/renderer/dam/components/UploadDialog.vue` | 板块 / 系列 / 品类 / 类型 / 语言·尺寸（多选）→ 拖拽或选文件 → 建记录 → 传 WPS → 回写入库 |
| 选文件/哈希/上传 | `src/main/dam/upload.js` | `dam:pick-files` / `dam:hash-file` / `dam:upload-file`，流式上传并回报进度 |
| 入库目录规则   | `src/renderer/dam/utils/assetPaths.js` | 产品：`/产品/{系列}/{品类}/{类型}/{尺寸?}/{英文版?}`；其它：`/{板块}/{名称}/{尺寸?}/{英文版?}` |

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
| `DAM_PROFILE_DIR`| 覆盖 userData 目录，用于并行跑第二个实例（自测 / 双账号），默认 `%APPDATA%/matrixmedia-dam` |
| `dam-config.json`| `apiBase`（默认 `https://dam.guocio.cn/api`）、`syncIntervalMin`                        |

### 自动发布与客户端升级提醒

推送到 `prod` 后，GitHub Actions 会自动递增 `0.12.9-dam.N` 版本、构建 Windows / macOS / Linux 安装包、
创建带提交说明的 GitHub Release，并将最新版本、Windows 安装包地址和发布说明写入
`https://dam.guocio.cn/api-v2/app/client-version`。客户端启动、每 30 分钟及窗口重新获得焦点时检查；
发现 `latestVersion` 高于本机版本就显示升级提示和更新说明。策略默认允许用户稍后处理；
将 `minVersion` 设为最低受支持版本可强制旧版本升级。

仓库需配置 Actions secret `DAM_CLIENT_VERSION_TOKEN`，值为 DAM v2 管理员访问令牌（用于更新客户端版本策略）。
若该 secret 未配置或令牌失效，安装包仍会发布，但线上版本策略更新步骤会失败，旧客户端不会收到本次升级提醒。

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
- 当前页面进度：M0 / M0.1 / M1 / M2 / M3 已完成，素材入库（原 M6）已提前完成，下一步 M4（发布记录与状态同步）。

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
- 说明：本机「测试」分组未登录，`/publish` 会等待扫码，未做真实成功发布验证
- 版本：`0.12.9-dam.4`

### 2026-10-21 · M3 发布中心（v0.12.9-dam.5）

- 选素材：弹窗支持关键词/板块筛选、跨页多选（`reserve-selection`）
- 平台账号：按平台分组，支持整组/单账号勾选；AiToEarn 账号标注「暂不支持」
- 文案：共用 + 按平台单独覆盖（开关切换）
- 时间：立即 / 指定时间 / 按发布计划排期（`/publish/slots` 逐平台显示）
- 提交链路：先 `POST /publish/records` → 调本机 `/publish` → `PATCH` 回写状态
- 验证：账号 7 个、平台 3 个正确分组；素材多选 1 条；任务数正确；
  抖音计划排期读出「2026-10-21 · 每周一、三 · 09:30」；未选素材时拦截提示；
  分平台文案开关可生成独立表单；真实发布会话已落到 `publish_records`（测试记录已清理）
- 版本：`0.12.9-dam.5`

### 2026-10-21 · 素材入库 / 上传 WPS（v0.12.9-dam.6）

- 入口：素材库右上「上传素材」按钮（`src/renderer/dam/views/assets/index.vue`）
- 主进程能力（`src/main/dam/upload.js`）：
  - `dam:pick-files`：系统选文件（图片 / 视频 / 全部）
  - `dam:hash-file`：流式计算 MD5 + SHA256
  - `dam:upload-file`：流式 POST `/wps/upload`（`x-file-name` / `x-folder-path`），
    进度经 `dam:upload-progress` 回报，渲染层不碰文件内容
- 入库流程（对齐 version1）：查重 `/assets/by-checksum/:md5` → `POST /assets`（uploading）
  → 传封面 → 传主文件 → `POST /assets/:id/storage` → `POST /logs`
- 目录规则：产品 `/产品/{系列}/{品类}/{类型}/{尺寸?}/{英文版?}`；其它板块
  `/{板块}/{名称}/{尺寸?}/{英文版?}`；个人 / 活动板块图片仅可作封面，视频必须配封面
- 顺带修复：深链启动（直接停在 `/dam/**`）时 permission.js 重建 matcher 之前的首屏
  会残留 404，改为在 dam 模块注册时提前重建一次 matcher
- 验证：真实账号上传 1 个小文件 → `已入库`，WPS fileId 与 `/产品/高升/落地灯/白底、细节图/...`
  一致；重复上传同一文件识别为「内容重复」；列表自动刷新；封面必填、路径与标题
  （含 9:16 / 英文版后缀）校验通过（测试素材与 WPS 文件已删除）
- 版本：`0.12.9-dam.6`

### 2026-10-21 · 入库弹窗交互完善（v0.12.9-dam.7）

- 拖拽上传：文件可直接拖进虚线区（`dataTransfer.files` → 磁盘路径；
  Electron 24 用 `File.path`，并预留 `webUtils.getPathForFile` 兼容 32+）
- 语言 / 尺寸改为 version1 的多选：勾「有英文版本」多一套英文，尺寸勾几个传几套，
  每个「语言 × 尺寸」组合各自一套文件（`正在编辑` 页签切换），取消勾选时丢弃该组合已选文件
- 产品板块：系列与品类并排一行
- 验证：4 个组合页签正常、拖拽入列与路径（`/产品/高升/落地灯/白底、细节图/9-16/英文版/...`）正确、
  9:16 与 16:9 各传 1 个文件均入库（`ratio` 与目录一致），测试素材与 WPS 文件已删除
- 版本：`0.12.9-dam.7`

### 2026-10-21 · 弹窗点击遮罩可关闭（v0.12.9-dam.8）

- 壳内弹窗（素材入库 / 素材选择 / 添加媒体账号）恢复 Element 默认的「点遮罩关闭」
- 上传中、提交中通过 `before-close` 拦截，避免误关中断任务
- 验证：入库弹窗点遮罩即关闭；`uploading = true` 时点遮罩仍保持打开并提示
- 版本：`0.12.9-dam.8`
