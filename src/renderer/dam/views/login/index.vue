<template>
  <div class="dam-login">
    <div class="dam-login__card">
      <div class="dam-login__brand">
        <div class="dam-login__title">古希奥 DAM</div>
        <div class="dam-login__sub">矩媒（DAM 版）· 素材与分发</div>
      </div>

      <el-form class="dam-login__form" @submit.native.prevent>
        <el-form-item>
          <el-input
            v-model="username"
            placeholder="用户名"
            prefix-icon="el-icon-user"
            autocomplete="username"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="password"
            type="password"
            show-password
            placeholder="密码"
            prefix-icon="el-icon-lock"
            autocomplete="current-password"
            @keyup.enter.native="submit"
          />
        </el-form-item>

        <el-button
          type="primary"
          class="dam-login__submit"
          :loading="session.state.loading"
          @click="submit"
        >
          登录
        </el-button>
      </el-form>

      <el-alert
        v-if="errorText"
        class="dam-login__error"
        :title="errorText"
        type="error"
        :closable="false"
        show-icon
      />

      <div class="dam-login__server">
        <span class="dam-login__server-text">服务端：{{ apiBase || "未配置" }}</span>
        <el-button type="text" size="mini" @click="showServer = !showServer">
          {{ showServer ? "收起" : "修改" }}
        </el-button>
      </div>

      <div v-if="showServer" class="dam-login__server-edit">
        <el-input v-model="apiBaseDraft" size="small" placeholder="https://dam.guocio.cn/api" />
        <el-button size="small" type="primary" :loading="savingServer" @click="saveServer">
          保存
        </el-button>
      </div>

      <div class="dam-login__version">v{{ version }}</div>
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from "electron";
import { useDamSession } from "../../store/session";
import { resetBaseUrl } from "../../api/client";

export default {
  name: "DamLoginView",
  data() {
    return {
      session: useDamSession(),
      username: "",
      password: "",
      errorText: "",
      showServer: false,
      apiBase: "",
      apiBaseDraft: "",
      savingServer: false,
      version: ""
    };
  },
  created() {
    this.loadServer();
    this.loadVersion();
  },
  methods: {
    async loadServer() {
      try {
        const config = await ipcRenderer.invoke("dam:config:get");
        this.apiBase = (config && config.apiBase) || "";
        this.apiBaseDraft = this.apiBase;
      } catch (_) {
        this.apiBase = "";
      }
    },
    async loadVersion() {
      try {
        const info = await ipcRenderer.invoke("dam:app:info");
        this.version = (info && info.version) || "";
      } catch (_) {
        this.version = "";
      }
    },
    async saveServer() {
      const value = String(this.apiBaseDraft || "").trim().replace(/\/+$/, "");
      if (!value || !/^https?:\/\//i.test(value)) {
        this.$message.warning("API 地址需以 http(s):// 开头");
        return;
      }
      this.savingServer = true;
      try {
        await ipcRenderer.invoke("dam:config:set", { apiBase: value });
        resetBaseUrl();
        this.apiBase = value;
        this.showServer = false;
        this.$message.success("已保存，请重新登录");
      } catch (error) {
        this.$message.error("保存失败：" + ((error && error.message) || error));
      } finally {
        this.savingServer = false;
      }
    },
    async submit() {
      this.errorText = "";
      if (!this.username.trim()) {
        this.errorText = "请输入用户名";
        return;
      }
      if (!this.password) {
        this.errorText = "请输入密码";
        return;
      }
      try {
        await this.session.login(this.username, this.password);
        this.password = "";
        const redirect = this.$route.query.redirect || "/dam";
        this.$router.replace(redirect).catch(() => {});
      } catch (error) {
        this.errorText = (error && error.message) || "登录失败";
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-login {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $pageBg;

  &__card {
    width: 360px;
    padding: 32px 32px 20px;
    background: $cardBg;
    border-radius: 10px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  }

  &__brand {
    text-align: center;
    margin-bottom: 22px;
  }

  &__title {
    font-size: 22px;
    font-weight: 700;
    color: $menuText;
  }

  &__sub {
    margin-top: 6px;
    font-size: 12px;
    color: $menuMuted;
  }

  &__form {
    margin-bottom: 6px;
  }

  &__submit {
    width: 100%;
  }

  &__error {
    margin-top: 12px;
  }

  &__server {
    margin-top: 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__server-text {
    font-size: 12px;
    color: $menuMuted;
    word-break: break-all;
  }

  &__server-edit {
    margin-top: 8px;
    display: flex;
    gap: 8px;
  }

  &__version {
    margin-top: 16px;
    text-align: center;
    font-size: 11px;
    color: $menuMuted;
  }
}
</style>
