<template>
  <div class="dam-placeholder">
    <el-card shadow="never">
      <div slot="header" class="dam-placeholder__head">
        <span class="dam-placeholder__title">{{ title }}</span>
        <el-tag size="mini" type="info">M0 骨架</el-tag>
      </div>
      <p class="dam-placeholder__desc">{{ description }}</p>
      <p v-if="plan" class="dam-placeholder__plan">计划：{{ plan }}</p>
      <slot></slot>
    </el-card>
  </div>
</template>

<script>
export default {
  name: "DamModulePlaceholder",
  props: {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    plan: { type: String, default: "" }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-placeholder {
  padding: 20px;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: $menuText;
  }

  &__desc {
    margin: 0 0 8px;
    color: $menuText;
    line-height: 1.7;
  }

  &__plan {
    margin: 0;
    color: $menuMuted;
    font-size: 13px;
  }
}
</style>
