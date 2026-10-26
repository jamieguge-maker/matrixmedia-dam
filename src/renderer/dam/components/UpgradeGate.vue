<template>
  <div v-if="visible" class="dam-upgrade">
    <div class="dam-upgrade__card">
      <div class="dam-upgrade__badge">发现新版本</div>
      <h2 class="dam-upgrade__title">请升级客户端</h2>
      <p class="dam-upgrade__desc">
        当前版本 <b>{{ currentVersion }}</b>，可升级至
        <b>{{ policy.latestVersion || policy.minVersion }}</b>。请下载安装包并重新安装。
      </p>

      <ul class="dam-upgrade__meta">
        <li v-if="policy.latestVersion">最新版本：{{ policy.latestVersion }}</li>
        <li v-if="checkedAt">检查时间：{{ checkedAt }}</li>
      </ul>

      <pre v-if="policy.notes" class="dam-upgrade__notes">{{ policy.notes }}</pre>

      <div class="dam-upgrade__actions">
        <button
          class="dam-upgrade__btn dam-upgrade__btn--primary"
          :disabled="!policy.downloadUrl"
          @click="openDownload"
        >
          下载安装包
        </button>
        <button class="dam-upgrade__btn" :disabled="checking" @click="check">
          {{ checking ? "检查中…" : "我已安装，重新检查" }}
        </button>
        <button v-if="!policy.force" class="dam-upgrade__btn" @click="snooze">稍后提醒</button>
      </div>

      <p class="dam-upgrade__hint">
        <template v-if="!policy.downloadUrl">
          管理员还没有配置下载地址，请联系管理员获取安装包。
        </template>
        <template v-else-if="message">{{ message }}</template>
        <template v-else>
          安装完成后重启应用，本提示会自动消失。
        </template>
      </p>
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from "electron";
import { fetchClientVersionPolicy } from "../api/appVersion";
import { evaluateUpgrade } from "../utils/versionCompare";

/** 每 30 分钟问一次服务端；点回窗口时也会补一次（有节流） */
const CHECK_INTERVAL_MS = 30 * 60 * 1000;
/** 非强制模式下，「稍后提醒」隐藏多久 */
const SNOOZE_MS = 30 * 60 * 1000;
/** 窗口获得焦点时的最小检查间隔，避免频繁请求 */
const FOCUS_THROTTLE_MS = 5 * 60 * 1000;
const SNOOZE_KEY = "dam.upgrade.snoozeUntil";

export default {
  name: "DamUpgradeGate",
  data() {
    return {
      visible: false,
      checking: false,
      currentVersion: "",
      policy: {},
      message: "",
      checkedAt: ""
    };
  },
  mounted() {
    this.timer = setInterval(() => this.check(), CHECK_INTERVAL_MS);
    window.addEventListener("focus", this.onFocus);
    this.check();
  },
  beforeDestroy() {
    if (this.timer) clearInterval(this.timer);
    window.removeEventListener("focus", this.onFocus);
  },
  methods: {
    async localVersion() {
      try {
        const info = await ipcRenderer.invoke("dam:app:info");
        return (info && info.version) || "";
      } catch (_) {
        return "";
      }
    },
    onFocus() {
      const now = Date.now();
      if (now - (this.lastCheckAt || 0) < FOCUS_THROTTLE_MS) return;
      this.check();
    },
    /** 拉一次策略；manual=true 表示用户主动点了「重新检查」 */
    async check(manual) {
      if (this.checking) return;
      this.checking = true;
      try {
        const currentVersion = await this.localVersion();
        const policy = (await fetchClientVersionPolicy()) || {};
        const result = evaluateUpgrade(currentVersion, policy);

        this.currentVersion = currentVersion;
        this.policy = {
          minVersion: policy.minVersion || "",
          latestVersion: policy.latestVersion || "",
          downloadUrl: policy.downloadUrl || "",
          notes: policy.notes || "",
          force: policy.force !== false
        };
        this.lastCheckAt = Date.now();
        this.checkedAt = new Date().toLocaleString();

        if (!result.needUpgrade) {
          this.visible = false;
          this.message = "";
          if (manual) this.message = "已是最新版本";
          return;
        }

        if (this.isSnoozed()) {
          this.visible = false;
          return;
        }

        this.visible = true;
        if (manual) {
          this.message = `仍是 ${currentVersion}，请确认安装的版本不低于 ${result.minVersion || result.latestVersion}`;
        } else {
          this.message = "";
        }
      } catch (_) {
        // 网络不通 / 服务端未部署该接口：不打扰用户，下次再试
        if (manual) this.message = "无法连接服务端，请检查网络后重试";
      } finally {
        this.checking = false;
      }
    },
    isSnoozed() {
      if (this.policy.force !== false) return false;
      try {
        const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
        return Number.isFinite(until) && Date.now() < until;
      } catch (_) {
        return false;
      }
    },
    snooze() {
      try {
        localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
      } catch (_) {
        /* 忽略存储失败 */
      }
      this.visible = false;
    },
    async openDownload() {
      if (!this.policy.downloadUrl) return;
      try {
        const result = await ipcRenderer.invoke("dam:open-external", this.policy.downloadUrl);
        if (result && result.ok === false) {
          this.message = result.message || "打开下载页失败";
        }
      } catch (error) {
        this.message = "打开下载页失败：" + ((error && error.message) || error);
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.dam-upgrade {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(17, 24, 39, 0.72);
  backdrop-filter: blur(2px);
}

.dam-upgrade__card {
  width: 520px;
  max-width: calc(100vw - 48px);
  padding: 28px 32px 24px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.32);
}

.dam-upgrade__badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  background: #fef0f0;
  color: #d93026;
  font-size: 12px;
  line-height: 20px;
}

.dam-upgrade__title {
  margin: 12px 0 12px;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.dam-upgrade__desc {
  margin: 0 0 14px;
  font-size: 14px;
  line-height: 1.8;
  color: #4b5563;
}

.dam-upgrade__meta {
  margin: 0 0 12px;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.9;
  color: #6b7280;
}

.dam-upgrade__notes {
  margin: 0 0 16px;
  max-height: 180px;
  overflow: auto;
  padding: 12px 14px;
  border-radius: 8px;
  background: #f7f8fa;
  color: #374151;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  font-family: inherit;
}

.dam-upgrade__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.dam-upgrade__btn {
  padding: 8px 18px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fff;
  color: #374151;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    border-color: #409eff;
    color: #409eff;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
}

.dam-upgrade__btn--primary {
  border-color: #409eff;
  background: #409eff;
  color: #fff;

  &:hover:not(:disabled) {
    background: #66b1ff;
    color: #fff;
  }
}

.dam-upgrade__hint {
  margin: 14px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: #9ca3af;
}
</style>
