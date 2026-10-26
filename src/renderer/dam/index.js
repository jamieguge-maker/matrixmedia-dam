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
import UpgradeGate from "./components/UpgradeGate.vue";
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
  mountUpgradeGate();

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

/**
 * 远程升级提示。
 *
 * 服务端存一份「最低允许版本 + 下载地址」，客户端每 30 分钟轮询一次；
 * 本地版本低于要求时弹出不可忽略的提示层，要求下载并重新安装。
 * 挂在 body 上（而不是某个页面里），所以登录页、素材库、发布中心都会看到。
 */
function mountUpgradeGate() {
  if (typeof document === "undefined") return;
  const mountTo = () => {
    if (document.getElementById("dam-upgrade-root")) return;
    const root = document.createElement("div");
    root.id = "dam-upgrade-root";
    document.body.appendChild(root);
    new Vue({ render: (h) => h(UpgradeGate) }).$mount(root);
  };
  if (document.body) mountTo();
  else document.addEventListener("DOMContentLoaded", mountTo);
}

/** DAM 页面需要登录；登录页与「未登录时的错误提示」由页面自己处理 */
function installGuard() {
  const session = useDamSession();

  router.beforeEach(async (to, from, next) => {
    if (!to.path.startsWith("/dam")) return next();
    if (to.path === "/dam/login") return next();

    const ok = await session.restore();
    if (!ok) {
      next({ path: "/dam/login", query: { redirect: to.fullPath } });
      return;
    }

    // 页面级权限：菜单已经藏了，手敲地址进来也要挡住（真正的拦截仍在服务端）
    if (to.meta && to.meta.adminOnly) {
      const user = session.state.user || {};
      if (user.role !== "admin" && !user.isSuperAdmin) {
        console.warn("[dam] 没有访问该页面的权限：", to.path);
        next({ path: "/dam" });
        return;
      }
    }

    next();
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

/**
 * 启动时先登录。
 *
 * 主进程启动会清掉上次的令牌，但上游默认路由是「账号数据」这类页面，
 * 不经过 /dam 守卫，于是应用会直接显示上游界面 —— 用户看到的就是「打开没登录」。
 * 这里在首次导航完成后兜一次：没登录就落到 DAM 登录页，
 * 登录后回到 /dam（否则会回到上游页面）。
 */
function ensureStartupLogin() {
  const session = useDamSession();
  session
    .restore()
    .then((ok) => {
      if (ok) return;
      const current = router.currentRoute;
      if (current && current.path.startsWith("/dam")) return; // DAM 守卫自己会处理
      router.replace({ path: "/dam/login", query: { redirect: "/dam" } }).catch(() => {});
    })
    .catch(() => {});
}

router.onReady(() => {
  ensureStartupLogin();
});

export default registerDamModule;
