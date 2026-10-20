<template>
  <div class="dam-page">
    <module-placeholder
      title="发布计划"
      description="按平台维护发布节奏与每期条数，查看今日待办、完成度与本周 / 本月进度。"
      plan="M5：今日待办 + 周/月进度 + 计划维护"
    />
  </div>
</template>

<script>
import ModulePlaceholder from "../../components/ModulePlaceholder.vue";

export default {
  name: "DamPlansView",
  components: { ModulePlaceholder }
};
</script>

<style lang="scss" scoped>
.dam-page {
  padding: 20px;
}
</style>
