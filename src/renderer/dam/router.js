/**
 * 壳内路由。
 *
 * 约定：
 *   - 第一条子路由 path 为空，保证 /dam 直接渲染欢迎面板；
 *   - 不设 redirect（Sidebar 的 routeModuleKey 会优先读 redirect，设了会过滤不出本模块）；
 *   - 组件按需加载，M0 阶段为占位页。
 */

export default [
  {
    path: "login",
    name: "dam-login",
    component: () => import("./views/login/index.vue"),
    meta: { title: "登录", noSlide: true, hideRail: true }
  },
  {
    path: "",
    name: "dam-home",
    component: () => import("./views/home/index.vue"),
    meta: { title: "欢迎面板", noSlide: true }
  },
  {
    path: "assets",
    name: "dam-assets",
    component: () => import("./views/assets/index.vue"),
    meta: { title: "素材库", noSlide: true }
  },
  {
    path: "publish",
    name: "dam-publish",
    component: () => import("./views/publish/index.vue"),
    meta: { title: "发布中心", noSlide: true }
  },
  {
    path: "records",
    name: "dam-records",
    component: () => import("./views/records/index.vue"),
    meta: { title: "发布记录", noSlide: true }
  },
  {
    path: "plans",
    name: "dam-plans",
    component: () => import("./views/plans/index.vue"),
    meta: { title: "发布计划", noSlide: true }
  },
  {
    path: "metrics",
    name: "dam-metrics",
    component: () => import("./views/metrics/index.vue"),
    meta: { title: "流量看板", noSlide: true }
  },
  {
    // 个人设置：自己的资料与密码（入口在左侧导航底部）
    path: "profile",
    name: "dam-profile",
    component: () => import("./views/profile/index.vue"),
    meta: { title: "个人设置", noSlide: true }
  },
  {
    // 账号管理：管理员给同事分配账号（新建成员 / 角色 / 停用 / 重置密码）
    path: "org",
    name: "dam-org",
    component: () => import("./views/org/index.vue"),
    meta: { title: "账号管理", noSlide: true, adminOnly: true }
  },
  {
    // 社媒账号：汇总各客户端登记过的账号，管理员可停用/删除
    path: "targets",
    name: "dam-targets",
    component: () => import("./views/targets/index.vue"),
    meta: { title: "社媒账号", noSlide: true, adminOnly: true }
  },
  {
    // 操作记录：子账号的登录/上传/发布/删除等都落库，管理员可筛
    path: "logs",
    name: "dam-logs",
    component: () => import("./views/logs/index.vue"),
    meta: { title: "操作记录", noSlide: true, adminOnly: true }
  },
  {
    path: "settings",
    name: "dam-settings",
    component: () => import("./views/settings/index.vue"),
    meta: { title: "DAM 设置", noSlide: true }
  }
];
