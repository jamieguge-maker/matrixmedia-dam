<template>
  <div class="dam-settings">
    <el-card shadow="never" class="dam-settings__card">
      <div slot="header" class="dam-settings__head">
        <span class="dam-settings__title">DAM 服务端</span>
        <el-tag :type="loggedIn ? 'success' : 'info'" size="mini">
          {{ loggedIn ? "已登录" : "未登录" }}
        </el-tag>
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

      <el-alert
        title="登录与素材查询将在 M1 / M2 接入"
        type="info"
        :closable="false"
        show-icon
        description="当前版本已具备壳内登录态存储（safeStorage）、配置读写与 API 地址管理；下一步接入账号密码登录与 401 处理。"
      />
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

export default {
  name: "DamSettingsView",
  data() {
    return {
      apiBase: "",
      info: {},
      loggedIn: false,
      saving: false
    };
  },
  created() {
    this.reload();
  },
  methods: {
    async reload() {
      try {
        const [config, info, session] = await Promise.all([
          ipcRenderer.invoke("dam:config:get"),
          ipcRenderer.invoke("dam:app:info"),
          ipcRenderer.invoke("dam:session:get")
        ]);
        this.apiBase = (config && config.apiBase) || "";
        this.info = info || {};
        this.loggedIn = Boolean(session && session.token);
      } catch (error) {
        this.$message.error("读取配置失败：" + ((error && error.message) || error));
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
      this.saving = true;
      try {
        await ipcRenderer.invoke("dam:config:set", { apiBase: value });
        this.$message.success("已保存（下次请求生效）");
      } catch (error) {
        this.$message.error("保存失败：" + ((error && error.message) || error));
      } finally {
        this.saving = false;
      }
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

  &__links {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
}
</style>
