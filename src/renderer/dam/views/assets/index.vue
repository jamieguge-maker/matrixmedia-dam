<template>
  <div class="dam-assets">
    <div class="dam-assets__header">
      <div class="dam-assets__title">素材库</div>
      <div class="dam-assets__actions">
        <el-radio-group v-model="viewMode" size="small" class="dam-assets__view">
          <el-radio-button label="grid">
            <i class="el-icon-menu" title="网格视图"></i>
          </el-radio-button>
          <el-radio-button label="list">
            <i class="el-icon-s-unfold" title="列表视图"></i>
          </el-radio-button>
        </el-radio-group>

        <el-button size="small" type="primary" icon="el-icon-upload2" @click="uploadVisible = true">
          上传素材
        </el-button>
        <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">
          刷新
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="dam-assets__tabs">
      <el-tab-pane v-for="tab in tabs" :key="tab.name" :label="tab.label" :name="tab.name" />
    </el-tabs>

    <div class="dam-filters">
      <div class="dam-filters__row">
        <el-input
          v-model="filters.keyword"
          class="dam-filters__keyword"
          size="small"
          clearable
          placeholder="搜索标题 / 文件名 / 描述 / 标签"
          prefix-icon="el-icon-search"
          @keyup.enter.native="search"
          @clear="search"
        />

        <el-select
          v-if="showGroup"
          v-model="filters.groupName"
          size="small"
          class="dam-filters__select"
          clearable
          filterable
          :placeholder="groupPlaceholder"
          @change="search"
        >
          <el-option v-for="name in groupOptions" :key="name" :label="name" :value="name" />
        </el-select>

        <el-select
          v-if="showCategory"
          v-model="filters.categoryName"
          size="small"
          class="dam-filters__select"
          clearable
          filterable
          placeholder="品类"
          @change="search"
        >
          <el-option v-for="name in categoryOptions" :key="name" :label="name" :value="name" />
        </el-select>

        <el-select
          v-if="showKind"
          v-model="filters.kindName"
          size="small"
          class="dam-filters__select"
          clearable
          placeholder="素材类型"
          @change="search"
        >
          <el-option v-for="name in kindOptions" :key="name" :label="name" :value="name" />
        </el-select>

        <el-select
          v-model="filters.language"
          size="small"
          class="dam-filters__select dam-filters__select--narrow"
          clearable
          placeholder="语言"
          @change="search"
        >
          <el-option
            v-for="item in languageOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>

        <el-select
          v-model="filters.ratio"
          size="small"
          class="dam-filters__select dam-filters__select--narrow"
          clearable
          placeholder="尺寸"
          @change="search"
        >
          <el-option v-for="item in ratioOptions" :key="item" :label="item" :value="item" />
        </el-select>

        <el-button size="small" type="primary" @click="search">查询</el-button>
        <el-button size="small" @click="reset">重置</el-button>
      </div>
    </div>

    <el-alert
      v-if="errorText"
      class="dam-assets__alert"
      :title="errorText"
      type="error"
      :closable="false"
      show-icon
    >
      <el-button size="mini" @click="load">重试</el-button>
    </el-alert>

    <div v-if="viewMode === 'grid'" v-loading="loading" class="dam-grid">
      <div v-for="row in items" :key="row.id" class="dam-card" @click="openDetail(row)">
        <div class="dam-card__thumb">
          <el-image
            v-if="thumbUrl(row.id)"
            :src="thumbUrl(row.id)"
            fit="cover"
            class="dam-card__img"
            @error="onThumbError(row.id)"
          />
          <div v-else class="dam-card__ph">
            <i :class="mediaIcon(row)"></i>
          </div>
          <el-tag
            v-if="(row.publishedPlatforms || []).length"
            size="mini"
            type="success"
            class="dam-card__badge"
          >
            已发布
          </el-tag>
          <el-button
            v-if="canDelete"
            class="dam-card__del"
            size="mini"
            icon="el-icon-delete"
            circle
            @click.stop="openDelete(row)"
          />
        </div>
        <div class="dam-card__body">
          <div class="dam-card__title" :title="row.title">{{ row.title }}</div>
          <div class="dam-card__meta">
            {{ groupKind(row) }}
          </div>
          <div class="dam-card__meta">
            {{ formatBytes(row.fileSize) }} · {{ formatDateTime(row.uploadedAt || row.createdAt) }}
            · 上传人 {{ row.operator || "-" }}
          </div>
        </div>
      </div>

      <div v-if="!loading && !items.length" class="dam-grid__empty">没有符合条件的素材</div>
    </div>

    <el-table
      v-else
      v-loading="loading"
      :data="items"
      class="dam-assets__table"
      size="small"
      border
      empty-text="没有符合条件的素材"
    >
      <el-table-column label="缩略图" width="76" align="center">
        <template #default="{ row }">
          <el-image
            v-if="thumbUrl(row.id)"
            :src="thumbUrl(row.id)"
            :preview-src-list="[thumbUrl(row.id)]"
            fit="cover"
            class="dam-thumb"
            @error="onThumbError(row.id)"
          />
          <el-tooltip v-else :content="thumbTip" placement="top">
            <div class="dam-thumb dam-thumb--empty">
              <i :class="mediaIcon(row)"></i>
            </div>
          </el-tooltip>
        </template>
      </el-table-column>

      <el-table-column label="素材" min-width="230" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="dam-title" @click="openDetail(row)">{{ row.title }}</div>
          <div class="dam-title__sub">
            {{ row.fileName }} · {{ formatBytes(row.fileSize) }}
          </div>
        </template>
      </el-table-column>

      <el-table-column label="系列 / 名称" width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ row.groupName || "-" }}</template>
      </el-table-column>

      <el-table-column label="品类 / 类型" width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ groupKind(row) }}</template>
      </el-table-column>

      <el-table-column label="发布情况" width="190">
        <template #default="{ row }">
          <div v-if="(row.publishedPlatforms || []).length" class="dam-platforms">
            <el-tag
              v-for="code in row.publishedPlatforms"
              :key="code"
              size="mini"
              type="success"
            >
              {{ platformLabel(code) }}
            </el-tag>
          </div>
          <span v-else class="dam-muted">未发布</span>
        </template>
      </el-table-column>

      <el-table-column label="上传时间" width="145">
        <template #default="{ row }">
          {{ formatDateTime(row.uploadedAt || row.createdAt) }}
        </template>
      </el-table-column>

      <el-table-column label="上传人" width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ row.operator || "-" }}</template>
      </el-table-column>

      <el-table-column label="操作" width="130" fixed="right">
        <template #default="{ row }">
          <el-button type="text" size="mini" @click="openDetail(row)">详情</el-button>
          <el-button
            v-if="canDelete"
            type="text"
            size="mini"
            class="dam-assets__danger"
            @click="openDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="dam-assets__pager">
      <el-pagination
        background
        layout="total, prev, pager, next, sizes"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        :page-sizes="[20, 50, 100]"
        @current-change="onPageChange"
        @size-change="onSizeChange"
      />
    </div>

    <asset-detail-dialog :visible.sync="detailVisible" :asset-id="detailId" />
    <upload-dialog :visible.sync="uploadVisible" @uploaded="onUploaded" />

    <el-dialog :visible.sync="deleteVisible" title="删除素材" width="440px" append-to-body>
      <div class="dam-delete__target">{{ deleteTarget ? deleteTarget.title : "" }}</div>

      <el-radio-group v-model="deleteMode" class="dam-delete__modes">
        <el-radio label="trash">移入回收站（可从正式版「素材回收站」恢复）</el-radio>
        <el-radio label="purge" :disabled="!isAdmin">
          彻底删除（同时删除 WPS 云端文件{{ isAdmin ? "" : "，仅管理员可用" }}）
        </el-radio>
      </el-radio-group>

      <div class="dam-delete__tip">
        <hint-tip :content="deleteTip" placement="right" max-width="360px" />
      </div>

      <span slot="footer">
        <el-button @click="deleteVisible = false">取消</el-button>
        <el-button type="danger" :loading="deleting" @click="confirmDelete">
          {{ deleteMode === "purge" ? "彻底删除" : "删除" }}
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {
  assetGroups,
  assetThumbUrls,
  categoryTree,
  deleteAsset,
  listAssets,
  purgeAssets
} from "../../api/assets";
import { useDamSession } from "../../store/session";
import AssetDetailDialog from "../../components/AssetDetailDialog.vue";
import UploadDialog from "../../components/UploadDialog.vue";
import HintTip from "../../components/HintTip.vue";
import {
  LANGUAGE_OPTIONS,
  RATIO_OPTIONS,
  SECTION_KINDS,
  formatBytes,
  formatDateTime,
  platformLabel
} from "../../utils/format";

/** 顶部 TAB：最新上传 = 全部（按上传时间倒序），其余按板块过滤 */
const TABS = [
  { name: "latest", label: "最新上传", section: "" },
  { name: "product", label: "产品", section: "product" },
  { name: "case", label: "项目案例", section: "case" },
  { name: "personal", label: "黄总个人", section: "personal" },
  { name: "activity", label: "公司活动", section: "activity" }
];

const VIEW_MODE_KEY = "dam-assets-view-mode";

export default {
  name: "DamAssetsView",
  components: { AssetDetailDialog, UploadDialog, HintTip },
  data() {
    return {
      session: useDamSession(),
      tabs: TABS,
      activeTab: "latest",
      /** grid = 封面卡片，list = 表格；记住上次选择 */
      viewMode: this.readViewMode(),
      languageOptions: LANGUAGE_OPTIONS,
      ratioOptions: RATIO_OPTIONS,
      filters: {
        keyword: "",
        section: "",
        groupName: "",
        categoryName: "",
        kindName: "",
        language: "",
        ratio: ""
      },
      groupOptions: [],
      categoryOptions: [],
      loading: false,
      errorText: "",
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      thumbs: {},
      thumbFailed: {},
      thumbError: false,
      detailVisible: false,
      detailId: null,
      uploadVisible: false,
      deleteVisible: false,
      deleteTarget: null,
      deleteMode: "trash",
      deleting: false,
      deleteTip:
        "移入回收站：素材从列表消失，记录与 WPS 文件都还在，可在矩媒正式版的「素材回收站」恢复。\n" +
        "彻底删除：记录直接删掉，并删除 WPS 云端文件（进 WPS 自己的回收站），不可恢复，只有管理员能做。"
    };
  },
  computed: {
    showGroup() {
      return Boolean(this.filters.section) && this.filters.section !== "uncategorized";
    },
    showCategory() {
      return this.filters.section === "product";
    },
    showKind() {
      return Boolean(this.filters.section) && this.filters.section !== "uncategorized";
    },
    kindOptions() {
      return SECTION_KINDS[this.filters.section] || [];
    },
    groupPlaceholder() {
      if (this.filters.section === "product") return "系列";
      if (this.filters.section === "case") return "案例名称";
      return "视频名称";
    },
    thumbTip() {
      return this.thumbError ? "缩略图地址获取失败，请刷新重试" : "没有可用的预览图";
    },
    /** 有没有会让新素材「看不见」的筛选条件（上传后提示用） */
    hasActiveFilters() {
      return Boolean(
        this.activeTab !== "latest" ||
          this.filters.keyword.trim() ||
          this.filters.groupName ||
          this.filters.categoryName ||
          this.filters.kindName ||
          this.filters.language ||
          this.filters.ratio
      );
    },
    /** 删除按钮：服务端只允许管理员 / 操作员删素材 */
    canDelete() {
      const user = this.session.state.user || {};
      return Boolean(user.isSuperAdmin) || ["admin", "operator"].includes(user.role);
    },
    /** 彻底删除（含云端文件）只有管理员能做 */
    isAdmin() {
      const user = this.session.state.user || {};
      return Boolean(user.isSuperAdmin) || user.role === "admin";
    }
  },
  created() {
    this.load();
  },
  watch: {
    activeTab(name) {
      const tab = this.tabs.find((item) => item.name === name) || this.tabs[0];
      this.filters.section = tab.section;
      this.filters.groupName = "";
      this.filters.categoryName = "";
      this.filters.kindName = "";
      this.groupOptions = [];
      this.categoryOptions = [];
      if (tab.section) this.loadGroups();
      if (tab.section === "product") this.loadCategories();
      this.page = 1;
      this.load();
    },
    viewMode(mode) {
      try {
        localStorage.setItem(VIEW_MODE_KEY, mode);
      } catch (_) {
        /* 隐私模式下忽略 */
      }
    }
  },
  methods: {
    formatBytes,
    formatDateTime,
    platformLabel,
    readViewMode() {
      try {
        const saved = localStorage.getItem(VIEW_MODE_KEY);
        if (saved === "grid" || saved === "list") return saved;
      } catch (_) {
        /* 忽略 */
      }
      return "grid";
    },
    groupKind(row) {
      const parts = [];
      if (row.categoryName) parts.push(row.categoryName);
      if (row.kindName) parts.push(row.kindName);
      return parts.length ? parts.join(" / ") : "-";
    },
    mediaIcon(row) {
      if (row.mediaType === "image") return "el-icon-picture-outline";
      if (row.mediaType === "video") return "el-icon-video-camera";
      return "el-icon-document";
    },
    thumbUrl(id) {
      if (this.thumbFailed[id]) return "";
      const hit = this.thumbs[id];
      return hit && hit.url ? hit.url : "";
    },
    /** 签名地址能拿到、但云端文件没了（WPS 报「文件不存在」）时退回图标，别显示破图 */
    onThumbError(id) {
      if (!id) return;
      this.$set(this.thumbFailed, id, true);
    },
    buildQuery() {
      const query = {
        page: this.page,
        pageSize: this.pageSize,
        sortBy: "createdAt",
        sortOrder: "desc"
      };
      if (this.filters.keyword.trim()) query.keyword = this.filters.keyword.trim();
      if (this.filters.section) query.section = this.filters.section;
      if (this.filters.groupName) query.groupName = this.filters.groupName;
      if (this.filters.categoryName) query.categoryName = this.filters.categoryName;
      if (this.filters.kindName) query.kindName = this.filters.kindName;
      if (this.filters.language) query.language = this.filters.language;
      if (this.filters.ratio) query.ratio = this.filters.ratio;

      return query;
    },
    onPageChange(value) {
      this.page = value;
      this.load();
    },
    onSizeChange(value) {
      this.pageSize = value;
      this.page = 1;
      this.load();
    },
    search() {
      this.page = 1;
      this.load();
    },
    async loadGroups() {
      try {
        const rows = await assetGroups(this.filters.section);
        this.groupOptions = (rows || []).map((row) => row.name).filter(Boolean);
      } catch (_) {
        this.groupOptions = [];
      }
    },
    async loadCategories() {
      try {
        const nodes = await categoryTree("product");
        const names = [];
        (nodes || []).forEach((series) => {
          (series.children || []).forEach((child) => {
            if (child && child.name && !names.includes(child.name)) names.push(child.name);
          });
        });
        this.categoryOptions = names;
      } catch (_) {
        this.categoryOptions = [];
      }
    },
    reset() {
      this.filters = {
        keyword: "",
        section: "",
        groupName: "",
        categoryName: "",
        kindName: "",
        language: "",
        ratio: ""
      };
      this.groupOptions = [];
      this.categoryOptions = [];
      this.page = 1;
      this.load();
    },
    async load() {
      this.loading = true;
      this.errorText = "";
      this.thumbError = false;

      try {
        const list = await listAssets(this.buildQuery());
        this.items = (list && list.items) || [];
        this.total = (list && list.total) || 0;
        this.loadThumbs();
      } catch (error) {
        this.items = [];
        this.total = 0;
        this.errorText = (error && error.message) || "加载素材失败";
      } finally {
        this.loading = false;
      }
    },
    async loadThumbs() {
      const ids = this.items.map((item) => item.id).filter(Boolean);
      this.thumbFailed = {};
      if (!ids.length) {
        this.thumbs = {};
        return;
      }
      try {
        const result = await assetThumbUrls(ids);
        const map = {};
        ((result && result.items) || []).forEach((item) => {
          map[item.id] = item;
        });
        this.thumbs = map;
      } catch (_) {
        this.thumbs = {};
        this.thumbError = true;
      }
    },
    openDetail(row) {
      this.detailId = row.id;
      this.detailVisible = true;
    },
    onUploaded() {
      this.page = 1;
      this.load();
      if (this.hasActiveFilters) {
        this.$message.info("已刷新列表；当前有筛选条件，看不到刚上传的素材时点「重置」");
      }
    },
    openDelete(row) {
      this.deleteTarget = row;
      this.deleteMode = "trash";
      this.deleteVisible = true;
    },
    async confirmDelete() {
      const target = this.deleteTarget;
      if (!target) return;

      this.deleting = true;
      try {
        if (this.deleteMode === "purge") {
          const result = await purgeAssets([target.id], true);
          const failed = ((result && result.results) || []).find((item) => !item.ok);
          if (failed) throw new Error(failed.message || "彻底删除失败");
          this.$message.success("素材已彻底删除（含云端文件）");
        } else {
          await deleteAsset(target.id);
          this.$message.success("已移入回收站");
        }

        this.deleteVisible = false;
        this.deleteTarget = null;
        // 删掉的是当前页最后一条时回退一页，避免停在空页
        if (this.items.length === 1 && this.page > 1) this.page -= 1;
        await this.load();
      } catch (error) {
        this.$message.error((error && error.message) || "删除失败");
      } finally {
        this.deleting = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-assets {
  padding: 20px;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  &__title {
    font-size: 18px;
    font-weight: 600;
    color: $menuText;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__view {
    margin-right: 4px;
  }

  &__tabs {
    margin-bottom: 12px;

    ::v-deep .el-tabs__header {
      margin-bottom: 0;
    }
  }

  &__alert {
    margin-bottom: 14px;
  }

  &__table {
    width: 100%;
  }

  &__pager {
    margin-top: 14px;
    display: flex;
    justify-content: flex-end;
  }

  &__danger {
    color: $dangerColor;
  }
}

/* 网格视图 */
.dam-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
  min-height: 120px;

  &__empty {
    grid-column: 1 / -1;
    padding: 40px 0;
    text-align: center;
    font-size: 13px;
    color: $menuMuted;
  }
}

.dam-card {
  background: $cardBg;
  border: 1px solid $borderColor;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;

  &:hover {
    border-color: $primaryColor;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);

    .dam-card__del {
      opacity: 1;
    }
  }

  &__thumb {
    position: relative;
    width: 100%;
    padding-top: 70%;
    background: $pageBg;
  }

  &__img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;

    ::v-deep img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__ph {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    color: $menuMuted;
  }

  &__badge {
    position: absolute;
    left: 8px;
    top: 8px;
  }

  &__del {
    position: absolute;
    right: 8px;
    top: 8px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &__body {
    padding: 10px 12px 12px;
  }

  &__title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 600;
    color: $menuText;
  }

  &__meta {
    margin-top: 4px;
    font-size: 12px;
    color: $menuMuted;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.dam-delete {
  &__target {
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 600;
    color: $menuText;
    word-break: break-all;
  }

  &__modes {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__tip {
    margin-top: 12px;
  }
}

.dam-filters {
  padding: 12px;
  margin-bottom: 14px;
  background: $cardBg;
  border: 1px solid $borderColor;
  border-radius: 8px;

  &__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__keyword {
    width: 260px;
  }

  &__select {
    width: 150px;

    &--narrow {
      width: 110px;
    }
  }
}

.dam-thumb {
  width: 52px;
  height: 52px;
  border-radius: 4px;
  display: block;

  &--empty {
    display: flex;
    align-items: center;
    justify-content: center;
    background: $pageBg;
    color: $menuMuted;
    font-size: 20px;
  }
}

.dam-title {
  color: $primaryColor;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }

  &__sub {
    margin-top: 2px;
    font-size: 12px;
    color: $menuMuted;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.dam-platforms {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.dam-muted {
  color: $menuMuted;
  font-size: 12px;
}
</style>
