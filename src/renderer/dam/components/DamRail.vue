<template>
  <aside v-if="!hideRail" class="dam-rail">
    <div class="dam-rail__brand">
      <span class="dam-rail__brand-main">古希奥 DAM</span>
      <span class="dam-rail__brand-sub">素材与分发</span>
    </div>

    <div class="dam-rail__scroll">
      <div class="dam-rail__group">
        <div class="dam-rail__label">工作区</div>
        <button
          v-for="item in workspace"
          :key="item.key"
          type="button"
          class="dam-rail__item"
          :class="{ 'is-active': isActive(item) }"
          @click="select(item)"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </button>
      </div>

      <div class="dam-rail__group">
        <div class="dam-rail__label">系统设置</div>
        <button
          v-for="item in visibleSettings"
          :key="item.key"
          type="button"
          class="dam-rail__item"
          :class="{ 'is-active': isActive(item) }"
          @click="select(item)"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </button>
      </div>
    </div>

    <div class="dam-rail__footer">
      <button type="button" class="dam-rail__add" @click="showAdd = true">
        <i class="el-icon-plus"></i>
        <span>添加媒体账号</span>
      </button>

      <button type="button" class="dam-rail__user" @click="goProfile">
        <span class="dam-rail__avatar">{{ avatarText }}</span>
        <span class="dam-rail__user-info">
          <span class="dam-rail__user-name">{{ displayName }}</span>
          <span class="dam-rail__user-role">{{ roleText }}</span>
        </span>
        <i class="el-icon-setting dam-rail__user-set"></i>
      </button>

      <div class="dam-rail__version">DAM 版 {{ version }}</div>
    </div>

    <add-account-dialog :visible.sync="showAdd" @added="onAccountAdded" />
  </aside>
</template>

<script>
import { ipcRenderer } from "electron";
import { useAppStore } from "@/store/app";
import { usePermissionStore } from "@/store/permission";
import { useDamSession } from "../store/session";
import { roleLabel } from "../utils/format";
import AddAccountDialog from "./AddAccountDialog.vue";

export default {
  name: "DamRail",
  components: { AddAccountDialog },
  data() {
    return {
      session: useDamSession(),
      version: "",
      showAdd: false,
      workspace: [
        { key: "home", label: "欢迎面板", path: "/dam", icon: "el-icon-s-home" },
        { key: "assets", label: "素材库", path: "/dam/assets", icon: "el-icon-files" },
        { key: "publish", label: "发布中心", path: "/dam/publish", icon: "el-icon-promotion" },
        { key: "records", label: "发布记录", path: "/dam/records", icon: "el-icon-document" },
        { key: "plans", label: "发布计划", path: "/dam/plans", icon: "el-icon-date" },
        { key: "metrics", label: "流量看板", path: "/dam/metrics", icon: "el-icon-data-line" }
      ],
      settings: [
        {
          key: "org",
          label: "账号管理",
          path: "/dam/org",
          icon: "el-icon-s-custom",
          adminOnly: true
        },
        {
          key: "targets",
          label: "社媒账号",
          path: "/dam/targets",
          icon: "el-icon-link",
          adminOnly: true
        },
        {
          key: "logs",
          label: "操作记录",
          path: "/dam/logs",
          icon: "el-icon-tickets",
          adminOnly: true
        },
        { key: "dam-settings", label: "DAM 设置", path: "/dam/settings", icon: "el-icon-setting" },
        { key: "stats", label: "账号数据", path: "/data-stats", icon: "el-icon-user" },
        { key: "videos", label: "视频管理", path: "/video-manager", icon: "el-icon-video-camera" },
        { key: "media", label: "媒体平台管理", action: "media", icon: "el-icon-office-building" },
        { key: "about", label: "项目详情", path: "/project-detail", icon: "el-icon-info" }
      ]
    };
  },
  computed: {
    currentPath() {
      return this.$route.path;
    },
    hideRail() {
      return Boolean(this.$route.meta && this.$route.meta.hideRail);
    },
    /** 只有管理员能看到「账号管理」 */
    isAdmin() {
      const user = this.session.state.user || {};
      return Boolean(user.isSuperAdmin) || user.role === "admin";
    },
    visibleSettings() {
      return this.settings.filter((item) => !item.adminOnly || this.isAdmin);
    },
    /** 底部个人账号信息 */
    displayName() {
      const user = this.session.state.user || {};
      return user.displayName || user.username || "未登录";
    },
    roleText() {
      const user = this.session.state.user || {};
      if (user.isSuperAdmin) return "超级管理员";
      return roleLabel(user.role);
    },
    avatarText() {
      const name = this.displayName;
      return name ? name.slice(0, 1).toUpperCase() : "?";
    }
  },
  watch: {
    "$route.path"(path) {
      this.syncModule(path);
    }
  },
  created() {
    this.syncModule(this.$route.path);
    this.loadVersion();
    // 身份来自 /auth/profile；路由守卫进入页面前已 restore，这里直接读内存状态
    this.session.restore().catch(() => {});
  },
  methods: {
    async loadVersion() {
      try {
        const info = await ipcRenderer.invoke("dam:app:info");
        this.version = (info && info.version) || "";
      } catch (_) {
        this.version = "";
      }
    },
    isActive(item) {
      if (item.action === "media") return this.currentPath.startsWith("/accountManager");
      if (!item.path) return false;
      if (item.path === "/dam") {
        return this.currentPath === "/dam" || this.currentPath === "/dam/";
      }
      return this.currentPath === item.path || this.currentPath.startsWith(item.path + "/");
    },
    select(item) {
      if (item.action === "media") {
        this.openMediaManager();
        return;
      }
      if (!item.path) return;
      if (this.currentPath !== item.path) {
        this.$router.push(item.path).catch(() => {});
      }
      this.syncModule(item.path);
    },
    /** 让上游 Sidebar 知道该显示哪个模块（账号数据 / 媒体平台管理） */
    syncModule(path) {
      let module = "/";
      if (path.startsWith("/dam")) module = "dam";
      else if (path.startsWith("/data-stats")) module = "dataStats";
      else if (path.startsWith("/accountManager")) module = "accountManager";
      useAppStore().setData("isRoute", module);
    },
    openMediaManager() {
      const hit = this.$router
        .getRoutes()
        .find((route) => typeof route.path === "string" && route.path.startsWith("/accountManager"));
      if (!hit) {
        this.$message.warning("还没有媒体账号，请先点下方「添加媒体账号」");
        return;
      }
      if (this.currentPath !== hit.path) {
        this.$router.push(hit.path).catch(() => {});
      }
      this.syncModule(hit.path);
    },
    onAccountAdded() {
      usePermissionStore()
        .GenerateRoutes()
        .then(() => {
          this.$nextTick(() => this.openMediaManager());
        });
    },
    goProfile() {
      if (this.currentPath !== "/dam/profile") {
        this.$router.push("/dam/profile").catch(() => {});
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-rail {
  flex: 0 0 188px;
  width: 188px;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: $menuBg;
  border-right: 1px solid $borderColor;

  &__brand {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 16px 16px 12px;
    border-bottom: 1px solid $borderColor;
  }

  &__brand-main {
    font-size: 15px;
    font-weight: 700;
    color: $menuText;
  }

  &__brand-sub {
    font-size: 12px;
    color: $menuMuted;
  }

  &__scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 8px 12px;
  }

  &__group + &__group {
    margin-top: 14px;
  }

  &__label {
    padding: 6px 10px;
    font-size: 12px;
    color: $menuMuted;
    letter-spacing: 0.5px;
  }

  &__item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 10px;
    margin-bottom: 2px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: $menuText;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s, color 0.2s;

    i {
      font-size: 15px;
      color: $menuMuted;
    }

    &:hover {
      background: $menuHover;
    }

    &.is-active {
      background: $menuActiveBg;
      color: $primaryColor;
      font-weight: 600;

      i {
        color: $primaryColor;
      }
    }
  }

  &__footer {
    padding: 10px 12px 12px;
    border-top: 1px solid $borderColor;
  }

  &__add {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 10px;
    border: 1px dashed $borderColor;
    border-radius: 6px;
    background: transparent;
    color: $primaryColor;
    font-size: 13px;
    cursor: pointer;

    &:hover {
      border-color: $primaryColor;
      background: $menuHover;
    }
  }

  &__version {
    margin-top: 8px;
    text-align: center;
    font-size: 11px;
    color: $menuMuted;
  }

  &__user {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding: 8px;
    border: 1px solid $borderColor;
    border-radius: 8px;
    background: transparent;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s;

    &:hover {
      background: $menuHover;
      border-color: $primaryColor;
    }
  }

  &__avatar {
    flex: none;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: $primaryColor;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
  }

  &__user-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__user-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    color: $menuText;
  }

  &__user-role {
    font-size: 11px;
    color: $menuMuted;
  }

  &__user-set {
    flex: none;
    font-size: 14px;
    color: $menuMuted;
  }
}
</style>

<style lang="scss">
/* 左侧主导航取代上游顶部菜单：这里全局隐藏，不改 Navbar 源码 */
.navbar-header-fixed {
  display: none !important;
}
</style>
