<template>
  <div class="dam-profile">
    <div class="dam-profile__header">
      <div class="dam-profile__heading">
        <span class="dam-profile__title">个人设置</span>
        <hint-tip
          content="这里只能改自己的资料与密码；账号、角色、部门由管理员在「账号管理」里分配。"
          placement="right"
          max-width="360px"
        />
      </div>
      <el-button size="small" icon="el-icon-back" @click="go('/dam/assets')">返回素材库</el-button>
    </div>

    <el-card shadow="never" class="dam-profile__card">
      <div slot="header" class="dam-profile__card-head">
        <span class="dam-profile__card-title">账号信息</span>
        <el-tag size="mini" :type="me.enabled === false ? 'info' : 'success'">
          {{ me.enabled === false ? "已停用" : "已登录" }}
        </el-tag>
      </div>

      <el-form label-width="96px" size="small" class="dam-profile__form">
        <el-form-item label="用户名">
          <el-input v-model="profileForm.username" maxlength="64" />
          <hint-tip content="登录用的账号；改完请记住新用户名。" placement="right" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="profileForm.displayName" maxlength="64" />
        </el-form-item>
        <el-form-item label="角色">
          <span class="dam-profile__value">{{ roleText }}</span>
        </el-form-item>
        <el-form-item label="部门">
          <span class="dam-profile__value">{{ me.departmentName || "未分配" }}</span>
        </el-form-item>
        <el-form-item label="最近登录">
          <span class="dam-profile__value">{{ formatDateTime(me.lastLoginAt) }}</span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="savingProfile" @click="saveProfile">保存资料</el-button>
          <el-button @click="reload">重新读取</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="dam-profile__card">
      <div slot="header" class="dam-profile__card-head">
        <span class="dam-profile__card-title">登录密码</span>
        <el-tag size="mini" :type="me.hasPassword ? 'success' : 'info'">
          {{ me.hasPassword ? "已设置" : "未设置" }}
        </el-tag>
        <hint-tip
          content="至少 8 位。改完下次登录用新密码，当前登录状态不受影响。"
          placement="right"
        />
      </div>

      <el-form label-width="96px" size="small" class="dam-profile__form">
        <el-form-item v-if="me.hasPassword" label="原密码">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item :label="me.hasPassword ? '新密码' : '设置密码'">
          <el-input v-model="passwordForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
        </el-form-item>
        <el-form-item>
          <el-button :loading="savingPassword" @click="savePassword">
            {{ me.hasPassword ? "修改密码" : "设置密码" }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="dam-profile__card">
      <div slot="header" class="dam-profile__card-head">
        <span class="dam-profile__card-title">登录状态</span>
      </div>
      <div class="dam-profile__row">
        <span class="dam-profile__muted">服务端：{{ session.state.baseUrl || "未配置" }}</span>
        <el-button size="small" @click="logout">退出登录</el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
import { useDamSession } from "../../store/session";
import { changeMyPassword, myProfile, updateMyProfile } from "../../api/profile";
import { formatDateTime, roleLabel } from "../../utils/format";
import HintTip from "../../components/HintTip.vue";

export default {
  name: "DamProfileView",
  components: { HintTip },
  data() {
    return {
      session: useDamSession(),
      me: {},
      profileForm: { username: "", displayName: "" },
      passwordForm: { oldPassword: "", newPassword: "", confirmPassword: "" },
      savingProfile: false,
      savingPassword: false
    };
  },
  computed: {
    roleText() {
      if (this.me.isSuperAdmin) return "超级管理员";
      return roleLabel(this.me.role);
    }
  },
  created() {
    this.reload();
  },
  methods: {
    formatDateTime,
    go(path) {
      if (this.$route.path !== path) this.$router.push(path).catch(() => {});
    },
    async reload() {
      try {
        const profile = await myProfile();
        this.me = profile || {};
        this.profileForm.username = this.me.username || "";
        this.profileForm.displayName = this.me.displayName || "";
        // 同步给左侧导航的底部信息
        if (this.session.state.user) {
          this.session.state.user = Object.assign({}, this.session.state.user, this.me);
        }
      } catch (error) {
        // 401 会被统一清会话并跳登录页，这里只兜网络错误
        if (!(error && error.status === 401)) {
          this.$message.error("读取账号信息失败：" + ((error && error.message) || error));
        }
      }
    },
    async saveProfile() {
      const username = String(this.profileForm.username || "").trim();
      const displayName = String(this.profileForm.displayName || "").trim();
      if (!username) {
        this.$message.warning("请填写用户名");
        return;
      }
      if (!displayName) {
        this.$message.warning("请填写姓名");
        return;
      }

      this.savingProfile = true;
      try {
        const updated = await updateMyProfile({ username, displayName });
        this.me = Object.assign({}, this.me, updated || {});
        if (this.session.state.user) {
          this.session.state.user = Object.assign({}, this.session.state.user, this.me);
        }
        this.$message.success("资料已保存");
      } catch (error) {
        this.$message.error((error && error.message) || "保存失败");
      } finally {
        this.savingProfile = false;
      }
    },
    async savePassword() {
      const { oldPassword, newPassword, confirmPassword } = this.passwordForm;
      if (newPassword.length < 8) {
        this.$message.warning("新密码至少 8 位");
        return;
      }
      if (newPassword !== confirmPassword) {
        this.$message.warning("两次输入的新密码不一致");
        return;
      }
      if (this.me.hasPassword && !oldPassword) {
        this.$message.warning("请填写原密码");
        return;
      }

      this.savingPassword = true;
      try {
        await changeMyPassword(oldPassword, newPassword);
        this.passwordForm = { oldPassword: "", newPassword: "", confirmPassword: "" };
        await this.reload();
        this.$message.success(this.me.hasPassword ? "密码已修改" : "密码已设置");
      } catch (error) {
        this.$message.error((error && error.message) || "修改密码失败");
      } finally {
        this.savingPassword = false;
      }
    },
    async logout() {
      await this.session.logout();
      this.$router.replace("/dam/login").catch(() => {});
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-profile {
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

  &__card + &__card {
    margin-top: 14px;
  }

  &__card-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__card-title {
    font-size: 14px;
    font-weight: 600;
    color: $menuText;
  }

  &__form {
    max-width: 420px;
  }

  &__value {
    font-size: 13px;
    color: $menuText;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__muted {
    font-size: 12px;
    color: $menuMuted;
    word-break: break-all;
  }
}
</style>
