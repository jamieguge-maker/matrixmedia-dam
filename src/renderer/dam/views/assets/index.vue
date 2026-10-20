<template>
  <div class="dam-assets">
    <el-card shadow="never">
      <div slot="header" class="dam-assets__head">
        <span class="dam-assets__title">DAM 素材库</span>
        <el-tag size="mini" type="info">M0 骨架</el-tag>
      </div>

      <el-alert
        title="壳内模块已接通，素材列表将在 M2 实现"
        type="info"
        :closable="false"
        show-icon
        description="当前版本用于验证：DAM 入口、路由、主进程 IPC 与登录态存储。下一步接入 DAM 服务端登录与素材查询。"
      />

      <el-descriptions class="dam-assets__info" :column="1" border size="small">
        <el-descriptions-item label="壳版本">{{ info.version || '-' }}</el-descriptions-item>
        <el-descriptions-item label="应用标识">{{ info.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="数据目录">{{ info.userData || '-' }}</el-descriptions-item>
        <el-descriptions-item label="DAM API">{{ config.apiBase || '-' }}</el-descriptions-item>
        <el-descriptions-item label="登录态">
          <el-tag v-if="session && session.token" type="success" size="mini">已保存令牌</el-tag>
          <el-tag v-else type="info" size="mini">未登录</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="更新源">{{ info.updateFeed || '未配置（不检查）' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script>
import { ipcRenderer } from "electron";

export default {
  name: "DamAssetsView",
  data() {
    return {
      info: {},
      config: {},
      session: null
    };
  },
  async created() {
    await this.load();
  },
  methods: {
    async load() {
      try {
        const [info, config, session] = await Promise.all([
          ipcRenderer.invoke("dam:app:info"),
          ipcRenderer.invoke("dam:config:get"),
          ipcRenderer.invoke("dam:session:get")
        ]);
        this.info = info || {};
        this.config = config || {};
        this.session = session || null;
      } catch (error) {
        this.$message.error("读取壳信息失败：" + ((error && error.message) || error));
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-assets {
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

  &__info {
    margin-top: 16px;
  }
}
</style>
