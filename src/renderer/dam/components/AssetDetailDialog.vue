<template>
  <el-dialog
    :visible="visible"
    width="960px"
    append-to-body
    custom-class="dam-asset-detail"
    title="素材详情"
    @close="close"
  >
    <div v-loading="loading" class="dam-detail">
      <el-alert
        v-if="errorText"
        :title="errorText"
        type="error"
        :closable="false"
        show-icon
        class="dam-detail__alert"
      />

      <div v-if="asset" class="dam-detail__body">
        <div class="dam-detail__media">
          <template v-if="preview.fileUrl && asset.mediaType === 'image'">
            <el-image
              :src="preview.fileUrl"
              :preview-src-list="[preview.fileUrl]"
              fit="contain"
              class="dam-detail__image"
            />
          </template>
          <template v-else-if="preview.fileUrl && asset.mediaType === 'video'">
            <video
              class="dam-detail__video"
              :src="preview.fileUrl"
              :poster="preview.coverUrl || undefined"
              controls
              preload="metadata"
            ></video>
          </template>
          <template v-else>
            <div class="dam-detail__placeholder">
              <i :class="mediaIcon"></i>
              <span>暂无可预览文件</span>
            </div>
          </template>
        </div>

        <div class="dam-detail__meta">
          <div class="dam-detail__title">{{ asset.title }}</div>
          <div class="dam-detail__tags">
            <el-tag v-for="tag in asset.tags || []" :key="tag" size="mini" type="info">
              {{ tag }}
            </el-tag>
            <span v-if="!(asset.tags || []).length" class="dam-detail__muted">无标签</span>
          </div>

          <el-descriptions :column="2" border size="small" class="dam-detail__desc">
            <el-descriptions-item label="板块">{{ sectionLabel(asset.section) }}</el-descriptions-item>
            <el-descriptions-item label="语言">{{ languageText }}</el-descriptions-item>
            <el-descriptions-item :label="groupLabel">{{ asset.groupName || "-" }}</el-descriptions-item>
            <el-descriptions-item label="品类">{{ asset.categoryName || "-" }}</el-descriptions-item>
            <el-descriptions-item label="素材类型">{{ asset.kindName || "-" }}</el-descriptions-item>
            <el-descriptions-item label="尺寸">{{ asset.ratio || "-" }}</el-descriptions-item>
            <el-descriptions-item label="文件">{{ asset.fileName }}</el-descriptions-item>
            <el-descriptions-item label="大小">{{ formatBytes(asset.fileSize) }}</el-descriptions-item>
            <el-descriptions-item label="上传时间">
              {{ formatDateTime(asset.uploadedAt || asset.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="操作人">{{ asset.operator || "-" }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag size="mini" :type="uploadStatusType(asset.uploadStatus)">
                {{ uploadStatusLabel(asset.uploadStatus) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="最近发布">
              {{ formatDateTime(asset.lastPublishedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="云端路径" :span="2">
              <span class="dam-detail__path">{{ asset.storagePath || "-" }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="校验值" :span="2">
              <span class="dam-detail__path">{{ asset.checksum || "-" }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <div v-if="asset" class="dam-detail__records">
        <div class="dam-detail__records-title">发布记录（{{ records.length }}）</div>
        <el-table :data="records" size="mini" border empty-text="还没有发布记录">
          <el-table-column label="平台" width="120">
            <template #default="{ row }">{{ platformLabel(row.platformCode) }}</template>
          </el-table-column>
          <el-table-column label="账号" width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ row.targetName || "-" }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="mini" :type="publishStatusType(row.status)">
                {{ publishStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="发布时间" width="150">
            <template #default="{ row }">{{ formatDateTime(row.publishedAt || row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="作品链接" min-width="180">
            <template #default="{ row }">
              <a
                v-if="row.externalUrl"
                class="dam-detail__link"
                :href="row.externalUrl"
                @click.prevent="openUrl(row.externalUrl)"
              >
                {{ row.externalUrl }}
              </a>
              <span v-else class="dam-detail__muted">{{ row.error || "-" }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <span slot="footer">
      <el-button @click="close">关闭</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { ipcRenderer } from "electron";
import { assetPublishRecords, assetPreviewUrls, getAsset } from "../api/assets";
import {
  formatBytes,
  formatDateTime,
  platformLabel,
  publishStatusLabel,
  publishStatusType,
  sectionLabel,
  uploadStatusLabel,
  uploadStatusType
} from "../utils/format";

export default {
  name: "DamAssetDetailDialog",
  props: {
    visible: { type: Boolean, default: false },
    assetId: { type: [Number, String], default: null }
  },
  data() {
    return {
      loading: false,
      errorText: "",
      asset: null,
      preview: { fileUrl: null, coverUrl: null },
      records: []
    };
  },
  computed: {
    languageText() {
      const value = this.asset && this.asset.language;
      return value === "en" ? "英文版" : "中文版";
    },
    groupLabel() {
      const section = this.asset && this.asset.section;
      if (section === "product") return "系列";
      if (section === "case") return "案例名称";
      return "视频名称";
    },
    mediaIcon() {
      const type = this.asset && this.asset.mediaType;
      if (type === "image") return "el-icon-picture-outline";
      if (type === "video") return "el-icon-video-camera";
      return "el-icon-document";
    }
  },
  watch: {
    visible(open) {
      if (open && this.assetId) this.load();
    },
    assetId() {
      if (this.visible && this.assetId) this.load();
    }
  },
  methods: {
    sectionLabel,
    formatBytes,
    formatDateTime,
    platformLabel,
    publishStatusLabel,
    publishStatusType,
    uploadStatusLabel,
    uploadStatusType,
    close() {
      this.$emit("update:visible", false);
    },
    async load() {
      if (!this.assetId) return;
      this.loading = true;
      this.errorText = "";
      this.asset = null;
      this.records = [];
      this.preview = { fileUrl: null, coverUrl: null };

      try {
        const [asset, previewResult, recordResult] = await Promise.all([
          getAsset(this.assetId),
          assetPreviewUrls([this.assetId]).catch(() => ({ items: [] })),
          assetPublishRecords(this.assetId).catch(() => ({ items: [] }))
        ]);

        this.asset = asset;
        const previewRow = ((previewResult && previewResult.items) || [])[0];
        this.preview = {
          fileUrl: (previewRow && previewRow.fileUrl) || null,
          coverUrl: (previewRow && previewRow.coverUrl) || null
        };
        this.records = (recordResult && recordResult.items) || [];
      } catch (error) {
        this.errorText = (error && error.message) || "加载详情失败";
      } finally {
        this.loading = false;
      }
    },
    openUrl(url) {
      if (!url) return;
      ipcRenderer.invoke("dam:open-external", url).catch(() => {});
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-detail {
  &__alert {
    margin-bottom: 12px;
  }

  &__body {
    display: flex;
    gap: 18px;
    align-items: flex-start;
  }

  &__media {
    flex: 0 0 300px;
    width: 300px;
    height: 260px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
    border-radius: 8px;
    overflow: hidden;
  }

  &__image {
    width: 100%;
    height: 100%;
  }

  &__video {
    width: 100%;
    height: 100%;
    background: #000;
  }

  &__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;

    i {
      font-size: 34px;
    }
  }

  &__meta {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: $menuText;
    margin-bottom: 8px;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  &__muted {
    color: $menuMuted;
    font-size: 12px;
  }

  &__path {
    word-break: break-all;
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
  }

  &__records {
    margin-top: 18px;
  }

  &__records-title {
    font-size: 14px;
    font-weight: 600;
    color: $menuText;
    margin-bottom: 8px;
  }

  &__link {
    color: $primaryColor;
    word-break: break-all;
  }
}
</style>
