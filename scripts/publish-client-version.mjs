const version = process.env.VERSION;
const githubToken = process.env.GH_TOKEN;
const policyToken = process.env.DAM_CLIENT_VERSION_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;

if (!version || !githubToken || !policyToken || !repository) {
  throw new Error(
    "发布线上升级提示需要 VERSION、GH_TOKEN、GITHUB_REPOSITORY 和 DAM_CLIENT_VERSION_TOKEN。请在仓库 Actions secrets 中配置 DAM_CLIENT_VERSION_TOKEN。"
  );
}

const tag = `v${version}`;
const releaseResponse = await fetch(
  `https://api.github.com/repos/${repository}/releases/tags/${encodeURIComponent(tag)}`,
  {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  }
);
if (!releaseResponse.ok) {
  throw new Error(`读取 GitHub Release 失败：HTTP ${releaseResponse.status}`);
}

const release = await releaseResponse.json();
const installer = (release.assets || []).find((asset) =>
  /^MatrixMedia-DAM-.*-win-x64\.exe$/i.test(asset.name || "")
);
if (!installer || !installer.browser_download_url) {
  throw new Error(`Release ${tag} 中没有 Windows x64 安装包`);
}

const apiUrl =
  process.env.DAM_CLIENT_VERSION_API ||
  "https://dam.guocio.cn/api-v2/app/client-version";
const policyResponse = await fetch(apiUrl, {
  method: "PUT",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${policyToken}`
  },
  body: JSON.stringify({
    minVersion: "",
    latestVersion: version,
    downloadUrl: installer.browser_download_url,
    notes: release.body || "本次版本更新已发布。",
    force: false
  })
});
if (!policyResponse.ok) {
  const detail = await policyResponse.text();
  throw new Error(`更新线上客户端版本策略失败：HTTP ${policyResponse.status} ${detail}`);
}

console.log(`线上客户端升级提示已更新至 ${version}`);
