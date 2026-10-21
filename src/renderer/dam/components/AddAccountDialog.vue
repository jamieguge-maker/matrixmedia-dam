<template>
  <el-dialog
    title="添加媒体账号"
    :visible="visible"
    width="560px"
    append-to-body
    :close-on-press-escape="false"
    :before-close="beforeClose"
    custom-class="dam-add-account-dialog"
    @close="close"
  >
    <el-form label-width="88px">
      <el-form-item label="分组">
        <el-select
          v-model="phone"
          filterable
          allow-create
          default-first-option
          clearable
          placeholder="选择已有分组，或输入后回车新增"
          no-data-text="输入分组名称后回车新增"
          style="width: 100%"
        >
          <el-option v-for="name in groupOptions" :key="name" :label="name" :value="name" />
        </el-select>
      </el-form-item>
      <el-form-item label="平台">
        <el-select v-model="pt" placeholder="请选择平台">
          <el-option
            v-for="item in platformOptions"
            :key="item.key"
            :value="item.key"
            :label="item.key"
            :disabled="item.disabled"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="说明">
        <div class="dam-add-account__tips">
          新增账号后，建议先到对应平台上传页走一遍流程并取消上传，
          部分平台会有新手引导需要手动关闭。
        </div>
      </el-form-item>
    </el-form>

    <span slot="footer">
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">新增</el-button>
    </span>
  </el-dialog>
</template>

<script>
import dataRequest from "@/utils/dataRequest";
import ptConfig from "@/utils/configUrl";

export default {
  name: "DamAddAccountDialog",
  props: {
    visible: { type: Boolean, default: false }
  },
  data() {
    return {
      ptConfig,
      groupOptions: [],
      phone: "",
      pt: "",
      saving: false
    };
  },
  computed: {
    usedPtsForGroup() {
      const phone = String(this.phone || "").trim();
      if (!phone) return new Set();
      try {
        const tree = JSON.parse(localStorage.getItem("accountTree") || "{}");
        const group = tree[phone];
        if (!group || !Array.isArray(group.children)) return new Set();
        return new Set(
          group.children
            .map((child) => (child.meta && child.meta.pt) || child.path || (child.meta && child.meta.title))
            .filter(Boolean)
        );
      } catch (_) {
        return new Set();
      }
    },
    platformOptions() {
      return Object.keys(this.ptConfig).map((key) => ({
        key,
        disabled: this.usedPtsForGroup.has(key)
      }));
    }
  },
  watch: {
    visible(open) {
      if (open) this.refreshGroups();
    },
    phone() {
      if (this.pt && this.usedPtsForGroup.has(this.pt)) this.pt = "";
    }
  },
  methods: {
    refreshGroups() {
      try {
        const tree = JSON.parse(localStorage.getItem("accountTree") || "{}");
        this.groupOptions = Object.keys(tree).filter(Boolean);
      } catch (_) {
        this.groupOptions = [];
      }
    },
    close() {
      this.$emit("update:visible", false);
    },
    /** 遮罩点击 / 关闭按钮：提交中不允许关闭 */
    beforeClose(done) {
      if (this.saving) return;
      done();
    },
    async submit() {
      const phone = String(this.phone || "").trim();
      if (!phone) {
        this.$message.warning("请选择或输入分组名称");
        return;
      }
      if (!this.pt) {
        this.$message.warning("请选择平台");
        return;
      }
      if (this.usedPtsForGroup.has(this.pt)) {
        this.$message.warning("该分组已添加过此平台，请勿重复添加");
        return;
      }

      this.saving = true;
      try {
        const res = await dataRequest({
          type: "add",
          fileName: "account",
          item: {
            phone,
            pt: this.pt,
            url: this.ptConfig[this.pt].index
          }
        });
        if (res && res.success === false) {
          throw new Error(res.message || "本地服务返回失败");
        }
        this.$message.success("添加成功");
        this.$emit("added");
        this.phone = "";
        this.pt = "";
        this.close();
      } catch (error) {
        this.$message.error("添加失败：" + ((error && error.message) || error));
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-add-account__tips {
  color: $menuMuted;
  font-size: 13px;
  line-height: 1.7;
}
</style>
