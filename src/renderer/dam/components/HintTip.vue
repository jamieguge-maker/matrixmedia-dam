<template>
  <el-tooltip :placement="placement" effect="dark" :open-delay="80">
    <i class="el-icon-question dam-hint-tip"></i>
    <div slot="content" :style="{ maxWidth, whiteSpace: 'pre-line', lineHeight: 1.6 }">
      {{ content }}
    </div>
  </el-tooltip>
</template>

<script>
/**
 * 统一提示图标：说明文字默认不占版面，鼠标移上去才弹出来。
 *
 * 用法：<hint-tip content="密码至少 8 位" />
 * 需要换行时直接在内容里写 \n（模板里用 :content="'第一行\n第二行'"）。
 */
export default {
  name: "DamHintTip",
  props: {
    content: { type: String, default: "" },
    placement: { type: String, default: "top" },
    maxWidth: { type: String, default: "320px" }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-hint-tip {
  margin-left: 6px;
  font-size: 14px;
  color: $menuMuted;
  cursor: help;
  vertical-align: -2px;

  &:hover {
    color: $primaryColor;
  }
}
</style>
