<template>
  <el-dialog
    :visible="visible"
    title="选择素材"
    width="920px"
    append-to-body
    @close="close"
  >
    <div class="dam-picker__filters">
      <el-input
        v-model="keyword"
        size="small"
        class="dam-picker__keyword"
        placeholder="搜索标题 / 文件名 / 标签"
        prefix-icon="el-icon-search"
        clearable
        @keyup.enter.native="search"
        @clear="search"
      />
      <el-select v-model="section" size="small" class="dam-picker__select" @change="search">
        <el-option
          v-for="item in sectionOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-button size="small" type="primary" @click="search">查询</el-button>
    </div>

    <el-table
      ref="table"
      v-loading="loading"
      :data="items"
      row-key="id"
      size="small"
      border
      height="380"
      empty-text="没有符合条件的素材"
      @selection-change="onSelectionChange"
    >
      <el-table-column type="selection" width="46" reserve-selection />
      <el-table-column label="缩略图" width="68" align="center">
        <template #default="{ row }">
          <el-image
            v-if="thumbUrl(row.id)"
            :src="thumbUrl(row.id)"
            fit="cover"
            class="dam-picker__thumb"
          />
          <div v-else class="dam-picker__thumb dam-picker__thumb--empty">
            <i :class="mediaIcon(row)"></i>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="素材" min-width="220" show-overflow-tooltip />
      <el-table-column label="板块" width="100">
        <template #default="{ row }">{{ sectionLabel(row.section) }}</template>
      </el-table-column>
      <el-table-column label="系列 / 名称" width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ row.groupName || "-" }}</template>
      </el-table-column>
      <el-table-column label="类型" width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ row.kindName || "-" }}</template>
      </el-table-column>
      <el-table-column label="状态" width="92">
        <template #default="{ row }">
          <el-tag size="mini" :type="uploadStatusType(row.uploadStatus)">
            {{ uploadStatusLabel(row.uploadStatus) }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>

    <div class="dam-picker__pager">
      <el-pagination
        background
        layout="total, prev, pager, next"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        @current-change="onPageChange"
      />
    </div>

    <span slot="footer">
      <span class="dam-picker__count">已选 {{ selected.length }} 条</span>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :disabled="!selected.length" @click="confirm">确定</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { assetThumbUrls, listAssets } from "../api/assets";
import {
  SECTION_OPTIONS,
  sectionLabel,
  uploadStatusLabel,
  uploadStatusType
} from "../utils/format";

export default {
  name: "DamAssetPickerDialog",
  props: {
    visible: { type: Boolean, default: false }
  },
  data() {
    return {
      sectionOptions: SECTION_OPTIONS,
      keyword: "",
      section: "",
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      loading: false,
      selected: [],
      thumbs: {}
    };
  },
  watch: {
    visible(open) {
      if (open) {
        this.page = 1;
        this.load();
      }
    }
  },
  methods: {
    sectionLabel,
    uploadStatusLabel,
    uploadStatusType,
    thumbUrl(id) {
      const hit = this.thumbs[id];
      return hit && hit.url ? hit.url : "";
    },
    mediaIcon(row) {
      if (row.mediaType === "image") return "el-icon-picture-outline";
      if (row.mediaType === "video") return "el-icon-video-camera";
      return "el-icon-document";
    },
    close() {
      this.$emit("update:visible", false);
    },
    confirm() {
      this.$emit("confirm", this.selected.slice());
      this.close();
    },
    onSelectionChange(rows) {
      this.selected = rows;
    },
    onPageChange(value) {
      this.page = value;
      this.load();
    },
    search() {
      this.page = 1;
      this.load();
    },
    async load() {
      this.loading = true;
      try {
        const query = { page: this.page, pageSize: this.pageSize, sortBy: "createdAt", sortOrder: "desc" };
        if (this.keyword.trim()) query.keyword = this.keyword.trim();
        if (this.section) query.section = this.section;
        const result = await listAssets(query);
        this.items = (result && result.items) || [];
        this.total = (result && result.total) || 0;
        this.loadThumbs();
      } catch (error) {
        this.$message.error("加载素材失败：" + ((error && error.message) || error));
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
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-picker {
  &__filters {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__keyword {
    width: 280px;
  }

  &__select {
    width: 170px;
  }

  &__pager {
    margin-top: 10px;
    display: flex;
    justify-content: flex-end;
  }

  &__count {
    margin-right: auto;
    float: left;
    line-height: 32px;
    font-size: 12px;
    color: $menuMuted;
  }

  &__thumb {
    width: 42px;
    height: 42px;
    border-radius: 3px;

    &--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      background: $pageBg;
      color: $menuMuted;
    }
  }
}
</style>
