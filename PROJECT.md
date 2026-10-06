# Orivex

[English documentation](README.en.md)

一个 MIT 开源的游戏创作证据库。任何人都可公开浏览，使用 GitHub 登录后可登记游戏、提交对照、独立审核和回应。

## 已实现

- 支持中文与英文界面，根据浏览器请求语言选择首次显示，顶部可手动切换；语言偏好保留一年。切换不清空当前表单和分析报告。创作者原文保持原样。
- 记录首次宣传和正式发布日期、原始来源链接、创意描述；时间标记为提交者提供、待核实。
- 两段完整 MP4 / WebM 文件在浏览器内自动解码和均匀抽帧，每段 12 或 24 帧；每段上限 100 MB、10 分钟。单色画面排除。
- 浏览器 Worker 运行 CLIP ViT-B32 视觉特征模型和多语言 MiniLM 文本特征模型；无需 API 密钥。首次需要联网下载模型，文件原文与视频不会传给模型服务。
- 输出创意语义余弦相似度、视频抽样画面匹配相似度、6 组最高相似度画面对、时间点、采样数量、文件 SHA-256、分析版本和实际比较文本。
- 发布后将报告存入共享 D1，用户授权公开的采样画面存入 R2。支持多人独立审核、禁止自审、每个账户每条对照一份意见、保留修订历史、回应与补充来源。
- 服务端验证身份、同源提交、输入长度、日期、链接、图片格式和报告结构；提供每日提交额度。
- 不内置真实游戏的指控或编造评分；初始数据库为空。

## 方法与边界

相似度不是“抄袭概率”，没有使用人工标签做概率校准。模型不能确认复制行为、侵权或 AI 使用情况。共同题材、授权素材和类似构图可能导致高分。视频比较仅覆盖抽样画面，不处理音轨、连续镜头顺序、实际代码或未抽中的短片段。

创意文本最多使用前 800 个字符，模型分词器可能进一步截断。视频分数取 A 每帧到 B 最佳匹配和 B 每帧到 A 最佳匹配的平均；高分画面对用于人工复核，不构成抄袭判定。黑场与单色画面排除。

报告由提交者浏览器生成，不能防止恶意提交者伪造本地分数，页面明确标记尚未独立验证。两名账户的一致意见不保证账户对应不同自然人，仍需人工核查。该版本不具备管理员身份核验、投诉下架面板或完整内容治理系统；大规模公众运营前需要增加维护者流程。

首次模型下载可能较大、受网络限制，低内存设备可能失败；失败会明确显示，不会生成替代分数。浏览器缓存可复用模型。当前登记列表显示最新 200 条、对照列表显示最新 100 条，历史数据继续保存在数据库。

源代码采用 MIT；这不向读者授予用户提交的游戏素材、报告或视频画面的版权许可。下载包不包含真实数据、密钥或托管站点身份。

## 运行

项目使用 Vinext / React / TypeScript，运行于 Cloudflare Workers；共享持久化使用 D1 和 R2。Node >=22.13。

```sh
npm ci
npm run build
```

根目录 `wrangler.jsonc` 的 `migrations_dir` 指向 `drizzle/`。初始化本地数据库时应用其中所有 SQL 迁移，包括 `0002_github_auth.sql` 中的 `auth_sessions` 和 `oauth_states` 表：

```sh
npx wrangler d1 migrations apply DB --local --config wrangler.jsonc --persist-to .wrangler/state
```

复制本地变量示例，以下命令使用 PowerShell：

```powershell
Copy-Item -LiteralPath .dev.vars.example -Destination .dev.vars
```

Wrangler 按顺序执行迁移并记录已应用文件，后续仍使用同一命令应用新迁移。曾通过 `d1 execute --file` 手工迁移的旧数据库需要先核对迁移记录，不能直接重跑已有表的 SQL。修改 `db/schema.ts` 后，使用 `npm run db:generate` 生成并检查新迁移。

## GitHub 登录配置

在 GitHub 的开发者设置中创建 OAuth App，Homepage URL 填写网站地址，Authorization callback URL 填写 `AUTH_ORIGIN/auth/callback`。本地示例为 `http://127.0.0.1:5173/auth/callback`。开发与生产建议使用各自的 OAuth App。配置方法见 [GitHub OAuth App 文档](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)。

在项目根目录的 `.dev.vars` 中填写三个 Cloudflare Worker 运行时变量：

| 变量 | 值 |
| --- | --- |
| `AUTH_ORIGIN` | 实际访问网站的 origin，例如 `http://127.0.0.1:5173`；不包含路径 |
| `AUTH_GITHUB_CLIENT_ID` | GitHub OAuth App 的 Client ID |
| `AUTH_GITHUB_CLIENT_SECRET` | GitHub OAuth App 的 Client Secret，仅保存在本地私密文件或生产 secret 中 |

填好后运行以下命令，并打开 `http://127.0.0.1:5173`：

```sh
npm run dev
```

`npm run dev` 默认使用 `5173`；构建后用 `npm start` 运行的本地 Worker 默认使用 `8787`。`AUTH_ORIGIN`、实际浏览器地址和 OAuth App 回调地址必须使用相同主机与端口；`localhost` 与 `127.0.0.1` 不能混用。切换到 `npm start` 或修改端口时，同步更新 `.dev.vars` 的 origin 和 GitHub 回调地址。例如 `npm start` 对应 `AUTH_ORIGIN=http://127.0.0.1:8787` 和 `http://127.0.0.1:8787/auth/callback`。仅公开浏览时可将凭据留空；任一登录变量缺失时，登录和写入会拒绝执行。

应用只取 GitHub 公开的数字 ID 与登录名，不请求邮箱或仓库权限，也不保存 OAuth access token。登录会话存入 D1，8 小时后过期，可撤销；退出登录会撤销当前会话。每个写入 API 都会重新验证会话。权限范围说明见 [GitHub OAuth scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)。

## 自部署

`.orivex/hosting.json` 是本 fork 的配置，定义逻辑绑定 `DB` 和 `BUCKET`。目录已从 `.openai` 改为 `.orivex`，不直接兼容原 Sites 平台部署流程。根目录 `wrangler.jsonc` 提供 Cloudflare Workers 自部署配置；生产部署需绑定自己的 D1 数据库和 R2 存储桶，替换 D1 占位 UUID。源码不包含原站数据库、登录授权或托管项目身份。

可创建默认配置名称对应的资源，再将 D1 创建命令返回的 `database_id` 填入 `wrangler.jsonc`：

```sh
npx wrangler d1 create orivex-db
npx wrangler r2 bucket create orivex-evidence
```

在 `wrangler.jsonc` 的运行时 `vars` 中将 `AUTH_ORIGIN` 设置为网站的 HTTPS origin，将 `AUTH_GITHUB_CLIENT_ID` 设置为生产 OAuth App 的 Client ID；更新 GitHub 回调地址。然后应用生产迁移、重新构建并部署生成的 Worker 配置：

```sh
npx wrangler d1 migrations apply DB --remote --config wrangler.jsonc
npm run build
npx wrangler deploy --config dist/server/wrangler.json
npx wrangler secret put AUTH_GITHUB_CLIENT_SECRET --config wrangler.jsonc
```

`AUTH_GITHUB_CLIENT_SECRET` 用最后一条命令交互输入，不写入版本控制或客户端代码。迁移命令会应用包括 `0002` 在内的尚未执行迁移。本地 `.dev.vars` 仅用于开发，不会自动成为生产 secret。参见 [Cloudflare 环境变量](https://developers.cloudflare.com/workers/configuration/environment-variables/)与 [secrets](https://developers.cloudflare.com/workers/configuration/secrets/) 文档。

## 验证

`npm run build` 后运行 `npm run verify:api`，使用临时 Miniflare 数据库和隔离测试数据验证公开读取、登录限制、同源提交、输入校验、证据保存、禁止自审、唯一审核、修订历史和作者回应。常规开发与生产均使用 GitHub OAuth。测试不会连接或修改线上数据库。

首版已用 Chrome 实际下载并运行两个模型，验证完整 WebM 视频的自动抽帧与对照；桌面与 390px 移动视口均已检查。TypeScript 类型检查通过。可选 WebMCP 采用能力检测，当前浏览器未提供该能力，未验证其原生工具注册。

## 开源依赖与模型

- [Transformers.js 3.8.1](https://github.com/huggingface/transformers.js)：通过固定版本 jsDelivr ESM 加载。
- [CLIP ViT-B32 ONNX](https://huggingface.co/Xenova/clip-vit-base-patch32)
- [多语言 MiniLM-L12](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2)

模型权重遵守各自许可证，当前下载 main 分支；精确重现历史分析需另外固定权重版本。界面图标来自 Lucide。GitHub 用于登录，源码通过 ZIP 下载提供。
