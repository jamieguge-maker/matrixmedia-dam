<template>
  <div class="dam-targets">
    <div class="dam-targets__header">
      <div class="dam-targets__heading">
        <span class="dam-targets__title">社媒账号</span>
        <hint-tip :content="tip" placement="right" max-width="380px" />
      </div>
      <div class="dam-targets__actions">
        <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">
          刷新
        </el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="rows"
      class="dam-targets__table"
      size="small"
      border
      empty-text="还没有登记任何社媒账号"
    >
      <el-table-column label="平台" width="120">
        <template #default="{ row }">{{ platformLabel(row.platformCode) }}</template>
      </el-table-column>
      <el-table-column prop="accountName" label="账号" min-width="160" show-overflow-tooltip />
      <el-table-column label="分组" width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ row.mmPhone || row.mmPartition || "—" }}</template>
      </el-table-column>
      <el-table-column label="通道" width="110">
        <template #default="{ row }">
          <el-tag size="mini" :type="row.channel === 'aitoearn' ? 'warning' : 'info'">
            {{ row.channel === "aitoearn" ? "AiToEarn" : "矩媒" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="添加人" width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ userName(row.createdBy) }}</template>
      </el-table-column>
      <el-table-column label="添加时间" width="160">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag size="mini" :type="row.enabled ? 'success' : 'info'">
            {{ row.enabled ? "启用" : "停用" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button type="text" size="mini" @click="toggle(row)">
            {{ row.enabled ? "停用" : "启用" }}
          </el-button>
          <el-button type="text" size="mini" class="dam-targets__danger" @click="remove(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <p class="dam-targets__foot">
      共 {{ rows.length }} 个账号（含停用）。停用的账号不会出现在「发布中心」，但历史发布记录仍保留。
    </p>
  </div>
</template>

<script>
import { listTargets } from "../../api/publish";
import { deleteTarget, listUsers, updateTarget } from "../../api/admin";
import { formatDateTime, platformLabel } from "../../utils/format";
import HintTip from "../../components/HintTip.vue";

export default {
  name: "DamTargetsView",
  components: { HintTip },
  data() {
    return {
      loading: false,
      rows: [],
      users: [],
      tip:
        "这里汇总所有客户端登记过的社媒账号（谁在「媒体平台管理」里添加，就会自动同步到这张表）。\n" +
        "停用 = 发布中心看不到；删除 = 从库里移除（历史发布记录保留）。"
    };
  },
  created() {
    this.load();
  },
  methods: {
    platformLabel,
    formatDateTime,
    userName(id) {
      if (!id) return "—";
      const hit = this.users.find((item) => item.id === id);
      return hit ? hit.displayName || hit.username : `#${id}`;
    },
    async load() {
      this.loading = true;
      try {
        const [targets, users] = await Promise.all([
          listTargets({ includeDisabled: true }).catch(() => []),
          listUsers().catch(() => [])
        ]);
        this.rows = targets || [];
        this.users = users || [];
      } catch (error) {
        this.rows = [];
        this.$message.error("读取社媒账号失败：" + ((error && error.message) || error));
      } finally {
        this.loading = false;
      }
    },
    async toggle(row) {
      const next = !row.enabled;
      try {
        await this.$confirm(
          next
            ? `启用「${row.accountName}」后，所有人在发布中心都能选到它。`
            : `停用「${row.accountName}」后，发布中心不再显示它。`,
          next ? "启用账号" : "停用账号",
          { type: "warning", confirmButtonText: "确定", cancelButtonText: "取消" }
        );
      } catch (_) {
        return;
      }
      try {
        await updateTarget(row.id, { enabled: next });
        await this.load();
        this.$message.success(next ? "已启用" : "已停用");
      } catch (error) {
        this.$message.error("操作失败：" + ((error && error.message) || error));
      }
    },
    async remove(row) {
      try {
        await this.$confirm(
          `删除「${row.accountName}」后，发布中心不再显示；历史发布记录会保留。确定删除？`,
          "删除社媒账号",
          { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
        );
      } catch (_) {
        return;
      }
      try {
        await deleteTarget(row.id);
        await this.load();
        this.$message.success("已删除");
      } catch (error) {
        this.$message.error("删除失败：" + ((error && error.message) || error));
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-targets {
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

  &__danger {
    color: $dangerColor;
  }

  &__foot {
    margin: 12px 0 0;
    font-size: 12px;
    color: $menuMuted;
  }
}
</style>
