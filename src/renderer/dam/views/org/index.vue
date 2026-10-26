<template>
  <div class="dam-org">
    <div class="dam-org__header">
      <div class="dam-org__heading">
        <span class="dam-org__title">账号管理</span>
        <hint-tip :content="headerTip" placement="right" max-width="360px" />
      </div>
      <div class="dam-org__actions">
        <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">
          刷新
        </el-button>
        <el-button size="small" type="primary" icon="el-icon-plus" @click="openCreate">
          新建成员
        </el-button>
      </div>
    </div>

    <div class="dam-org__filters">
      <el-input
        v-model="keyword"
        class="dam-org__keyword"
        size="small"
        clearable
        placeholder="搜索用户名 / 姓名"
        prefix-icon="el-icon-search"
        @keyup.enter.native="load"
        @clear="load"
      />
      <el-select
        v-model="departmentId"
        class="dam-org__dept"
        size="small"
        clearable
        placeholder="全部部门"
        @change="load"
      >
        <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
      </el-select>
      <el-button size="small" type="primary" @click="load">查询</el-button>
      <el-button size="small" @click="reset">重置</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="users"
      class="dam-org__table"
      size="small"
      border
      empty-text="没有符合条件的成员"
    >
      <el-table-column prop="username" label="用户名" width="150" show-overflow-tooltip />
      <el-table-column prop="displayName" label="姓名" width="150" show-overflow-tooltip />
      <el-table-column label="角色" width="120">
        <template #default="{ row }">
          <el-tag size="mini" :type="row.isSuperAdmin ? 'danger' : 'info'">
            {{ row.isSuperAdmin ? "超级管理员" : roleLabel(row.role) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="部门" width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ row.departmentName || "未分配" }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag size="mini" :type="row.enabled ? 'success' : 'info'">
            {{ row.enabled ? "启用" : "停用" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最近登录" width="160">
        <template #default="{ row }">{{ formatDateTime(row.lastLoginAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" min-width="300">
        <template #default="{ row }">
          <el-button type="text" size="mini" :disabled="row.isSuperAdmin" @click="openEdit(row)">
            编辑
          </el-button>
          <el-button type="text" size="mini" :disabled="row.isSuperAdmin" @click="resetPassword(row)">
            重置密码
          </el-button>
          <el-button
            type="text"
            size="mini"
            :disabled="!canDisable(row)"
            @click="toggleEnabled(row)"
          >
            {{ row.enabled ? "停用" : "启用" }}
          </el-button>
          <el-button
            type="text"
            size="mini"
            class="dam-org__danger"
            :disabled="!canDelete(row)"
            @click="removeUser(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      :visible.sync="dialog.visible"
      :title="dialog.id ? '编辑成员' : '新建成员'"
      width="480px"
      append-to-body
    >
      <el-form label-width="96px" size="small">
        <el-form-item label="用户名">
          <el-input v-model="dialog.username" placeholder="登录用，建议英文 / 拼音" maxlength="64" />
          <hint-tip content="登录账号，创建后也可修改；不能与已有账号重名。" placement="right" />
        </el-form-item>

        <el-form-item label="姓名">
          <el-input v-model="dialog.displayName" placeholder="显示给同事看的名字" maxlength="64" />
        </el-form-item>

        <el-form-item label="角色">
          <el-select v-model="dialog.role" :disabled="dialog.id === myId" style="width: 100%">
            <el-option
              v-for="item in roleOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <hint-tip :content="roleTip" placement="right" max-width="360px" />
        </el-form-item>

        <el-form-item label="部门">
          <el-select
            v-model="dialog.departmentId"
            clearable
            placeholder="不分配 = 只能看到公共素材"
            style="width: 100%"
          >
            <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
          </el-select>
          <hint-tip
            content="部门决定能看到哪些素材：本部门 + 子部门的素材可见；未分配部门的素材属于公共素材，所有人可见。"
            placement="right"
            max-width="360px"
          />
        </el-form-item>

        <el-form-item v-if="dialog.id" label="启用">
          <el-switch v-model="dialog.enabled" :disabled="dialog.id === myId" />
          <hint-tip
            content="停用后立刻无法登录（服务端每个请求都会重新校验）；不用了就停用，删除不可恢复。"
            placement="right"
            max-width="360px"
          />
        </el-form-item>

        <el-form-item :label="dialog.id ? '新密码' : '初始密码'">
          <el-input
            v-model="dialog.password"
            type="password"
            show-password
            :placeholder="dialog.id ? '留空表示不修改' : '至少 8 位'"
          />
          <hint-tip
            content="至少 8 位。新建后请把用户名和初始密码告知本人，本人可在「DAM 设置」里自行修改。"
            placement="right"
            max-width="360px"
          />
        </el-form-item>
      </el-form>

      <span slot="footer">
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="dialog.saving" @click="save">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { useDamSession } from "../../store/session";
import {
  createOrgUser,
  deleteOrgUser,
  listDepartments,
  listOrgUsers,
  resetOrgUserPassword,
  updateOrgUser
} from "../../api/org";
import { formatDateTime, roleLabel } from "../../utils/format";
import HintTip from "../../components/HintTip.vue";

const ROLE_OPTIONS = [
  { value: "operator", label: "成员" },
  { value: "viewer", label: "只读" },
  { value: "deptadmin", label: "部门管理员" },
  { value: "admin", label: "管理员" }
];

/** 新建对话框的初始值 */
function emptyDialog() {
  return {
    visible: false,
    saving: false,
    id: null,
    username: "",
    displayName: "",
    role: "operator",
    /** 打开编辑时的角色，用来判断有没有改过（不传就不会被更新） */
    originalRole: "",
    departmentId: null,
    enabled: true,
    password: ""
  };
}

export default {
  name: "DamOrgView",
  components: { HintTip },
  data() {
    return {
      session: useDamSession(),
      departments: [],
      users: [],
      keyword: "",
      departmentId: null,
      loading: false,
      dialog: emptyDialog(),
      roleOptions: ROLE_OPTIONS,
      headerTip:
        "账号由管理员统一创建：新建成员后把用户名和初始密码告知本人。\n" +
        "部门决定能看到哪些素材；未分配部门的素材属于公共素材，所有人可见。\n" +
        "社媒账号不再按人分配：所有登录用户都能看到并发布库里已登记的账号。\n" +
        "离职请优先「停用」，删除不可恢复。",
      roleTip:
        "成员：上传素材、发布、看流量（默认）。\n" +
        "只读：只能看。\n" +
        "部门管理员：可管理部门内成员。\n" +
        "管理员：全部功能 + 账号管理。"
    };
  },
  computed: {
    me() {
      return this.session.state.user || {};
    },
    myId() {
      return this.me.id || null;
    }
  },
  created() {
    this.load();
  },
  methods: {
    roleLabel,
    formatDateTime,
    canDisable(row) {
      return row.id !== this.myId && !row.isSuperAdmin;
    },
    canDelete(row) {
      return row.id !== this.myId && !row.isSuperAdmin;
    },
    async load() {
      this.loading = true;
      try {
        const [departments, users] = await Promise.all([
          listDepartments().catch(() => []),
          listOrgUsers({
            keyword: String(this.keyword || "").trim() || undefined,
            departmentId: this.departmentId,
            includeSub: true
          })
        ]);
        this.departments = departments || [];
        this.users = users || [];
      } catch (error) {
        this.users = [];
        this.$message.error("读取成员失败：" + ((error && error.message) || error));
      } finally {
        this.loading = false;
      }
    },
    reset() {
      this.keyword = "";
      this.departmentId = null;
      this.load();
    },
    openCreate() {
      this.dialog = emptyDialog();
      this.dialog.departmentId = this.departmentId;
      this.dialog.visible = true;
    },
    openEdit(row) {
      this.dialog = {
        visible: true,
        saving: false,
        id: row.id,
        username: row.username,
        displayName: row.displayName,
        role: row.role,
        originalRole: row.role,
        departmentId: row.departmentId,
        enabled: row.enabled,
        password: ""
      };
    },
    async save() {
      const username = String(this.dialog.username || "").trim();
      const displayName = String(this.dialog.displayName || "").trim();
      const password = String(this.dialog.password || "");

      if (!username) {
        this.$message.warning("请填写用户名");
        return;
      }
      if (!displayName) {
        this.$message.warning("请填写姓名");
        return;
      }
      if (!this.dialog.id && !password) {
        this.$message.warning("请设置初始密码（至少 8 位）");
        return;
      }
      if (password && password.length < 8) {
        this.$message.warning("密码至少 8 位");
        return;
      }

      this.dialog.saving = true;
      try {
        if (this.dialog.id) {
          const payload = {
            username,
            displayName,
            departmentId: this.dialog.departmentId
          };
          if (this.dialog.id !== this.myId && this.dialog.role !== this.dialog.originalRole) {
            payload.role = this.dialog.role;
          }
          if (this.dialog.id !== this.myId) payload.enabled = this.dialog.enabled;
          if (password) payload.password = password;
          await updateOrgUser(this.dialog.id, payload);
        } else {
          await createOrgUser({
            username,
            displayName,
            role: this.dialog.role,
            departmentId: this.dialog.departmentId,
            password
          });
        }

        this.$message.success(
          this.dialog.id ? "成员已更新" : "成员已创建；社媒账号请在列表里点「社媒账号」分配"
        );
        this.dialog.visible = false;
        await this.load();
      } catch (error) {
        this.$message.error((error && error.message) || "保存失败");
      } finally {
        this.dialog.saving = false;
      }
    },
    async toggleEnabled(row) {
      const next = !row.enabled;
      try {
        await this.$confirm(
          next
            ? `确定启用「${row.displayName}」的账号吗？`
            : `停用后「${row.displayName}」将立刻无法登录，确定吗？`,
          next ? "启用账号" : "停用账号",
          { type: "warning", confirmButtonText: "确定", cancelButtonText: "取消" }
        );
      } catch (_) {
        return;
      }

      try {
        await updateOrgUser(row.id, { enabled: next });
        await this.load();
        this.$message.success(next ? "账号已启用" : "账号已停用");
      } catch (error) {
        this.$message.error((error && error.message) || "操作失败");
      }
    },
    async resetPassword(row) {
      let password = "";
      try {
        const result = await this.$prompt(`给「${row.displayName}」设置新密码`, "重置密码", {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          inputType: "password",
          inputPlaceholder: "至少 8 位",
          inputValidator: (value) => (value && value.length >= 8 ? true : "密码至少 8 位")
        });
        password = result.value;
      } catch (_) {
        return;
      }

      try {
        await resetOrgUserPassword(row.id, password);
        this.$message.success("密码已重置，请告知本人");
      } catch (error) {
        this.$message.error((error && error.message) || "重置失败");
      }
    },
    async removeUser(row) {
      try {
        await this.$confirm(
          `确定删除账号「${row.displayName}（${row.username}）」吗？删除不可恢复，平时停用即可。`,
          "删除账号",
          { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
        );
      } catch (_) {
        return;
      }

      try {
        await deleteOrgUser(row.id);
        await this.load();
        this.$message.success("账号已删除");
      } catch (error) {
        this.$message.error((error && error.message) || "删除失败");
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-org {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 20px 24px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  &__heading {
    display: flex;
    align-items: center;
  }

  &__title {
    font-size: 18px;
    font-weight: 700;
    color: $menuText;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  &__filters {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  &__keyword {
    width: 240px;
  }

  &__dept {
    width: 180px;
  }

  &__danger {
    color: $dangerColor;
  }
}
</style>
