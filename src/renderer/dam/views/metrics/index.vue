<template>
  <div class="dam-page">
    <module-placeholder
      title="流量看板"
      description="查看平台总览、播放趋势与账号级指标（只读）。指标以 DAM 服务端采集结果为准。"
      plan="M7：平台总览 + 趋势 + 账号明细"
    />
  </div>
</template>

<script>
import ModulePlaceholder from "../../components/ModulePlaceholder.vue";

export default {
  name: "DamMetricsView",
  components: { ModulePlaceholder }
};
</script>

<style lang="scss" scoped>
.dam-page {
  padding: 20px;
}
</style>
