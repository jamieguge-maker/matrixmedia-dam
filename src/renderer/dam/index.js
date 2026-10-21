/**
 * DAM 薄壳 · 渲染层入口。
 *
 * 由 src/renderer/main.js 的锚点 A2 引入，位置在 usePermission() 之前。
 *
 * 路由注册采用「追加数组」而不是改 router/index.js：
 * permission store 在首次导航时会用 constantRouterMap 重建 matcher，
 * 因此这里 push 进去的 /dam 会被自动注册。
 */

import router, { constantRouterMap } from "@/router";
import Vue from "vue";
import VueRouter from "vue-router";
import damChildren from "./router";
import DamRail from "./components/DamRail.vue";
import { useDamSession } from "./store/session";
import { onUnauthorized } from "./api/client";

let registered = false;

export function registerDamModule() {
  if (registered) return;
  registered = true;

  // 左侧主导航：注册成全局组件，由 layout 的锚点 A3 挂载
  Vue.component("dam-rail", DamRail);

  constantRouterMap.push({
    path: "/dam",
    name: "dam",
    component: () => import("@/layout"),
    // noSlide：DAM 页面的导航由左侧主导航承担，不再叠加上游 Sidebar
    meta: { navModule: "dam", title: "DAM 工作区", noSlide: true },
    children: damChildren
  });

  installGuard();

  /**
   * 深链启动（直接打开 /dam/xxx）时，第一次导航在 permission.js 重建 matcher 之前就完成了，
   * 那时 /dam 还没进 matcher，页面会先渲染 404 且不会被替换回来。
   * 这里提前重建一次 matcher，让首屏就能正确匹配。
   */
  try {
    router.matcher = new VueRouter({ routes: constantRouterMap }).matcher;
  } catch (error) {
    console.warn("[dam] 重建路由表失败：", error && error.message);
  }
}

/** DAM 页面需要登录；登录页与「未登录时的错误提示」由页面自己处理 */
function installGuard() {
  const session = useDamSession();

  router.beforeEach(async (to, from, next) => {
    if (!to.path.startsWith("/dam")) return next();
    if (to.path === "/dam/login") return next();

    const ok = await session.restore();
    if (ok) return next();

    next({ path: "/dam/login", query: { redirect: to.fullPath } });
  });

  // 任意请求返回 401：回登录页，并记住当前页面
  onUnauthorized(() => {
    const current = router.currentRoute;
    if (!current || !current.path || !current.path.startsWith("/dam")) return;
    if (current.path === "/dam/login") return;
    router
      .replace({ path: "/dam/login", query: { redirect: current.fullPath } })
      .catch(() => {});
  });
}

registerDamModule();

// 窗口标题跟随二改版身份（index.html 里仍是上游的 matrix-video）
if (typeof document !== "undefined") {
  document.title = "矩媒（DAM 版）";
}

export default registerDamModule;
