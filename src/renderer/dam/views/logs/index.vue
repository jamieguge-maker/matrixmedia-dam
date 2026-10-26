<template>
  <div class="dam-logs">
    <div class="dam-logs__header">
      <div class="dam-logs__heading">
        <span class="dam-logs__title">操作记录</span>
        <hint-tip
          content="子账号的登录、上传、发布、删除等动作都会落库；这里按时间倒序展示，可按人和动作筛。"
          placement="right"
          max-width="380px"
        />
      </div>
      <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">
        刷新
      </el-button>
    </div>

    <div class="dam-logs__filters">
      <el-input
        v-model="filters.username"
        size="small"
        clearable
        placeholder="姓名或登录名"
        prefix-icon="el-icon-search"
        class="dam-logs__kw"
        @keyup.enter.native="search"
        @clear="search"
      />
      <el-select
        v-model="filters.action"
        size="small"
        clearable
        placeholder="全部动作"
        class="dam-logs__action"
        @change="search"
      >
        <el-option v-for="item in actionOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-date-picker
        v-model="filters.startDate"
        type="date"
        size="small"
        value-format="yyyy-MM-dd"
        placeholder="开始日期"
        class="dam-logs__date"
      />
      <el-date-picker
        v-model="filters.endDate"
        type="date"
        size="small"
        value-format="yyyy-MM-dd"
        placeholder="结束日期"
        class="dam-logs__date"
      />
      <el-button size="small" type="primary" @click="search">查询</el-button>
      <el-button size="small" @click="reset">重置</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="rows"
      class="dam-logs__table"
      size="small"
      border
      empty-text="没有符合条件的操作记录"
    >
      <el-table-column label="时间" width="160">
        <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="操作人" width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ row.display_name || row.username || "—" }}</template>
      </el-table-column>
      <el-table-column label="动作" width="150">
        <template #default="{ row }">
          <el-tag size="mini" :type="actionType(row.action)">{{ actionLabel(row.action) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="对象" width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ entityLabel(row.entity) }}{{ row.entity_id ? " #" + row.entity_id : "" }}</template>
      </el-table-column>
      <el-table-column label="详情" min-width="260" show-overflow-tooltip>
        <template #default="{ row }">{{ detailText(row.detail) }}</template>
      </el-table-column>
      <el-table-column label="IP" width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ row.ip || "—" }}</template>
      </el-table-column>
    </el-table>

    <div class="dam-logs__pager">
      <el-pagination
        background
        layout="total, prev, pager, next, sizes"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[20, 50, 100]"
        @current-change="onPageChange"
        @size-change="onSizeChange"
      />
    </div>
  </div>
</template>

<script>
import { listAuditLogs } from "../../api/admin";
import { formatDateTime } from "../../utils/format";
import HintTip from "../../components/HintTip.vue";

/** 动作 → 中文。没列到的直接显示原值，避免新动作被隐藏 */
const ACTION_LABEL = {
  login: "登录",
  upload_asset: "上传素材",
  trash_asset: "移入回收站",
  purge_assets: "彻底删除素材",
  restore_assets: "恢复素材",
  replace_asset_file: "替换素材文件",
  wps_upload: "WPS 上传",
  wps_delete_file: "WPS 删除文件",
  create_target: "添加社媒",
  update_target: "修改社媒",
  delete_target: "删除社媒",
  assign_target_users: "分配负责人",
  create_category: "新建分类",
  update_category: "修改分类",
  delete_category: "删除分类",
  create_plan: "新建计划",
  update_plan: "修改计划",
  delete_plan: "删除计划",
  publish_record: "发布",
  retry_publish: "重试发布",
  create_user: "新建成员",
  update_user: "修改成员",
  delete_user: "删除成员",
  reset_password: "重置密码",
  change_password: "修改密码",
  update_settings: "修改设置",
  mm_relogin: "重新登录社媒",
  update_client_version: "发布升级策略"
};

const ENTITY_LABEL = {
  asset: "素材",
  publish_target: "社媒账号",
  publish_record: "发布记录",
  publish_plan: "发布计划",
  category: "分类",
  user: "成员",
  department: "部门",
  settings: "设置"
};

/** 详情是 JSONB，挑几个常见键拼成人能读的一句话 */
function summarize(detail) {
  if (!detail || typeof detail !== "object") return "";
  const parts = [];
  const pick = (key, label) => {
    const value = detail[key];
    if (value === undefined || value === null || value === "") return;
    if (typeof value === "object") return;
    parts.push(`${label}：${value}`);
  };
  pick("accountName", "账号");
  pick("platformCode", "平台");
  pick("username", "用户");
  pick("displayName", "姓名");
  pick("title", "标题");
  pick("name", "名称");
  pick("status", "状态");
  pick("message", "说明");
  pick("minVersion", "最低版本");
  if (!parts.length) {
    try {
      return JSON.stringify(detail);
    } catch (_) {
      return "";
    }
  }
  return parts.join(" · ");
}

export default {
  name: "DamLogsView",
  components: { HintTip },
  data() {
    return {
      loading: false,
      rows: [],
      total: 0,
      page: 1,
      pageSize: 20,
      filters: { username: "", action: "", startDate: "", endDate: "" },
      actionOptions: Object.keys(ACTION_LABEL).map((value) => ({
        value,
        label: ACTION_LABEL[value]
      }))
    };
  },
  created() {
    this.load();
  },
  methods: {
    formatDateTime,
    actionLabel(action) {
      return ACTION_LABEL[action] || action || "—";
    },
    actionType(action) {
      if (/delete|purge|trash/.test(String(action || ""))) return "danger";
      if (/create|upload/.test(String(action || ""))) return "success";
      if (/login/.test(String(action || ""))) return "info";
      return "";
    },
    entityLabel(entity) {
      return ENTITY_LABEL[entity] || entity || "—";
    },
    detailText(detail) {
      const text = summarize(detail);
      return text.length > 200 ? text.slice(0, 200) + "…" : text;
    },
    async load() {
      this.loading = true;
      try {
        const result = await listAuditLogs({
          username: this.filters.username.trim() || undefined,
          action: this.filters.action || undefined,
          startDate: this.filters.startDate || undefined,
          endDate: this.filters.endDate || undefined,
          page: this.page,
          pageSize: this.pageSize
        });
        this.rows = (result && result.items) || [];
        this.total = (result && result.total) || 0;
      } catch (error) {
        this.rows = [];
        this.total = 0;
        this.$message.error("读取操作记录失败：" + ((error && error.message) || error));
      } finally {
        this.loading = false;
      }
    },
    search() {
      this.page = 1;
      this.load();
    },
    reset() {
      this.filters = { username: "", action: "", startDate: "", endDate: "" };
      this.page = 1;
      this.load();
    },
    onPageChange(page) {
      this.page = page;
      this.load();
    },
    onSizeChange(size) {
      this.pageSize = size;
      this.page = 1;
      this.load();
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-logs {
  padding: 20px 24px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  &__heading {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__title {
    font-size: 17px;
    font-weight: 600;
    color: $menuText;
  }

  &__filters {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__kw {
    width: 200px;
  }

  &__action {
    width: 160px;
  }

  &__date {
    width: 150px;
  }

  &__pager {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
