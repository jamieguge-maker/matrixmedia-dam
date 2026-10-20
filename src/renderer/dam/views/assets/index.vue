<template>
  <div class="dam-assets">
    <div class="dam-assets__header">
      <div>
        <div class="dam-assets__title">素材库</div>
        <div class="dam-assets__sub">{{ greeting }}</div>
      </div>
      <div class="dam-assets__actions">
        <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">
          刷新
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="errorText"
      class="dam-assets__alert"
      :title="errorText"
      type="error"
      :closable="false"
      show-icon
    >
      <el-button size="mini" @click="load">重试</el-button>
    </el-alert>

    <div class="dam-assets__stats">
      <div v-for="card in statCards" :key="card.key" class="dam-stat">
        <div class="dam-stat__value">{{ card.value }}</div>
        <div class="dam-stat__label">{{ card.label }}</div>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="items"
      class="dam-assets__table"
      size="small"
      border
      empty-text="暂无素材"
    >
      <el-table-column prop="title" label="素材" min-width="220" show-overflow-tooltip />
      <el-table-column label="板块" width="110">
        <template #default="{ row }">{{ sectionLabel(row.section) }}</template>
      </el-table-column>
      <el-table-column label="系列 / 名称" width="170" show-overflow-tooltip>
        <template #default="{ row }">{{ row.groupName || "-" }}</template>
      </el-table-column>
      <el-table-column label="品类 / 类型" width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ groupKind(row) }}</template>
      </el-table-column>
      <el-table-column label="大小" width="100">
        <template #default="{ row }">{{ formatBytes(row.fileSize) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="mini" :type="uploadStatusType(row.uploadStatus)">
            {{ uploadStatusLabel(row.uploadStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最近发布" width="150">
        <template #default="{ row }">{{ formatDateTime(row.lastPublishedAt) }}</template>
      </el-table-column>
      <el-table-column label="上传时间" width="150">
        <template #default="{ row }">
          {{ formatDateTime(row.uploadedAt || row.createdAt) }}
        </template>
      </el-table-column>
    </el-table>

    <div class="dam-assets__pager">
      <el-pagination
        background
        layout="total, prev, pager, next, sizes"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        :page-sizes="[20, 50, 100]"
        @current-change="onPageChange"
        @size-change="onSizeChange"
      />
    </div>
  </div>
</template>

<script>
import { api } from "../../api/client";
import { useDamSession } from "../../store/session";
import {
  formatBytes,
  formatDateTime,
  roleLabel,
  sectionLabel,
  uploadStatusLabel,
  uploadStatusType
} from "../../utils/format";

export default {
  name: "DamAssetsView",
  data() {
    return {
      session: useDamSession(),
      loading: false,
      errorText: "",
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      stats: {}
    };
  },
  computed: {
    greeting() {
      const user = this.session.state.user;
      if (!user) return "已连接 DAM 服务端";
      const parts = [user.displayName || user.username, roleLabel(user.role)];
      if (user.departmentName) parts.push(user.departmentName);
      return parts.filter(Boolean).join(" · ");
    },
    statCards() {
      const stats = this.stats || {};
      return [
        { key: "total", label: "素材总数", value: stats.total || 0 },
        { key: "stored", label: "已入库", value: stats.stored || 0 },
        { key: "unpublished", label: "尚未发布", value: stats.unpublished || 0 },
        { key: "recent", label: "近 7 天新增", value: stats.recent7d || 0 }
      ];
    }
  },
  created() {
    this.load();
  },
  methods: {
    sectionLabel,
    uploadStatusLabel,
    uploadStatusType,
    formatBytes,
    formatDateTime,
    groupKind(row) {
      const parts = [];
      if (row.categoryName) parts.push(row.categoryName);
      if (row.kindName) parts.push(row.kindName);
      if (!parts.length) return "-";
      return parts.join(" / ");
    },
    onPageChange(value) {
      this.page = value;
      this.load();
    },
    onSizeChange(value) {
      this.pageSize = value;
      this.page = 1;
      this.load();
    },
    async load() {
      this.loading = true;
      this.errorText = "";
      try {
        const params = new URLSearchParams();
        params.set("page", String(this.page));
        params.set("pageSize", String(this.pageSize));
        params.set("sortBy", "createdAt");
        params.set("sortOrder", "desc");

        const [list, stats] = await Promise.all([
          api.get("/assets?" + params.toString()),
          api.get("/assets/stats")
        ]);

        this.items = (list && list.items) || [];
        this.total = (list && list.total) || 0;
        this.stats = stats || {};
      } catch (error) {
        this.errorText = (error && error.message) || "加载素材失败";
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-assets {
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

  &__stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  &__table {
    width: 100%;
  }

  &__pager {
    margin-top: 14px;
    display: flex;
    justify-content: flex-end;
  }
}

.dam-stat {
  padding: 14px 16px;
  background: $cardBg;
  border: 1px solid $borderColor;
  border-radius: 8px;

  &__value {
    font-size: 22px;
    font-weight: 700;
    color: $menuText;
    line-height: 1.2;
  }

  &__label {
    margin-top: 4px;
    font-size: 12px;
    color: $menuMuted;
  }
}
</style>
