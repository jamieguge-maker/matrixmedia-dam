<template>
  <div class="dam-publish">
    <div class="dam-publish__header">
      <div>
        <div class="dam-publish__title">发布中心</div>
        <div class="dam-publish__sub">
          先落台账再调用本机矩媒内核；失败可追溯、可重试
        </div>
      </div>
      <el-button size="small" icon="el-icon-refresh" :loading="targetsLoading" @click="loadTargets">
        刷新账号
      </el-button>
    </div>

    <el-alert
      v-if="targetsError"
      class="dam-publish__alert"
      :title="targetsError"
      type="error"
      :closable="false"
      show-icon
    />

    <el-alert
      v-if="!targetsLoading && !accounts.length"
      class="dam-publish__alert"
      title="还没有可用的发布账号"
      type="warning"
      :closable="false"
      show-icon
      description="到「系统设置 → 媒体平台管理」添加账号并扫码登录后，再回到这里发布。"
    />

    <!-- ① 选择素材 -->
    <el-card shadow="never" class="dam-publish__card">
      <div slot="header" class="dam-publish__card-head">
        <span class="dam-publish__step">① 选择素材</span>
        <span class="dam-publish__count">已选 {{ selectedAssets.length }} 条</span>
      </div>

      <div class="dam-publish__chips">
        <el-tag
          v-for="asset in selectedAssets"
          :key="asset.id"
          size="small"
          closable
          @close="removeAsset(asset.id)"
        >
          {{ asset.title }}
        </el-tag>
        <span v-if="!selectedAssets.length" class="dam-publish__muted">还没有选择素材</span>
      </div>

      <el-button size="small" icon="el-icon-plus" @click="pickerVisible = true">
        选择素材
      </el-button>
    </el-card>

    <!-- ② 平台与账号 -->
    <el-card shadow="never" class="dam-publish__card">
      <div slot="header" class="dam-publish__card-head">
        <span class="dam-publish__step">② 选择平台与账号</span>
        <span class="dam-publish__count">已选 {{ selectedAccounts.length }} 个账号</span>
      </div>

      <div v-loading="targetsLoading" class="dam-publish__platforms">
        <div v-for="group in platformGroups" :key="group.code" class="dam-platform">
          <div class="dam-platform__head">
            <el-checkbox
              :value="isPlatformChecked(group)"
              :indeterminate="isPlatformIndeterminate(group)"
              @change="togglePlatform(group, $event)"
            >
              {{ group.name }}
            </el-checkbox>
            <span class="dam-platform__hint">{{ group.accounts.length }} 个账号</span>
          </div>

          <div class="dam-platform__accounts">
            <el-checkbox
              v-for="account in group.accounts"
              :key="account.id"
              :value="selectedTargetIds.includes(account.id)"
              :disabled="!canPublishWith(account)"
              @change="toggleAccount(account, $event)"
            >
              {{ account.accountName }}
              <el-tag v-if="account.channel === 'aitoearn'" size="mini" type="info">
                AiToEarn（暂不支持）
              </el-tag>
            </el-checkbox>
          </div>
        </div>

        <span v-if="!platformGroups.length && !targetsLoading" class="dam-publish__muted">
          没有可用账号
        </span>
      </div>
    </el-card>

    <!-- ③ 文案 -->
    <el-card shadow="never" class="dam-publish__card">
      <div slot="header" class="dam-publish__card-head">
        <span class="dam-publish__step">③ 文案</span>
        <span class="dam-publish__count">标题留空时用素材标题</span>
      </div>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="共用" name="shared">
          <div class="dam-content">
            <el-form label-width="72px" size="small">
              <el-form-item label="标题">
                <el-input v-model="shared.title" maxlength="200" show-word-limit />
              </el-form-item>
              <el-form-item label="简介">
                <el-input v-model="shared.description" type="textarea" :rows="3" />
              </el-form-item>
              <el-form-item label="标签">
                <el-input v-model="shared.tagsText" placeholder="用逗号或空格分隔" />
              </el-form-item>
              <el-form-item label="短标题">
                <el-input
                  v-model="shared.shortTitle"
                  maxlength="16"
                  show-word-limit
                  placeholder="仅视频号使用"
                />
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane
          v-for="code in selectedPlatforms"
          :key="code"
          :label="platformLabel(code)"
          :name="code"
        >
          <div class="dam-content">
            <div class="dam-content__switch">
              <el-switch
                :value="Boolean(overrideEnabled[code])"
                active-text="单独为这个平台写一份"
                @change="toggleOverride(code, $event)"
              />
            </div>

            <el-form v-if="overrideEnabled[code]" label-width="72px" size="small">
              <el-form-item label="标题">
                <el-input v-model="overrides[code].title" maxlength="200" show-word-limit />
              </el-form-item>
              <el-form-item label="简介">
                <el-input v-model="overrides[code].description" type="textarea" :rows="3" />
              </el-form-item>
              <el-form-item label="标签">
                <el-input v-model="overrides[code].tagsText" placeholder="用逗号或空格分隔" />
              </el-form-item>
              <el-form-item label="短标题">
                <el-input v-model="overrides[code].shortTitle" maxlength="16" show-word-limit />
              </el-form-item>
            </el-form>
            <div v-else class="dam-publish__muted">
              当前沿用「共用」文案。打开上面的开关可以单独写一份。
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- ④ 发布时间 -->
    <el-card shadow="never" class="dam-publish__card">
      <div slot="header" class="dam-publish__card-head">
        <span class="dam-publish__step">④ 发布时间</span>
      </div>

      <el-radio-group v-model="timeMode" size="small" @change="onTimeModeChange">
        <el-radio-button label="now">立即发布</el-radio-button>
        <el-radio-button label="custom">指定时间</el-radio-button>
        <el-radio-button label="plan">按发布计划排期</el-radio-button>
      </el-radio-group>

      <div v-if="timeMode === 'custom'" class="dam-publish__time">
        <el-date-picker
          v-model="customTime"
          type="datetime"
          size="small"
          value-format="yyyy-MM-dd HH:mm:ss"
          placeholder="选择发布时间"
        />
      </div>

      <div v-if="timeMode === 'plan'" class="dam-publish__plan">
        <div class="dam-publish__plan-head">
          <span>各平台按自己的计划排期</span>
          <el-button size="mini" type="text" :loading="slotsLoading" @click="loadSlots">
            重新读取
          </el-button>
        </div>
        <el-table :data="planRows" size="mini" border empty-text="先选择平台与账号">
          <el-table-column label="平台" width="110">
            <template #default="{ row }">{{ row.name }}</template>
          </el-table-column>
          <el-table-column label="排期" width="120">
            <template #default="{ row }">
              <span v-if="row.slot && row.slot.date">{{ row.slot.date }}</span>
              <span v-else class="dam-publish__muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="计划" min-width="180">
            <template #default="{ row }">
              <span v-if="row.slot && row.slot.planName">
                {{ row.slot.planName }} · {{ row.slot.planDesc }}
              </span>
              <span v-else-if="row.slot === null" class="dam-publish__muted">未配置计划</span>
              <span v-else class="dam-publish__muted">读取中…</span>
            </template>
          </el-table-column>
          <el-table-column label="说明" min-width="200">
            <template #default="{ row }">
              <span v-if="row.slot && row.slot.reason" class="dam-publish__warn">
                {{ row.slot.reason }}
              </span>
              <span v-else-if="row.slot && row.slot.date" class="dam-publish__muted">
                提醒时间 {{ row.slot.remindTime || "09:30" }}，当日已发
                {{ row.slot.publishedCount || 0 }} 条
              </span>
              <span v-else class="dam-publish__muted">—</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <div class="dam-publish__submit">
      <span class="dam-publish__summary">
        <template v-if="submitting">
          发布中 {{ progress.done }} / {{ progress.total }} · 需要等待通道返回，请勿关闭窗口
        </template>
        <template v-else>
          共 {{ totalTasks }} 个任务（{{ selectedAssets.length }} 素材 ×
          {{ selectedAccounts.length }} 账号）
        </template>
      </span>
      <el-button type="primary" :loading="submitting" @click="submit">开始发布</el-button>
    </div>

    <el-card v-if="results.length" shadow="never" class="dam-publish__card">
      <div slot="header" class="dam-publish__card-head">
        <span class="dam-publish__step">发布结果</span>
        <span class="dam-publish__count">
          成功 {{ successCount }} / {{ results.length }}
        </span>
      </div>

      <el-table :data="results" size="mini" border>
        <el-table-column prop="assetTitle" label="素材" min-width="180" show-overflow-tooltip />
        <el-table-column label="平台" width="110">
          <template #default="{ row }">{{ platformLabel(row.platformCode) }}</template>
        </el-table-column>
        <el-table-column prop="accountName" label="账号" width="140" show-overflow-tooltip />
        <el-table-column label="结果" width="96">
          <template #default="{ row }">
            <el-tag size="mini" :type="row.success ? 'success' : 'danger'">
              {{ row.success ? "成功" : "失败" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="说明" min-width="220" show-overflow-tooltip />
      </el-table>
    </el-card>

    <asset-picker-dialog :visible.sync="pickerVisible" @confirm="onAssetsConfirm" />
  </div>
</template>

<script>
import { assetPreviewUrls } from "../../api/assets";
import { createPublishRecord, listTargets, publishSlots, updatePublishRecord } from "../../api/publish";
import { mapMatrixMediaOutcome, publishToMatrixMedia } from "../../api/matrixmedia";
import AssetPickerDialog from "../../components/AssetPickerDialog.vue";
import { MM_ALIAS, platformLabel } from "../../utils/format";

function emptyContent() {
  return { title: "", description: "", tagsText: "", shortTitle: "" };
}

export default {
  name: "DamPublishView",
  components: { AssetPickerDialog },
  data() {
    return {
      targets: [],
      targetsLoading: false,
      targetsError: "",
      selectedAssets: [],
      selectedTargetIds: [],
      shared: emptyContent(),
      overrides: {},
      overrideEnabled: {},
      activeTab: "shared",
      timeMode: "now",
      customTime: "",
      slots: {},
      slotsLoading: false,
      slotsError: "",
      submitting: false,
      progress: { done: 0, total: 0 },
      results: [],
      pickerVisible: false
    };
  },
  computed: {
    accounts() {
      return this.targets.filter((target) => target.enabled !== false);
    },
    platformGroups() {
      const map = new Map();
      this.accounts.forEach((account) => {
        if (!map.has(account.platformCode)) {
          map.set(account.platformCode, {
            code: account.platformCode,
            name: platformLabel(account.platformCode),
            accounts: []
          });
        }
        map.get(account.platformCode).accounts.push(account);
      });
      return [...map.values()];
    },
    selectedAccounts() {
      return this.accounts.filter((account) => this.selectedTargetIds.includes(account.id));
    },
    selectedPlatforms() {
      const set = new Set();
      this.selectedAccounts.forEach((account) => set.add(account.platformCode));
      return [...set];
    },
    totalTasks() {
      return this.selectedAssets.length * this.selectedAccounts.length;
    },
    successCount() {
      return this.results.filter((item) => item.success).length;
    },
    planRows() {
      return this.selectedPlatforms.map((code) => ({
        code,
        name: platformLabel(code),
        slot: Object.prototype.hasOwnProperty.call(this.slots, code) ? this.slots[code] : undefined
      }));
    },
    publishablePlatforms() {
      return this.selectedPlatforms.filter((code) => Boolean(MM_ALIAS[code]));
    }
  },
  watch: {
    selectedPlatforms(list) {
      list.forEach((code) => {
        if (!Object.prototype.hasOwnProperty.call(this.overrideEnabled, code)) {
          this.$set(this.overrideEnabled, code, false);
        }
      });
      if (this.activeTab !== "shared" && !list.includes(this.activeTab)) {
        this.activeTab = "shared";
      }
      if (this.timeMode === "plan") this.loadSlots();
    }
  },
  created() {
    this.loadTargets();
  },
  methods: {
    platformLabel,
    async loadTargets() {
      this.targetsLoading = true;
      this.targetsError = "";
      try {
        const rows = await listTargets();
        this.targets = rows || [];
        this.selectedTargetIds = this.selectedTargetIds.filter((id) =>
          this.targets.some((target) => target.id === id)
        );
      } catch (error) {
        this.targets = [];
        this.targetsError = (error && error.message) || "加载发布账号失败";
      } finally {
        this.targetsLoading = false;
      }
    },
    canPublishWith(account) {
      return account.channel === "matrixmedia" && Boolean(MM_ALIAS[account.platformCode]);
    },
    isPlatformChecked(group) {
      const usable = group.accounts.filter((account) => this.canPublishWith(account));
      return usable.length > 0 && usable.every((account) => this.selectedTargetIds.includes(account.id));
    },
    isPlatformIndeterminate(group) {
      const usable = group.accounts.filter((account) => this.canPublishWith(account));
      const picked = usable.filter((account) => this.selectedTargetIds.includes(account.id));
      return picked.length > 0 && picked.length < usable.length;
    },
    togglePlatform(group, checked) {
      const ids = group.accounts
        .filter((account) => this.canPublishWith(account))
        .map((account) => account.id);
      if (checked) {
        this.selectedTargetIds = [...new Set([...this.selectedTargetIds, ...ids])];
      } else {
        this.selectedTargetIds = this.selectedTargetIds.filter((id) => !ids.includes(id));
      }
    },
    toggleAccount(account, checked) {
      if (checked) {
        if (!this.selectedTargetIds.includes(account.id)) {
          this.selectedTargetIds = [...this.selectedTargetIds, account.id];
        }
      } else {
        this.selectedTargetIds = this.selectedTargetIds.filter((id) => id !== account.id);
      }
    },
    onAssetsConfirm(rows) {
      this.selectedAssets = rows;
      if (!this.shared.title && rows.length === 1) {
        this.shared.title = rows[0].title || "";
      }
    },
    removeAsset(id) {
      this.selectedAssets = this.selectedAssets.filter((asset) => asset.id !== id);
    },
    toggleOverride(code, enabled) {
      if (enabled) {
        this.$set(this.overrides, code, Object.assign(emptyContent(), this.shared));
        this.$set(this.overrideEnabled, code, true);
      } else {
        this.$set(this.overrideEnabled, code, false);
      }
    },
    onTimeModeChange(mode) {
      if (mode === "plan") this.loadSlots();
    },
    async loadSlots() {
      if (!this.selectedPlatforms.length) {
        this.slots = {};
        return;
      }
      this.slotsLoading = true;
      this.slotsError = "";
      try {
        const result = await publishSlots(this.selectedPlatforms);
        this.slots = (result && result.slots) || {};
      } catch (error) {
        this.slots = {};
        this.slotsError = (error && error.message) || "读取发布计划失败";
        this.$message.error(this.slotsError);
      } finally {
        this.slotsLoading = false;
      }
    },
    contentFor(code) {
      if (this.overrideEnabled[code] && this.overrides[code]) {
        return Object.assign(emptyContent(), this.shared, this.overrides[code]);
      }
      return this.shared;
    },
    tagsOf(content) {
      return String(content.tagsText || "")
        .split(/[,，\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean);
    },
    scheduledAtFor(code) {
      if (this.timeMode === "custom") return this.customTime || null;
      if (this.timeMode === "plan") {
        const slot = this.slots[code];
        if (!slot || !slot.date) return null;
        return `${slot.date} ${slot.remindTime || "09:30"}:00`;
      }
      return null;
    },
    sessionFor(account) {
      const partition = String(account.mmPartition || "").trim();
      if (partition.startsWith("persist:")) return { partition };
      const phone = String(account.mmPhone || "").trim();
      if (phone) return { phone };
      if (partition) return { phone: partition };
      return {};
    },
    validate() {
      if (!this.selectedAssets.length) return "请先选择素材";
      if (!this.selectedAccounts.length) return "请先选择发布账号";
      if (!this.publishablePlatforms.length) {
        return "所选账号走的是 AiToEarn 或暂未接入的平台，壳内暂不支持发布";
      }
      if (this.timeMode === "custom" && !this.customTime) return "请选择发布时间";
      if (this.timeMode === "plan") {
        const missing = this.selectedPlatforms.filter((code) => {
          const slot = this.slots[code];
          return !slot || !slot.date;
        });
        if (missing.length) {
          return (
            "这些平台排不出日期：" +
            missing.map((code) => platformLabel(code)).join("、") +
            "（未配置计划或已排满），请改用「指定时间」或先完善发布计划"
          );
        }
      }
      return "";
    },
    async submit() {
      const error = this.validate();
      if (error) {
        this.$message.warning(error);
        return;
      }

      this.submitting = true;
      this.results = [];
      this.progress = { done: 0, total: this.totalTasks };

      try {
        // 每个素材只签一次下载地址
        const previewMap = {};
        for (const asset of this.selectedAssets) {
          try {
            const result = await assetPreviewUrls([asset.id]);
            const row = ((result && result.items) || [])[0];
            previewMap[asset.id] = (row && row.fileUrl) || null;
          } catch (_) {
            previewMap[asset.id] = null;
          }
        }

        for (const asset of this.selectedAssets) {
          for (const account of this.selectedAccounts) {
            if (!this.canPublishWith(account)) continue;

            const code = account.platformCode;
            const content = this.contentFor(code);
            const title = String(content.title || asset.title || "").trim();
            const scheduledAt = this.scheduledAtFor(code);

            let record = null;
            try {
              record = await createPublishRecord({
                assetId: asset.id,
                platformCode: code,
                targetId: account.id,
                status: scheduledAt ? "scheduled" : "queued",
                title,
                description: content.description || null,
                tags: this.tagsOf(content),
                shortTitle: content.shortTitle || null,
                scheduledAt,
                request: { source: "dam-shell", platformAlias: MM_ALIAS[code] }
              });
            } catch (error) {
              this.results.push({
                assetTitle: asset.title,
                platformCode: code,
                accountName: account.accountName,
                success: false,
                message: "创建发布记录失败：" + ((error && error.message) || error)
              });
              this.progress.done += 1;
              continue;
            }

            const file = previewMap[asset.id];
            if (!file) {
              await updatePublishRecord(record.id, {
                status: "failed",
                error: "拿不到素材下载地址",
                bumpAttempts: false
              }).catch(() => {});
              this.results.push({
                assetTitle: asset.title,
                platformCode: code,
                accountName: account.accountName,
                success: false,
                message: "拿不到素材下载地址（可能是云端文件缺失或权限不足）"
              });
              this.progress.done += 1;
              continue;
            }

            const payload = Object.assign(
              {
                platform: MM_ALIAS[code],
                file,
                title,
                description: content.description || undefined,
                shortTitle: content.shortTitle || undefined,
                tags: this.tagsOf(content).join(" "),
                publishAt: scheduledAt || undefined
              },
              this.sessionFor(account)
            );

            const result = await publishToMatrixMedia(payload);
            const outcome = mapMatrixMediaOutcome(result, Boolean(scheduledAt));
            const data = (result && result.data) || {};

            await updatePublishRecord(record.id, {
              status: outcome.status,
              externalPostId: data.postId || data.externalPostId || null,
              externalUrl: data.url || data.externalUrl || null,
              mmRecordId: data.id || null,
              error: outcome.success ? null : outcome.message,
              response: data || null,
              publishedAt:
                outcome.status === "success" ? new Date().toISOString() : null,
              bumpAttempts: !outcome.success
            }).catch(() => {});

            this.results.push({
              assetTitle: asset.title,
              platformCode: code,
              accountName: account.accountName,
              success: outcome.success,
              message: outcome.message
            });
            this.progress.done += 1;
          }
        }

        if (this.successCount === this.results.length && this.results.length) {
          this.$message.success(`全部提交成功（${this.results.length} 条）`);
        } else if (this.results.length) {
          this.$message.warning(
            `完成：成功 ${this.successCount} 条，失败 ${this.results.length - this.successCount} 条`
          );
        }
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-publish {
  padding: 20px;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  &__title {
    font-size: 18px;
    font-weight: 600;
    color: $menuText;
  }

  &__sub {
    margin-top: 4px;
    font-size: 12px;
    color: $menuMuted;
  }

  &__alert {
    margin-bottom: 14px;
  }

  &__card {
    margin-bottom: 14px;
  }

  &__card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__step {
    font-size: 14px;
    font-weight: 600;
    color: $menuText;
  }

  &__count {
    font-size: 12px;
    color: $menuMuted;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }

  &__muted {
    color: $menuMuted;
    font-size: 12px;
  }

  &__warn {
    color: $dangerColor;
    font-size: 12px;
  }

  &__time {
    margin-top: 12px;
  }

  &__plan {
    margin-top: 12px;
  }

  &__plan-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 13px;
    color: $menuText;
  }

  &__submit {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 14px;
    margin-bottom: 14px;
  }

  &__summary {
    font-size: 12px;
    color: $menuMuted;
  }
}

.dam-platform {
  padding: 10px 12px;
  border: 1px solid $borderColor;
  border-radius: 8px;

  & + & {
    margin-top: 10px;
  }

  &__head {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__hint {
    font-size: 12px;
    color: $menuMuted;
  }

  &__accounts {
    margin-top: 6px;
    padding-left: 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
  }
}

.dam-content {
  &__switch {
    margin-bottom: 12px;
  }
}
</style>
