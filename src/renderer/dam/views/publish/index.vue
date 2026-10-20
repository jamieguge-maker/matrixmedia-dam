<template>
  <div class="dam-page">
    <module-placeholder
      title="发布中心"
      description="选择素材、平台与账号，编辑各平台文案，按立即 / 定时 / 发布计划提交。发布动作复用本机矩媒内核。"
      plan="M3：选素材 → 选账号 → 文案 → 提交 → 回写台账"
    />
  </div>
</template>

<script>
import ModulePlaceholder from "../../components/ModulePlaceholder.vue";

export default {
  name: "DamPublishView",
  components: { ModulePlaceholder }
};
</script>

<style lang="scss" scoped>
.dam-page {
  padding: 20px;
}
</style>
