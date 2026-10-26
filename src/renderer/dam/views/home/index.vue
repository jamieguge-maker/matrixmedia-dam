<template>
  <div class="dam-home">
    <div class="dam-home__header">
      <div>
        <div class="dam-home__title">欢迎回来，{{ displayName }}</div>
        <div class="dam-home__subtitle">查看你的素材上传与内容发布进度</div>
      </div>
      <div class="dam-home__actions">
        <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">
          刷新统计
        </el-button>
        <el-button size="small" type="primary" icon="el-icon-files" @click="go('/dam/assets')">
          打开素材库
        </el-button>
        <el-button size="small" icon="el-icon-promotion" @click="go('/dam/publish')">
          去发布
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="errorText"
      class="dam-home__error"
      :title="errorText"
      type="error"
      :closable="false"
      show-icon
    />

    <div v-if="!errorText" v-loading="loading" class="dam-home__content">
      <section class="dam-home__section">
        <div class="dam-home__section-title">我的上传统计</div>
        <div class="dam-home__stats">
          <el-card shadow="never" class="dam-home__stat">
            <div class="dam-home__stat-label">上传素材</div>
            <div class="dam-home__stat-value">{{ uploadStats.total }}</div>
          </el-card>
          <el-card shadow="never" class="dam-home__stat">
            <div class="dam-home__stat-label">已入库</div>
            <div class="dam-home__stat-value is-success">{{ uploadStats.stored }}</div>
          </el-card>
          <el-card shadow="never" class="dam-home__stat">
            <div class="dam-home__stat-label">待处理 / 上传中</div>
            <div class="dam-home__stat-value is-warning">{{ uploadStats.pending }}</div>
          </el-card>
          <el-card shadow="never" class="dam-home__stat">
            <div class="dam-home__stat-label">上传失败</div>
            <div class="dam-home__stat-value is-danger">{{ uploadStats.failed }}</div>
          </el-card>
          <el-card shadow="never" class="dam-home__stat">
            <div class="dam-home__stat-label">最近 7 天</div>
            <div class="dam-home__stat-value">{{ uploadStats.recent7d }}</div>
          </el-card>
        </div>
      </section>

      <section class="dam-home__section">
        <div class="dam-home__section-title">我的发布进度</div>
        <el-card shadow="never" class="dam-home__progress-card">
          <div class="dam-home__progress-summary">
            <span>已完成 {{ publishStats.completed }} / {{ publishStats.total }} 条</span>
            <span>{{ publishStats.percent }}%</span>
          </div>
          <el-progress :percentage="publishStats.percent" :stroke-width="10" />
          <div class="dam-home__progress-stats">
            <span><i class="is-success"></i>已提交 / 已发布 {{ publishStats.completed }}</span>
            <span><i class="is-warning"></i>待发布 {{ publishStats.waiting }}</span>
            <span><i class="is-danger"></i>失败 {{ publishStats.failed }}</span>
          </div>
        </el-card>
      </section>

      <div class="dam-home__tables">
        <section class="dam-home__section">
          <div class="dam-home__section-heading">
            <div class="dam-home__section-title">最近上传</div>
            <el-button type="text" @click="go('/dam/assets')">查看素材库</el-button>
          </div>
          <el-table :data="recentAssets" size="small" border empty-text="暂无上传记录">
            <el-table-column prop="title" label="素材标题" min-width="150" show-overflow-tooltip />
            <el-table-column label="上传人" width="100">
              <template #default="{ row }">{{ row.operator || "-" }}</template>
            </el-table-column>
            <el-table-column label="状态" width="90">
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
          </el-table>
        </section>

        <section class="dam-home__section">
          <div class="dam-home__section-heading">
            <div class="dam-home__section-title">最近发布</div>
            <el-button type="text" @click="go('/dam/records')">查看记录</el-button>
          </div>
          <el-table :data="recentRecords" size="small" border empty-text="暂无发布记录">
            <el-table-column prop="assetTitle" label="素材标题" min-width="140" show-overflow-tooltip />
            <el-table-column label="平台" width="95">
              <template #default="{ row }">{{ platformLabel(row.platformCode) }}</template>
            </el-table-column>
            <el-table-column label="进度" width="96">
              <template #default="{ row }">
                <el-tag size="mini" :type="publishStatusType(row.status)">
                  {{ publishStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="更新时间" width="145">
              <template #default="{ row }">
                {{ formatDateTime(row.updatedAt || row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </section>
      </div>

      <div class="dam-home__note">
        个人统计根据记录中的上传人姓名汇总；修改姓名后，历史记录仍按原姓名统计。
      </div>
    </div>
  </div>
</template>

<script>
import { listAssets } from "../../api/assets";
import { listPublishRecords } from "../../api/publish";
import { useDamSession } from "../../store/session";
import {
  formatDateTime,
  platformLabel,
  publishStatusLabel,
  publishStatusType,
  uploadStatusLabel,
  uploadStatusType
} from "../../utils/format";

const PAGE_SIZE = 200;
const PAGE_CONCURRENCY = 4;

async function loadAllRows(fetchPage) {
  const first = await fetchPage(1);
  if (!first || !Array.isArray(first.items) || !Number.isFinite(Number(first.total))) {
    throw new Error("服务端返回的统计数据格式不正确");
  }

  const total = Number(first.total);
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const rows = first.items.slice();

  for (let start = 2; start <= pageCount; start += PAGE_CONCURRENCY) {
    const pageNumbers = [];
    for (let page = start; page < start + PAGE_CONCURRENCY && page <= pageCount; page += 1) {
      pageNumbers.push(page);
    }
    const pages = await Promise.all(pageNumbers.map((page) => fetchPage(page)));
    pages.forEach((result) => {
      if (!result || !Array.isArray(result.items)) {
        throw new Error("服务端返回的分页数据格式不正确");
      }
      rows.push(...result.items);
    });
  }

  return rows;
}

export default {
  name: "DamHomeView",
  data() {
    return {
      session: useDamSession(),
      loading: false,
      errorText: "",
      uploadStats: { total: 0, stored: 0, pending: 0, failed: 0, recent7d: 0 },
      publishStats: { total: 0, completed: 0, waiting: 0, failed: 0, percent: 0 },
      recentAssets: [],
      recentRecords: []
    };
  },
  computed: {
    displayName() {
      const user = this.session.state.user || {};
      return user.displayName || user.username || "用户";
    }
  },
  activated() {
    this.load();
  },
  methods: {
    formatDateTime,
    platformLabel,
    publishStatusLabel,
    publishStatusType,
    uploadStatusLabel,
    uploadStatusType,
    go(path) {
      if (this.$route.path !== path) this.$router.push(path).catch(() => {});
    },
    async load() {
      if (this.loading) return;
      this.loading = true;
      this.errorText = "";

      try {
        const assetRowsPromise = loadAllRows((page) =>
          listAssets({ page, pageSize: PAGE_SIZE, sortBy: "uploadedAt", sortOrder: "desc" })
        );
        const publishRowsPromise = loadAllRows((page) =>
          listPublishRecords({ page, pageSize: PAGE_SIZE })
        );
        const [assets, records] = await Promise.all([assetRowsPromise, publishRowsPromise]);
        const operator = this.displayName;
        const myAssets = assets.filter((item) => item && item.operator === operator);
        const myRecords = records.filter((item) => item && item.operator === operator);
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

        this.uploadStats = {
          total: myAssets.length,
          stored: myAssets.filter((item) => item.uploadStatus === "stored").length,
          pending: myAssets.filter((item) =>
            ["pending", "uploading"].includes(item.uploadStatus)
          ).length,
          failed: myAssets.filter((item) => item.uploadStatus === "failed").length,
          recent7d: myAssets.filter((item) => {
            const timestamp = new Date(item.uploadedAt || item.createdAt).getTime();
            return Number.isFinite(timestamp) && timestamp >= cutoff;
          }).length
        };

        const completedStatuses = ["submitted", "success", "manual_done"];
        const waitingStatuses = ["draft", "queued", "scheduled"];
        const completed = myRecords.filter((item) =>
          completedStatuses.includes(item.status)
        ).length;
        this.publishStats = {
          total: myRecords.length,
          completed,
          waiting: myRecords.filter((item) => waitingStatuses.includes(item.status)).length,
          failed: myRecords.filter((item) => item.status === "failed").length,
          percent: myRecords.length ? Math.round((completed / myRecords.length) * 100) : 0
        };
        this.recentAssets = myAssets.slice(0, 5);
        this.recentRecords = myRecords.slice(0, 5);
      } catch (error) {
        this.errorText = (error && error.message) || "加载个人统计失败";
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.dam-home {
  min-height: 100%;
  padding: 20px;

  &__header,
  &__section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  &__header {
    margin-bottom: 20px;
  }

  &__title {
    font-size: 20px;
    font-weight: 700;
    color: $menuText;
  }

  &__subtitle,
  &__note {
    margin-top: 6px;
    font-size: 12px;
    color: $menuMuted;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  &__error,
  &__section + &__section {
    margin-bottom: 16px;
  }

  &__content {
    min-height: 220px;
  }

  &__section {
    margin-bottom: 18px;
  }

  &__section-title {
    margin-bottom: 10px;
    font-size: 15px;
    font-weight: 600;
    color: $menuText;
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(5, minmax(120px, 1fr));
    gap: 12px;
  }

  &__stat {
    border-radius: 8px;

    ::v-deep .el-card__body {
      padding: 16px;
    }
  }

  &__stat-label {
    font-size: 12px;
    color: $menuMuted;
  }

  &__stat-value {
    margin-top: 8px;
    font-size: 26px;
    font-weight: 700;
    color: $menuText;
  }

  &__progress-card {
    border-radius: 8px;
  }

  &__progress-summary,
  &__progress-stats {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__progress-summary {
    margin-bottom: 10px;
    font-size: 13px;
    color: $menuText;
  }

  &__progress-stats {
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 20px;
    margin-top: 12px;
    font-size: 12px;
    color: $menuMuted;

    span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    i {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: $menuMuted;
    }
  }

  &__tables {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  &__note {
    margin-top: 2px;
  }
}

.is-success {
  color: #67c23a;
}

.is-warning {
  color: #e6a23c;
}

.is-danger {
  color: $dangerColor;
}

.dam-home__progress-stats i.is-success {
  background: #67c23a;
}

.dam-home__progress-stats i.is-warning {
  background: #e6a23c;
}

.dam-home__progress-stats i.is-danger {
  background: $dangerColor;
}

@media (max-width: 1000px) {
  .dam-home {
    &__stats {
      grid-template-columns: repeat(3, minmax(120px, 1fr));
    }

    &__tables {
      grid-template-columns: 1fr;
    }
  }
}

@media (max-width: 640px) {
  .dam-home {
    &__header {
      align-items: flex-start;
      flex-direction: column;
    }

    &__actions {
      flex-wrap: wrap;
    }

    &__stats {
      grid-template-columns: repeat(2, minmax(120px, 1fr));
    }
  }
}
</style>
