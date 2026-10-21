<template>
  <div class="dam-assets">
    <div class="dam-assets__header">
      <div>
        <div class="dam-assets__title">素材库</div>
        <div class="dam-assets__sub">{{ greeting }}</div>
      </div>
      <div class="dam-assets__actions">
        <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">
          刷新
        </el-button>
      </div>
    </div>

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
          v-model="filters.section"
          size="small"
          class="dam-filters__select"
          @change="onSectionChange"
        >
          <el-option
            v-for="item in sectionOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>

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

      <div class="dam-filters__quick">
        <el-radio-group v-model="quick" size="mini" @change="search">
          <el-radio-button label="">全部</el-radio-button>
          <el-radio-button label="recent">近 7 天</el-radio-button>
          <el-radio-button label="unpublished">尚未发布</el-radio-button>
          <el-radio-button label="missingCover">视频缺封面</el-radio-button>
          <el-radio-button label="failed">上传失败</el-radio-button>
        </el-radio-group>
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

    <div class="dam-assets__stats">
      <div v-for="card in statCards" :key="card.key" class="dam-stat">
        <div class="dam-stat__value">{{ card.value }}</div>
        <div class="dam-stat__label">{{ card.label }}</div>
      </div>
    </div>

    <el-table
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

      <el-table-column label="板块" width="100">
        <template #default="{ row }">{{ sectionLabel(row.section) }}</template>
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

      <el-table-column label="状态" width="92">
        <template #default="{ row }">
          <el-tag size="mini" :type="uploadStatusType(row.uploadStatus)">
            {{ uploadStatusLabel(row.uploadStatus) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="上传时间" width="145">
        <template #default="{ row }">
          {{ formatDateTime(row.uploadedAt || row.createdAt) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button type="text" size="mini" @click="openDetail(row)">详情</el-button>
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
  </div>
</template>

<script>
import { assetGroups, assetStats, assetThumbUrls, categoryTree, listAssets } from "../../api/assets";
import { useDamSession } from "../../store/session";
import AssetDetailDialog from "../../components/AssetDetailDialog.vue";
import {
  LANGUAGE_OPTIONS,
  RATIO_OPTIONS,
  SECTION_KINDS,
  SECTION_OPTIONS,
  formatBytes,
  formatDateTime,
  platformLabel,
  roleLabel,
  sectionLabel,
  uploadStatusLabel,
  uploadStatusType
} from "../../utils/format";

export default {
  name: "DamAssetsView",
  components: { AssetDetailDialog },
  data() {
    return {
      session: useDamSession(),
      sectionOptions: SECTION_OPTIONS,
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
      quick: "",
      groupOptions: [],
      categoryOptions: [],
      loading: false,
      errorText: "",
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      stats: {},
      thumbs: {},
      thumbError: false,
      detailVisible: false,
      detailId: null
    };
  },
  computed: {
    greeting() {
      const user = this.session.state.user;
      if (!user) return "已连接 DAM 服务端";
      const parts = [user.displayName || user.username, roleLabel(user.role)];
      if (user.departmentName) parts.push(user.departmentName);
      return parts.filter(Boolean).join(" · ");
    },
    statCards() {
      const stats = this.stats || {};
      return [
        { key: "total", label: "素材总数", value: stats.total || 0 },
        { key: "stored", label: "已入库", value: stats.stored || 0 },
        { key: "unpublished", label: "尚未发布", value: stats.unpublished || 0 },
        { key: "recent", label: "近 7 天新增", value: stats.recent7d || 0 }
      ];
    },
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
    }
  },
  created() {
    this.load();
  },
  methods: {
    sectionLabel,
    uploadStatusLabel,
    uploadStatusType,
    formatBytes,
    formatDateTime,
    platformLabel,
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
      const hit = this.thumbs[id];
      return hit && hit.url ? hit.url : "";
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

      if (this.quick === "recent") query.recentDays = 7;
      if (this.quick === "unpublished") query.unpublishedOnly = true;
      if (this.quick === "missingCover") query.missingCover = true;
      if (this.quick === "failed") query.failedOnly = true;

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
    async onSectionChange() {
      this.filters.groupName = "";
      this.filters.categoryName = "";
      this.filters.kindName = "";
      this.groupOptions = [];
      this.categoryOptions = [];

      if (this.filters.section && this.filters.section !== "uncategorized") {
        this.loadGroups();
      }
      if (this.filters.section === "product") {
        this.loadCategories();
      }
      this.search();
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
      this.quick = "";
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
        const [list, stats] = await Promise.all([listAssets(this.buildQuery()), assetStats()]);
        this.items = (list && list.items) || [];
        this.total = (list && list.total) || 0;
        this.stats = stats || {};
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

  &__sub {
    margin-top: 4px;
    font-size: 12px;
    color: $menuMuted;
  }

  &__alert {
    margin-bottom: 14px;
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  &__table {
    width: 100%;
  }

  &__pager {
    margin-top: 14px;
    display: flex;
    justify-content: flex-end;
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

  &__quick {
    margin-top: 10px;
  }
}

.dam-stat {
  padding: 14px 16px;
  background: $cardBg;
  border: 1px solid $borderColor;
  border-radius: 8px;

  &__value {
    font-size: 22px;
    font-weight: 700;
    color: $menuText;
    line-height: 1.2;
  }

  &__label {
    margin-top: 4px;
    font-size: 12px;
    color: $menuMuted;
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
