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
import damChildren from "./router";

let registered = false;

export function registerDamModule() {
  if (registered) return;
  registered = true;

  constantRouterMap.push({
    path: "/dam",
    name: "dam",
    component: () => import("@/layout"),
    meta: { navModule: "dam", title: "DAM 工作区" },
    children: damChildren
  });
}

registerDamModule();

export default registerDamModule;
