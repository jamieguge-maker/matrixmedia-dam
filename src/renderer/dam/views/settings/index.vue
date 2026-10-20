<template>
  <div class="dam-page">
    <module-placeholder
      title="DAM 设置"
      description="配置 DAM 服务端地址、登录 / 退出、检查更新，以及在需要时打开 DAM 客户端处理重功能（入库、组织、WPS 授权）。"
      plan="M1：服务端地址 + 账号密码登录 + 会话管理"
    />
  </div>
</template>

<script>
import ModulePlaceholder from "../../components/ModulePlaceholder.vue";

export default {
  name: "DamSettingsView",
  components: { ModulePlaceholder }
};
</script>

<style lang="scss" scoped>
.dam-page {
  padding: 20px;
}
</style>
