/**
 * DAM 薄壳 · 渲染层入口。
 *
 * 由 src/renderer/main.js 的锚点 A2 引入，位置在 usePermission() 之前。
 *
 * 路由注册采用「追加数组」而不是改 router/index.js：
 * permission store 在首次导航时会用 constantRouterMap 重建 matcher，
 * 因此这里 push 进去的 /dam 会被自动注册。
 */

import { constantRouterMap } from "@/router";
import Vue from "vue";
import damChildren from "./router";
import DamRail from "./components/DamRail.vue";

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
}

registerDamModule();

export default registerDamModule;
