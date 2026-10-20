<template>
  <div class="dam-page">
    <module-placeholder
      title="发布记录"
      description="按平台、状态、素材与日期查看发布台账；支持回填作品链接、重试失败记录、同步通道状态。"
      plan="M4：记录列表 + 状态同步 + 回填 + 重试"
    />
  </div>
</template>

<script>
import ModulePlaceholder from "../../components/ModulePlaceholder.vue";

export default {
  name: "DamRecordsView",
  components: { ModulePlaceholder }
};
</script>

<style lang="scss" scoped>
.dam-page {
  padding: 20px;
}
</style>
