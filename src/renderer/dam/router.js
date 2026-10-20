/**
 * 壳内路由。
 *
 * 约定：
 *   - 第一条子路由 path 为空，保证 /dam 直接渲染素材库；
 *   - 不设 redirect（Sidebar 的 routeModuleKey 会优先读 redirect，设了会过滤不出本模块）；
 *   - 组件按需加载，M0 阶段为占位页。
 */

export default [
  {
    path: "",
    name: "dam-assets",
    component: () => import("./views/assets/index.vue"),
    meta: { title: "素材库" }
  },
  {
    path: "publish",
    name: "dam-publish",
    component: () => import("./views/publish/index.vue"),
    meta: { title: "发布中心" }
  },
  {
    path: "records",
    name: "dam-records",
    component: () => import("./views/records/index.vue"),
    meta: { title: "发布记录" }
  },
  {
    path: "plans",
    name: "dam-plans",
    component: () => import("./views/plans/index.vue"),
    meta: { title: "发布计划" }
  },
  {
    path: "metrics",
    name: "dam-metrics",
    component: () => import("./views/metrics/index.vue"),
    meta: { title: "流量看板" }
  },
  {
    path: "settings",
    name: "dam-settings",
    component: () => import("./views/settings/index.vue"),
    meta: { title: "DAM 设置" }
  }
];
