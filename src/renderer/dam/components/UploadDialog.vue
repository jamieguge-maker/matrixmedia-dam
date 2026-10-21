<template>
  <el-dialog
    :visible="visible"
    title="素材入库"
    width="900px"
    append-to-body
    :close-on-click-modal="false"
    @close="close"
  >
    <el-form label-width="90px" size="small" class="dam-upload__form">
      <el-form-item label="板块">
        <el-radio-group v-model="section" @change="onSectionChange">
          <el-radio-button v-for="item in sectionTabs" :key="item.value" :label="item.value">
            {{ item.label }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item :label="groupLabel">
        <el-select
          v-model="groupName"
          filterable
          allow-create
          default-first-option
          clearable
          :placeholder="groupPlaceholder"
          style="width: 100%"
        >
          <el-option v-for="name in groupOptions" :key="name" :label="name" :value="name" />
        </el-select>
      </el-form-item>

      <el-form-item v-if="section === 'product'" label="品类">
        <el-select
          v-model="categoryName"
          filterable
          allow-create
          default-first-option
          clearable
          placeholder="选择或输入品类"
          style="width: 100%"
        >
          <el-option v-for="name in categoryOptions" :key="name" :label="name" :value="name" />
        </el-select>
      </el-form-item>

      <el-form-item label="素材类型">
        <el-radio-group v-model="kindName">
          <el-radio-button v-for="name in kindOptions" :key="name" :label="name">
            {{ name }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="语言 / 尺寸">
        <el-select v-model="language" style="width: 120px">
          <el-option label="中文版" value="zh" />
          <el-option label="英文版" value="en" />
        </el-select>
        <el-select v-model="ratio" clearable placeholder="不区分尺寸" style="width: 150px; margin-left: 8px">
          <el-option label="9:16" value="9:16" />
          <el-option label="3:4" value="3:4" />
          <el-option label="16:9" value="16:9" />
        </el-select>
      </el-form-item>
    </el-form>

    <div class="dam-upload__files">
      <div class="dam-upload__files-head">
        <span>素材文件</span>
        <div>
          <el-button size="mini" icon="el-icon-plus" @click="pickMaterials">选择文件</el-button>
          <el-button size="mini" icon="el-icon-picture-outline" @click="pickCoversForAllVideos">
            批量配封面
          </el-button>
        </div>
      </div>

      <div v-if="!files.length" class="dam-upload__muted">还没有选择文件</div>

      <div v-for="file in files" :key="file.path" class="dam-file">
        <div class="dam-file__main">
          <span class="dam-file__name" :title="file.name">{{ file.name }}</span>
          <span class="dam-file__size">{{ formatBytes(file.size) }}</span>
          <el-button type="text" size="mini" @click="removeFile(file)">移除</el-button>
        </div>

        <div class="dam-file__path">{{ pathFor(file) }}</div>

        <div v-if="needsCover(file)" class="dam-file__cover">
          <el-button size="mini" @click="pickCover(file)">
            {{ file.coverName ? "更换封面" : "选择封面" }}
          </el-button>
          <span v-if="file.coverName" class="dam-file__cover-name">{{ file.coverName }}</span>
          <span v-else class="dam-upload__warn">这个板块的视频必须配封面</span>
          <el-button v-if="file.coverName" type="text" size="mini" @click="clearCover(file)">
            清除
          </el-button>
        </div>

        <div v-if="file.status" class="dam-file__status">
          <el-tag size="mini" :type="statusType(file.status)">{{ statusText(file.status) }}</el-tag>
          <el-progress
            v-if="file.status === 'uploading'"
            :percentage="file.percent || 0"
            :stroke-width="6"
            class="dam-file__progress"
          />
          <span class="dam-file__message">{{ file.message }}</span>
        </div>
      </div>
    </div>

    <span slot="footer">
      <span class="dam-upload__summary">{{ summary }}</span>
      <el-button @click="close">关闭</el-button>
      <el-button type="primary" :loading="uploading" @click="startUpload">开始上传</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { ipcRenderer } from "electron";
import {
  appendUploadLog,
  assetGroups,
  categoryTree,
  createAsset,
  findAssetByChecksum,
  patchAssetStorage
} from "../api/assets";
import { formatBytes, SECTION_KINDS } from "../utils/format";
import {
  SECTION_GROUP_LABEL,
  SECTION_IMAGE_IS_COVER_ONLY,
  SECTION_REQUIRE_COVER,
  buildFullPath,
  buildSegments,
  extOf,
  isImageFile,
  isVideoFile,
  mediaTypeOf,
  sanitizeSegment
} from "../utils/assetPaths";

const SECTION_TABS = [
  { value: "product", label: "产品" },
  { value: "case", label: "项目案例" },
  { value: "personal", label: "黄总个人" },
  { value: "activity", label: "公司活动" }
];

function emptyFile(item) {
  return {
    path: item.path,
    name: item.name,
    size: item.size,
    coverPath: "",
    coverName: "",
    coverSize: 0,
    status: "",
    message: "",
    percent: 0
  };
}

export default {
  name: "DamUploadDialog",
  props: {
    visible: { type: Boolean, default: false }
  },
  data() {
    return {
      sectionTabs: SECTION_TABS,
      section: "product",
      groupName: "",
      categoryName: "",
      kindName: "",
      language: "zh",
      ratio: "",
      groupOptions: [],
      categoryOptions: [],
      files: [],
      uploading: false,
      uploadedCount: 0
    };
  },
  computed: {
    groupLabel() {
      return SECTION_GROUP_LABEL[this.section] || "名称";
    },
    groupPlaceholder() {
      return `选择或输入${this.groupLabel}`;
    },
    kindOptions() {
      return SECTION_KINDS[this.section] || [];
    },
    summary() {
      if (!this.files.length) return "还没有选择文件";
      if (this.uploadedCount) return `已完成 ${this.uploadedCount} / ${this.files.length}`;
      return `共 ${this.files.length} 个文件`;
    }
  },
  watch: {
    visible(open) {
      if (open) this.onOpen();
    },
    section() {
      this.kindName = this.kindOptions[0] || "";
    }
  },
  created() {
    this.onProgress = (_event, payload) => {
      const file = this.files.find((item) => item.path === payload.taskId);
      if (file) file.percent = payload.percent;
    };
    ipcRenderer.on("dam:upload-progress", this.onProgress);
  },
  beforeDestroy() {
    ipcRenderer.removeListener("dam:upload-progress", this.onProgress);
  },
  methods: {
    formatBytes,
    onOpen() {
      this.uploadedCount = 0;
      if (!this.kindName) this.kindName = this.kindOptions[0] || "";
      this.loadGroups();
      if (this.section === "product") this.loadCategories();
    },
    close() {
      if (this.uploading) {
        this.$message.warning("正在上传，请等待完成后再关闭");
        return;
      }
      this.$emit("update:visible", false);
    },
    onSectionChange() {
      this.kindName = this.kindOptions[0] || "";
      this.groupOptions = [];
      this.categoryOptions = [];
      this.loadGroups();
      if (this.section === "product") this.loadCategories();

      // 个人 / 活动板块里图片只能当封面，不能作为素材
      if (SECTION_IMAGE_IS_COVER_ONLY[this.section]) {
        const images = this.files.filter((file) => isImageFile(file.name));
        if (images.length) {
          this.$message.warning("这个板块的图片只能当封面，已从素材列表移除");
          this.files = this.files.filter((file) => !isImageFile(file.name));
        }
      }
    },
    async loadGroups() {
      try {
        const rows = await assetGroups(this.section);
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
    needsCover(file) {
      return isVideoFile(file.name) && SECTION_REQUIRE_COVER[this.section];
    },
    pathFor(file) {
      return buildFullPath(
        {
          section: this.section,
          groupName: this.groupName,
          categoryName: this.categoryName,
          kindName: this.kindName,
          language: this.language,
          ratio: this.ratio
        },
        file.name
      );
    },
    segmentsFor() {
      return buildSegments({
        section: this.section,
        groupName: this.groupName,
        categoryName: this.categoryName,
        kindName: this.kindName,
        language: this.language,
        ratio: this.ratio
      });
    },
    async pickMaterials() {
      const picked = await ipcRenderer.invoke("dam:pick-files", { type: "all", multiple: true });
      if (!picked || !picked.length) return;

      let items = picked.slice();
      if (SECTION_IMAGE_IS_COVER_ONLY[this.section]) {
        const images = items.filter((item) => isImageFile(item.name));
        if (images.length) {
          this.$message.warning("这个板块的图片只能当封面，已忽略图片文件");
          items = items.filter((item) => !isImageFile(item.name));
        }
      }

      const existing = new Set(this.files.map((file) => file.path));
      items
        .filter((item) => !existing.has(item.path))
        .forEach((item) => this.files.push(emptyFile(item)));

      this.autoPairCovers();
      this.suggestKind();
    },
    async pickCoversForAllVideos() {
      const videos = this.files.filter((file) => isVideoFile(file.name) && !file.coverName);
      if (!videos.length) {
        this.$message.info("没有需要配封面的视频");
        return;
      }
      const picked = await ipcRenderer.invoke("dam:pick-files", { type: "image", multiple: true });
      if (!picked || !picked.length) return;
      videos.forEach((video, index) => {
        const cover = picked[index] || picked[0];
        if (cover) {
          video.coverPath = cover.path;
          video.coverName = cover.name;
          video.coverSize = cover.size;
        }
      });
    },
    async pickCover(file) {
      const picked = await ipcRenderer.invoke("dam:pick-files", { type: "image", multiple: false });
      if (!picked || !picked.length) return;
      file.coverPath = picked[0].path;
      file.coverName = picked[0].name;
      file.coverSize = picked[0].size;
    },
    clearCover(file) {
      file.coverPath = "";
      file.coverName = "";
      file.coverSize = 0;
    },
    autoPairCovers() {
      const images = this.files.filter((file) => isImageFile(file.name));
      if (!images.length) return;
      const base = (name) => String(name).replace(/\.[^.]+$/, "").replace(/[-_ ]?(封面|cover|poster)$/i, "");
      this.files
        .filter((file) => isVideoFile(file.name) && !file.coverName)
        .forEach((video) => {
          const match = images.find((image) => base(image.name) === base(video.name));
          if (match) {
            video.coverPath = match.path;
            video.coverName = match.name;
            video.coverSize = match.size;
          }
        });
    },
    suggestKind() {
      if (!this.kindOptions.length) return;
      const hasVideo = this.files.some((file) => isVideoFile(file.name));
      const hasImage = this.files.some((file) => isImageFile(file.name));
      if (hasVideo && this.kindOptions.includes("视频")) {
        this.kindName = "视频";
      } else if (hasImage) {
        if (this.kindOptions.includes("白底、细节图")) this.kindName = "白底、细节图";
        else if (this.kindOptions.includes("图片")) this.kindName = "图片";
      }
    },
    removeFile(file) {
      this.files = this.files.filter((item) => item.path !== file.path);
    },
    statusText(status) {
      return (
        {
          hashing: "计算校验值",
          uploading: "上传中",
          saving: "保存入库",
          success: "成功",
          duplicated: "已存在",
          failed: "失败"
        }[status] || status
      );
    },
    statusType(status) {
      if (status === "success" || status === "duplicated") return "success";
      if (status === "failed") return "danger";
      return "warning";
    },
    validate() {
      if (!String(this.groupName || "").trim()) return `请填写${this.groupLabel}`;
      if (this.section === "product" && !String(this.categoryName || "").trim()) {
        return "产品板块需要填写品类";
      }
      if (!this.kindName) return "请选择素材类型";
      if (!this.files.length) return "请选择素材文件";
      const missingCover = this.files.find((file) => this.needsCover(file) && !file.coverPath);
      if (missingCover) return `「${missingCover.name}」还没有配封面`;
      return "";
    },
    titleFor(file, videoCount) {
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const fromGroup =
        ["personal", "activity"].includes(this.section) &&
        isVideoFile(file.name) &&
        Boolean(this.groupName);
      const baseTitle = fromGroup
        ? videoCount > 1
          ? `${this.groupName}-${baseName}`
          : this.groupName
        : baseName;
      const suffixes = [this.ratio, this.language === "en" ? "英文版" : null].filter(Boolean);
      return suffixes.length ? `${baseTitle}（${suffixes.join(" · ")}）` : baseTitle;
    },
    sanitizeFileName(name) {
      return String(name || "")
        .replace(/[\\/:*?"<>|]/g, "")
        .trim()
        .slice(0, 200);
    },
    async startUpload() {
      const error = this.validate();
      if (error) {
        this.$message.warning(error);
        return;
      }

      this.uploading = true;
      this.uploadedCount = 0;
      const segments = this.segmentsFor();
      const videoCount = this.files.filter((file) => isVideoFile(file.name)).length;

      try {
        for (const file of this.files) {
          if (file.status === "success" || file.status === "duplicated") continue;

          const startedAt = Date.now();
          file.status = "hashing";
          file.message = "";
          file.percent = 0;

          try {
            const hash = await ipcRenderer.invoke("dam:hash-file", file.path);

            if (hash.size !== file.size) file.size = hash.size;

            const existing = await findAssetByChecksum(hash.md5).catch(() => null);
            if (existing && existing.uploadStatus === "stored") {
              file.status = "duplicated";
              file.message = `内容重复，已复用「${existing.title}」`;
              this.uploadedCount += 1;
              continue;
            }

            file.status = "uploading";
            file.message = "创建入库记录";
            const title = this.titleFor(file, videoCount);
            const asset = await createAsset({
              title,
              description: null,
              tags: [],
              mediaType: mediaTypeOf(file.name),
              fileName: file.name,
              fileExt: extOf(file.name),
              fileSize: hash.size,
              checksum: hash.md5,
              section: this.section,
              groupName: sanitizeSegment(this.groupName),
              categoryName: this.section === "product" ? sanitizeSegment(this.categoryName) : null,
              kindName: this.kindName,
              language: this.language,
              ratio: this.ratio || null,
              localPath: file.path,
              storageProvider: "wps",
              uploadStatus: "uploading"
            });

            let coverUpload = null;
            if (file.coverPath) {
              file.message = "上传封面图";
              const coverResult = await ipcRenderer.invoke("dam:upload-file", {
                taskId: file.path + "#cover",
                filePath: file.coverPath,
                fileName: this.sanitizeFileName(file.coverName || "cover"),
                folderPath: segments
              });
              if (!coverResult.ok) {
                throw new Error("封面图上传失败：" + (coverResult.message || "未知错误"));
              }
              coverUpload = coverResult.data;
            }

            file.message = "上传中";
            const uploadResult = await ipcRenderer.invoke("dam:upload-file", {
              taskId: file.path,
              filePath: file.path,
              fileName: this.sanitizeFileName(file.name),
              folderPath: segments
            });
            if (!uploadResult.ok) {
              throw new Error(uploadResult.message || "上传失败");
            }

            const data = uploadResult.data || {};
            const finalName = data.name || file.name;

            file.status = "saving";
            file.message = "保存入库信息";

            const storagePath = "/" + [...segments, finalName].join("/");
            const payload = {
              storageProvider: "wps",
              storageKey: data.fileId || null,
              storagePath,
              storageParentId: data.parentId || null,
              storageDriveId: data.driveId || null,
              storageUrl: null,
              uploadStatus: "stored",
              uploadError: null
            };

            if (coverUpload) {
              payload.coverFileName = coverUpload.name || file.coverName;
              payload.coverFileSize = file.coverSize || 0;
              payload.coverStorageKey = coverUpload.fileId || null;
              payload.coverStorageParentId = coverUpload.parentId || null;
              payload.coverStorageDriveId = coverUpload.driveId || null;
              payload.coverStoragePath =
                "/" + [...segments, coverUpload.name || file.coverName].join("/");
            }

            await patchAssetStorage(asset.id, payload);

            await appendUploadLog({
              assetId: asset.id,
              action: "upload",
              provider: "wps",
              sourcePath: file.path,
              targetPath: storagePath,
              fileName: finalName,
              fileSize: hash.size,
              checksum: hash.md5,
              status: "success",
              durationMs: Date.now() - startedAt
            }).catch(() => {});

            file.status = "success";
            file.message = "已入库";
            file.percent = 100;
            this.uploadedCount += 1;
          } catch (error) {
            const message = (error && error.message) || "上传失败";
            file.status = "failed";
            file.message = message;
            await appendUploadLog({
              action: "upload",
              provider: "wps",
              sourcePath: file.path,
              targetPath: this.pathFor(file),
              fileName: file.name,
              fileSize: file.size,
              status: "failed",
              message,
              durationMs: Date.now() - startedAt
            }).catch(() => {});
          }
        }

        if (this.uploadedCount > 0) {
          this.$emit("uploaded");
        }
        const failed = this.files.filter((file) => file.status === "failed").length;
        if (failed) {
          this.$message.warning(`完成：成功 ${this.uploadedCount} 个，失败 ${failed} 个`);
        } else if (this.uploadedCount) {
          this.$message.success(`上传完成（${this.uploadedCount} 个）`);
        }
      } finally {
        this.uploading = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-upload {
  &__form {
    margin-bottom: 8px;
  }

  &__files {
    max-height: 380px;
    overflow-y: auto;
    padding: 12px;
    background: $pageBg;
    border-radius: 8px;
  }

  &__files-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 13px;
    font-weight: 600;
    color: $menuText;
  }

  &__muted {
    color: $menuMuted;
    font-size: 12px;
  }

  &__warn {
    color: $dangerColor;
    font-size: 12px;
  }

  &__summary {
    margin-right: auto;
    float: left;
    line-height: 32px;
    font-size: 12px;
    color: $menuMuted;
  }
}

.dam-file {
  padding: 10px 12px;
  background: $cardBg;
  border: 1px solid $borderColor;
  border-radius: 6px;

  & + & {
    margin-top: 8px;
  }

  &__main {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    color: $menuText;
  }

  &__size {
    font-size: 12px;
    color: $menuMuted;
  }

  &__path {
    margin-top: 4px;
    font-size: 12px;
    color: $menuMuted;
    word-break: break-all;
  }

  &__cover {
    margin-top: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__cover-name {
    font-size: 12px;
    color: $menuText;
  }

  &__status {
    margin-top: 6px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__progress {
    width: 180px;
  }

  &__message {
    font-size: 12px;
    color: $menuMuted;
  }
}
</style>
