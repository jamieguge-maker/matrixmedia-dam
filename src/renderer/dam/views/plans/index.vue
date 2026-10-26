<template>
  <div class="dam-plans">
    <div class="dam-plans__header">
      <div>
        <div class="dam-plans__heading">
          <span class="dam-plans__title">发布计划</span>
          <hint-tip
            :content="isAdmin
              ? '查看子账号为自己添加的社媒账号制定的发布节奏，以及账号本周已发布数量。'
              : '为自己添加的社媒账号设置发布频率；管理员可查看计划和完成进度。'"
            placement="right"
            max-width="380px"
          />
        </div>
        <div class="dam-plans__subtitle">本周 {{ weekRange }} · 按已发布记录统计完成数</div>
      </div>
      <div class="dam-plans__actions">
        <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
        <el-button size="small" type="primary" icon="el-icon-plus" @click="openCreate">新建计划</el-button>
      </div>
    </div>

    <div v-if="isAdmin" class="dam-plans__filters">
      <el-select v-model="filterUserId" size="small" clearable placeholder="全部子账号" @change="noop">
        <el-option v-for="user in users" :key="user.id" :label="userName(user.id)" :value="user.id" />
      </el-select>
      <el-select v-model="filterPlatform" size="small" clearable placeholder="全部平台">
        <el-option v-for="item in platformOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <span class="dam-plans__result-count">{{ filteredPlans.length }} 个计划</span>
    </div>

    <el-table
      v-loading="loading"
      :data="filteredPlans"
      class="dam-plans__table"
      size="small"
      border
      empty-text="还没有发布计划，先为已添加的社媒账号新建一个计划"
    >
      <el-table-column v-if="isAdmin" label="子账号" width="135" show-overflow-tooltip>
        <template #default="{ row }">{{ userName(planOwnerId(row)) }}</template>
      </el-table-column>
      <el-table-column label="平台 / 账号" min-width="210" show-overflow-tooltip>
        <template #default="{ row }">
          <div>{{ platformLabel(row.platformCode) }}</div>
          <div class="dam-plans__muted">{{ targetName(row.targetId) }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="计划名称" min-width="160" show-overflow-tooltip />
      <el-table-column label="发布频率" width="180">
        <template #default="{ row }">{{ cadenceText(row) }}</template>
      </el-table-column>
      <el-table-column label="本周完成" width="210">
        <template #default="{ row }">
          <template v-if="row.cadence === 'weekly'">
            <el-progress
              :percentage="progressPercent(row)"
              :status="progressPercent(row) >= 100 ? 'success' : undefined"
              :stroke-width="10"
            />
            <div class="dam-plans__progress-text">
              {{ completedFor(row) }} / {{ weeklyQuota(row) }} 条
              <span v-if="completedFor(row) > weeklyQuota(row)" class="dam-plans__muted">（超额）</span>
            </div>
          </template>
          <span v-else>{{ completedFor(row) }} 条已发布</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="82" align="center">
        <template #default="{ row }">
          <el-tag size="mini" :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column v-if="!isAdmin" label="操作" width="128" fixed="right">
        <template #default="{ row }">
          <el-button type="text" size="mini" @click="openEdit(row)">编辑</el-button>
          <el-button type="text" size="mini" class="dam-plans__danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <p v-if="!loading" class="dam-plans__foot">
      本周已发布数量按成功发布和人工确认的记录计算；排队中、定时中和失败记录不计入完成数。
    </p>

    <el-dialog
      :visible.sync="dialog.visible"
      :title="dialog.id ? '编辑发布计划' : '新建发布计划'"
      width="560px"
      append-to-body
      @closed="resetDialog"
    >
      <el-form label-width="100px" size="small">
        <el-form-item label="社媒账号" required>
          <el-select v-model="dialog.targetId" filterable placeholder="选择自己添加的社媒账号" style="width: 100%">
            <el-option v-for="target in availableTargets" :key="target.id" :label="targetLabel(target)" :value="target.id" />
          </el-select>
          <div v-if="!availableTargets.length" class="dam-plans__form-hint">
            {{ noTargetsHint }}
          </div>
        </el-form-item>
        <el-form-item label="计划名称" required>
          <el-input v-model="dialog.name" maxlength="80" placeholder="例如：小红书每周 3 条" />
        </el-form-item>
        <el-form-item label="周期频率">
          <el-radio-group v-model="dialog.cadence">
            <el-radio-button label="daily">每天</el-radio-button>
            <el-radio-button label="weekly">每周</el-radio-button>
            <el-radio-button label="monthly">每月</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="dialog.cadence === 'weekly'" label="每周发布">
          <el-input-number v-model="dialog.quotaPerPeriod" :min="1" :max="100" />
          <span class="dam-plans__inline-unit">条</span>
        </el-form-item>
        <el-form-item v-if="dialog.cadence === 'weekly'" label="排期日">
          <el-checkbox-group v-model="dialog.weekdays">
            <el-checkbox v-for="day in weekdays" :key="day.value" :label="day.value">{{ day.label }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item v-if="dialog.cadence === 'daily'" label="每天发布">
          <el-input-number v-model="dialog.quotaPerPeriod" :min="1" :max="100" />
          <span class="dam-plans__inline-unit">条</span>
        </el-form-item>
        <el-form-item v-if="dialog.cadence === 'monthly'" label="每月发布">
          <el-input-number v-model="dialog.quotaPerPeriod" :min="1" :max="100" />
          <span class="dam-plans__inline-unit">条 · 每月</span>
          <el-input-number v-model="dialog.dayOfMonth" :min="1" :max="31" class="dam-plans__day" />
          <span class="dam-plans__inline-unit">号统计</span>
        </el-form-item>
        <el-form-item label="提醒时间">
          <el-time-picker v-model="dialog.remindTime" format="HH:mm" value-format="HH:mm" placeholder="09:30" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="dialog.enabled" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="dialog.remark" type="textarea" :rows="2" maxlength="300" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="!availableTargets.length" @click="save">保存计划</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { useDamSession } from "../../store/session";
import { deletePlan, listPlans, listPublishRecords, listTargets, savePlan } from "../../api/publish";
import { listUsers } from "../../api/admin";
import HintTip from "../../components/HintTip.vue";
import { platformLabel } from "../../utils/format";
import { loadLocalAccountKeys, missingLocalAccounts, syncLocalAccountsToServer } from "../../utils/localAccounts";

const WEEKDAYS = [
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
  { value: 0, label: "周日" }
];

function getWeekRange() {
  const now = new Date();
  const day = now.getDay() || 7;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const fmt = (date) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  return { startDate: fmt(start), endDate: fmt(end) };
}

function emptyDialog() {
  return {
    visible: false,
    id: null,
    targetId: null,
    name: "",
    cadence: "weekly",
    quotaPerPeriod: 3,
    weekdays: [1, 2, 3, 4, 5],
    dayOfMonth: 1,
    remindTime: "09:30",
    enabled: true,
    remark: ""
  };
}

function recordRows(result) {
  if (Array.isArray(result)) return result;
  return (result && (result.items || result.records || result.rows)) || [];
}

async function loadWeekRecords(startDate, endDate) {
  const pageSize = 200;
  const first = await listPublishRecords({ startDate, endDate, page: 1, pageSize });
  const rows = recordRows(first).slice();
  if (Array.isArray(first)) return rows;
  let page = 1;
  let pageRows = recordRows(first);
  while (pageRows.length === pageSize && page < 10) {
    page += 1;
    pageRows = recordRows(await listPublishRecords({ startDate, endDate, page, pageSize }));
    rows.push(...pageRows);
  }
  return rows;
}

export default {
  name: "DamPlansView",
  components: { HintTip },
  data() {
    return {
      session: useDamSession(),
      loading: false,
      saving: false,
      plans: [],
      targets: [],
      localMissingCount: 0,
      users: [],
      publishedCounts: {},
      filterUserId: null,
      filterPlatform: "",
      week: getWeekRange(),
      dialog: emptyDialog(),
      weekdays: WEEKDAYS
    };
  },
  computed: {
    me() {
      return this.session.state.user || {};
    },
    isAdmin() {
      return Boolean(this.me.isSuperAdmin) || this.me.role === "admin";
    },
    weekRange() {
      return `${this.week.startDate} 至 ${this.week.endDate}`;
    },
    availableTargets() {
      const myId = Number(this.me.id);
      return this.targets.filter((target) => {
        if (target.enabled === false) return false;
        const ownerId = target.createdBy || target.createdById || target.userId || target.ownerUserId;
        return this.isAdmin || Number(ownerId) === myId;
      });
    },
    noTargetsHint() {
      if (this.localMissingCount) {
        return `检测到本机「媒体平台管理」已有 ${this.localMissingCount} 个账号，但尚未同步到当前发布账号列表。请刷新；若仍未出现，请联系管理员检查账号登记权限。`;
      }
      return "暂无可选账号。请先在「媒体平台管理」添加并登录社媒账号，再刷新此页。";
    },
    platformOptions() {
      const codes = [...new Set(this.plans.map((plan) => plan.platformCode).filter(Boolean))];
      return codes.map((value) => ({ value, label: platformLabel(value) }));
    },
    filteredPlans() {
      return this.plans.filter((plan) => {
        if (!this.isAdmin && Number(this.planOwnerId(plan)) !== Number(this.me.id)) return false;
        if (this.filterPlatform && plan.platformCode !== this.filterPlatform) return false;
        if (this.filterUserId && Number(this.planOwnerId(plan)) !== Number(this.filterUserId)) return false;
        return true;
      });
    }
  },
  created() {
    this.load();
  },
  methods: {
    platformLabel,
    noop() {},
    targetById(id) {
      return this.targets.find((target) => Number(target.id) === Number(id));
    },
    targetName(id) {
      const target = this.targetById(id);
      return target ? target.accountName || target.name || `账号 #${id}` : `账号 #${id || "—"}`;
    },
    targetLabel(target) {
      return `${platformLabel(target.platformCode)} · ${target.accountName || target.name || `账号 #${target.id}`}`;
    },
    planOwnerId(plan) {
      const target = this.targetById(plan.targetId);
      return plan.createdBy || plan.userId || plan.ownerUserId ||
        (target && (target.createdBy || target.createdById || target.userId || target.ownerUserId)) || null;
    },
    userName(id) {
      if (!id) return "未识别账号";
      const user = this.users.find((item) => Number(item.id) === Number(id));
      return user ? user.displayName || user.username : `成员 #${id}`;
    },
    completedFor(plan) {
      return Number(this.publishedCounts[plan.targetId] || 0);
    },
    weeklyQuota(plan) {
      return Math.max(0, Number(plan.quotaPerPeriod) || 0);
    },
    progressPercent(plan) {
      const quota = this.weeklyQuota(plan);
      return quota ? Math.min(100, Math.round((this.completedFor(plan) / quota) * 100)) : 0;
    },
    cadenceText(plan) {
      const quota = Number(plan.quotaPerPeriod) || 1;
      if (plan.cadence === "daily") return `每天 ${quota} 条`;
      if (plan.cadence === "monthly") return `每月 ${plan.dayOfMonth || 1} 号 · ${quota} 条`;
      const days = (plan.weekdays || []).map((value) => {
        const day = this.weekdays.find((item) => item.value === Number(value));
        return day && day.label;
      }).filter(Boolean);
      return `每周 ${quota} 条${days.length ? ` · ${days.join("、")}` : ""}`;
    },
    async load() {
      this.loading = true;
      try {
        const [plansResult, initialTargetsResult, usersResult, recordsResult, localKeys] = await Promise.all([
          listPlans(),
          listTargets({ includeDisabled: true }),
          this.isAdmin ? listUsers().catch(() => []) : Promise.resolve([]),
          loadWeekRecords(this.week.startDate, this.week.endDate),
          loadLocalAccountKeys()
        ]);
        let targetsResult = initialTargetsResult;
        const initialTargets = Array.isArray(initialTargetsResult)
          ? initialTargetsResult
          : (initialTargetsResult && (initialTargetsResult.items || initialTargetsResult.targets)) || [];
        const created = await syncLocalAccountsToServer(initialTargets, localKeys);
        if (created) targetsResult = await listTargets({ includeDisabled: true });
        this.plans = Array.isArray(plansResult) ? plansResult : (plansResult && (plansResult.items || plansResult.plans)) || [];
        this.targets = Array.isArray(targetsResult) ? targetsResult : (targetsResult && (targetsResult.items || targetsResult.targets)) || [];
        this.localMissingCount = missingLocalAccounts(this.targets, localKeys).length;
        this.users = usersResult || [];
        const records = recordRows(recordsResult);
        const counts = {};
        records.forEach((record) => {
          if (!["success", "manual_done"].includes(record.status) || !record.targetId) return;
          const targetId = String(record.targetId);
          counts[targetId] = (counts[targetId] || 0) + 1;
        });
        this.publishedCounts = counts;
      } catch (error) {
        this.$message.error("读取发布计划失败：" + ((error && error.message) || error));
      } finally {
        this.loading = false;
      }
    },
    openCreate() {
      this.dialog = emptyDialog();
      this.dialog.targetId = this.availableTargets.length ? this.availableTargets[0].id : null;
      this.dialog.visible = true;
    },
    openEdit(plan) {
      this.dialog = Object.assign(emptyDialog(), {
        visible: true,
        id: plan.id,
        targetId: plan.targetId,
        name: plan.name || "",
        cadence: plan.cadence || "weekly",
        quotaPerPeriod: Number(plan.quotaPerPeriod) || 1,
        weekdays: Array.isArray(plan.weekdays) ? plan.weekdays.slice() : [1, 2, 3, 4, 5],
        dayOfMonth: Number(plan.dayOfMonth) || 1,
        remindTime: plan.remindTime || "09:30",
        enabled: plan.enabled !== false,
        remark: plan.remark || ""
      });
    },
    resetDialog() {
      this.dialog = emptyDialog();
    },
    async save() {
      const target = this.targetById(this.dialog.targetId);
      if (!target) return this.$message.warning("请选择社媒账号");
      if (!String(this.dialog.name || "").trim()) return this.$message.warning("请填写计划名称");
      if (this.dialog.cadence === "weekly" && !(this.dialog.weekdays || []).length) {
        return this.$message.warning("每周计划至少选择一个排期日");
      }
      this.saving = true;
      try {
        await savePlan({
          id: this.dialog.id,
          name: String(this.dialog.name).trim(),
          targetId: target.id,
          platformCode: target.platformCode,
          cadence: this.dialog.cadence,
          quotaPerPeriod: Number(this.dialog.quotaPerPeriod) || 1,
          dayOfMonth: this.dialog.cadence === "monthly" ? Number(this.dialog.dayOfMonth) || 1 : null,
          weekdays: this.dialog.cadence === "weekly" ? this.dialog.weekdays.slice() : [],
          enabled: Boolean(this.dialog.enabled),
          remindTime: this.dialog.remindTime || "09:30",
          remark: String(this.dialog.remark || "").trim() || null
        });
        this.dialog.visible = false;
        this.$message.success("发布计划已保存");
        await this.load();
      } catch (error) {
        this.$message.error("保存失败：" + ((error && error.message) || error));
      } finally {
        this.saving = false;
      }
    },
    async remove(plan) {
      try {
        await this.$confirm(`确定删除「${plan.name}」吗？历史发布记录不会删除。`, "删除发布计划", {
          type: "warning",
          confirmButtonText: "删除",
          cancelButtonText: "取消"
        });
      } catch (_) {
        return;
      }
      try {
        await deletePlan(plan.id);
        this.$message.success("计划已删除");
        await this.load();
      } catch (error) {
        this.$message.error("删除失败：" + ((error && error.message) || error));
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-plans {
  padding: 20px;
    color: $menuText;

  &__header,
  &__heading,
  &__actions,
  &__filters {
    display: flex;
    align-items: center;
  }

  &__header {
    justify-content: space-between;
    margin-bottom: 16px;
  }

  &__heading {
    gap: 8px;
  }

  &__title {
    font-size: 19px;
    font-weight: 650;
  }

  &__subtitle,
  &__muted,
  &__foot,
  &__form-hint {
    color: $menuMuted;
    font-size: 12px;
  }

  &__subtitle {
    margin-top: 5px;
  }

  &__actions,
  &__filters {
    gap: 8px;
  }

  &__filters {
    margin-bottom: 12px;
  }

  &__filters .el-select {
    width: 180px;
  }

  &__result-count {
    margin-left: auto;
    color: $menuMuted;
    font-size: 12px;
  }

  &__table {
    width: 100%;
  }

  &__progress-text {
    margin-top: 4px;
    text-align: right;
    color: $menuMuted;
    font-size: 12px;
  }

  &__foot {
    margin: 10px 0 0;
  }

  &__form-hint {
    margin-top: 5px;
    line-height: 1.5;
  }

  &__inline-unit {
    margin: 0 8px;
    color: $menuMuted;
  }

  &__day {
    width: 92px;
  }

  &__danger {
    color: $dangerColor;
  }
}

@media (max-width: 800px) {
  .dam-plans {
    padding: 14px;
    &__header { align-items: flex-start; gap: 12px; }
    &__filters { flex-wrap: wrap; }
    &__filters .el-select { flex: 1; min-width: 130px; }
  }
}
</style>
