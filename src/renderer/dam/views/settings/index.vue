<template>
  <div class="dam-settings">
    <el-card shadow="never" class="dam-settings__card">
      <div slot="header" class="dam-settings__head">
        <span class="dam-settings__title">DAM 账号</span>
        <el-tag :type="user ? 'success' : 'info'" size="mini">
          {{ user ? "已登录" : "未登录" }}
        </el-tag>
      </div>

      <el-descriptions v-if="user" :column="2" border size="small">
        <el-descriptions-item label="姓名">{{ user.displayName || user.username }}</el-descriptions-item>
        <el-descriptions-item label="角色">{{ roleLabel(user.role) }}</el-descriptions-item>
        <el-descriptions-item label="部门">{{ user.departmentName || "-" }}</el-descriptions-item>
        <el-descriptions-item label="用户名">{{ user.username }}</el-descriptions-item>
      </el-descriptions>

      <div class="dam-settings__actions">
        <el-button v-if="user" size="small" @click="logout">退出登录</el-button>
        <el-button v-else type="primary" size="small" @click="go('/dam/login')">去登录</el-button>
        <el-button size="small" :loading="loading" @click="reload">刷新状态</el-button>
      </div>

      <el-alert
        v-if="session.state.lastError"
        class="dam-settings__alert"
        :title="session.state.lastError"
        type="warning"
        :closable="false"
        show-icon
      />
    </el-card>

    <el-card shadow="never" class="dam-settings__card">
      <div slot="header" class="dam-settings__head">
        <span class="dam-settings__title">服务端</span>
      </div>

      <el-form label-width="110px" size="small">
        <el-form-item label="API 地址">
          <el-input v-model="apiBase" placeholder="https://dam.guocio.cn/api" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="saveConfig">保存</el-button>
          <el-button @click="reload">重新读取</el-button>
        </el-form-item>
      </el-form>

      <p class="dam-settings__hint">修改地址后需要重新登录（令牌与服务器绑定）。</p>
    </el-card>

    <el-card shadow="never" class="dam-settings__card">
      <div slot="header" class="dam-settings__head">
        <span class="dam-settings__title">矩媒引擎</span>
        <el-tag size="mini" type="info">系统设置</el-tag>
      </div>

      <p class="dam-settings__desc">
        账号登录、视频发布、账号数据与项目说明仍由矩媒原生页面提供。
        发布动作在后台复用本机矩媒内核，这里的入口用于配置与排查。
      </p>

      <div class="dam-settings__links">
        <el-button size="small" icon="el-icon-user" @click="go('/data-stats')">账号数据</el-button>
        <el-button size="small" icon="el-icon-video-camera" @click="go('/video-manager')">
          视频管理
        </el-button>
        <el-button size="small" icon="el-icon-office-building" @click="openMediaManager">
          媒体平台管理
        </el-button>
        <el-button size="small" icon="el-icon-info" @click="go('/project-detail')">
          项目详情
        </el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="dam-settings__card">
      <div slot="header" class="dam-settings__head">
        <span class="dam-settings__title">运行信息</span>
      </div>

      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="壳版本">{{ info.version || "-" }}</el-descriptions-item>
        <el-descriptions-item label="数据目录">{{ info.userData || "-" }}</el-descriptions-item>
        <el-descriptions-item label="更新源">
          {{ info.updateFeed || "未配置（不检查更新）" }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script>
import { ipcRenderer } from "electron";
import { useDamSession } from "../../store/session";
import { resetBaseUrl } from "../../api/client";
import { roleLabel } from "../../utils/format";

export default {
  name: "DamSettingsView",
  data() {
    return {
      session: useDamSession(),
      apiBase: "",
      info: {},
      saving: false,
      loading: false
    };
  },
  computed: {
    user() {
      return this.session.state.user;
    }
  },
  created() {
    this.reload();
  },
  methods: {
    roleLabel,
    async reload() {
      this.loading = true;
      try {
        const [config, info] = await Promise.all([
          ipcRenderer.invoke("dam:config:get"),
          ipcRenderer.invoke("dam:app:info")
        ]);
        this.apiBase = (config && config.apiBase) || "";
        this.info = info || {};
        // 顺带刷新一次账号信息（令牌失效时会被清掉）
        await this.session.restore(true);
      } catch (error) {
        this.$message.error("读取配置失败：" + ((error && error.message) || error));
      } finally {
        this.loading = false;
      }
    },
    async saveConfig() {
      const value = String(this.apiBase || "").trim().replace(/\/+$/, "");
      if (!value) {
        this.$message.warning("API 地址不能为空");
        return;
      }
      if (!/^https?:\/\//i.test(value)) {
        this.$message.warning("API 地址需以 http(s):// 开头");
        return;
      }

      const changed = value !== this.apiBase || value !== (this.session.state.baseUrl || "");
      this.saving = true;
      try {
        await ipcRenderer.invoke("dam:config:set", { apiBase: value });
        resetBaseUrl();
        this.$message.success("已保存");
        if (changed && this.user) {
          await this.session.logout();
          this.$message.info("服务端地址已变更，请重新登录");
          this.go("/dam/login");
        }
      } catch (error) {
        this.$message.error("保存失败：" + ((error && error.message) || error));
      } finally {
        this.saving = false;
      }
    },
    async logout() {
      await this.session.logout();
      this.$message.success("已退出登录");
      this.go("/dam/login");
    },
    go(path) {
      if (this.$route.path !== path) this.$router.push(path).catch(() => {});
    },
    openMediaManager() {
      const hit = this.$router
        .getRoutes()
        .find((route) => typeof route.path === "string" && route.path.startsWith("/accountManager"));
      if (!hit) {
        this.$message.warning("还没有媒体账号，请先在左侧「添加媒体账号」");
        return;
      }
      this.go(hit.path);
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-settings {
  padding: 20px;
  max-width: 920px;

  &__card + &__card {
    margin-top: 16px;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    font-size: 15px;
    font-weight: 600;
    color: $menuText;
  }

  &__desc {
    margin: 0 0 14px;
    color: $menuMuted;
    line-height: 1.8;
    font-size: 13px;
  }

  &__hint {
    margin: 0;
    color: $menuMuted;
    font-size: 12px;
  }

  &__actions {
    margin-top: 14px;
    display: flex;
    gap: 10px;
  }

  &__alert {
    margin-top: 12px;
  }

  &__links {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
}
</style>
