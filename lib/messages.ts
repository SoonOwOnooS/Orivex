export type Locale = 'zh' | 'en';
// Chinese UI text is the lookup key. Add its English text here.
export const english: Record<string, string> = {
  标题: 'Title',
  数据暂时不可用: 'Data is temporarily unavailable',
  请先登录: 'Please sign in first',
  '保存失败，输入已保留': 'Could not save. Your input has been preserved.',
  溯游: 'Orivex',
  主导航: 'Main navigation',
  游戏时间线: 'Game timeline',
  对照工作台: 'Compare',
  审核记录: 'Reviews',
  开源代码: 'Source code',
  退出: 'Sign out',
  登录参与: 'Sign in',
  '公开视频报告只保留采样时间、文件指纹和相似度，不包含采样图片。核查画面需要取得原视频；仅凭分数无法确认复制。':
    'Public video reports contain sample times, fingerprints, and similarity scores without images. To verify visuals, obtain the original videos. Scores alone cannot establish copying.',
  'GitHub 登录': 'Sign in with GitHub',
  '查看 MIT 开源代码': 'View MIT source code',
  '独立游戏 · 创作证据库': 'INDIE GAMES · EVIDENCE REGISTRY',
  '让创作有迹可循。': 'Give creativity a traceable history.',
  '记录公开时间，核对相似之处，为每一份判断保留依据。':
    'Record public dates, compare similarities, and keep evidence behind each assessment.',
  证据先于结论: 'Evidence before conclusions',
  'AI 辅助对照，社区独立审核': 'AI-assisted comparison, independent community review',
  已登记游戏: 'Registered games',
  时间来源: 'Date sources',
  访问方式: 'Access',
  公开浏览: 'Public browsing',
  重试: 'Retry',
  登记游戏: 'Register a game',
  登录后登记: 'Sign in to register',
  搜索游戏或开发者: 'Search games or developers',
  按登记时间排序: 'Newest registrations first',
  '游戏 / 开发者': 'Game / developer',
  首次宣传: 'First announced',
  正式发布: 'Released',
  时间证据: 'Date evidence',
  创意描述: 'Creative description',
  未提供: 'Not provided',
  '未发布 / 未提供': 'Unreleased / not provided',
  查看来源: 'View source',
  '提交者提供 · 待核实': 'Submitter-provided · unverified',
  正在读取时间线: 'Loading the timeline',
  '第一条时间线，从这里开始': 'Start the first game timeline',
  '没有匹配的游戏。': 'No matching games.',
  '登记作品的公开日期与来源，帮助后续对照。':
    'Register public dates and their sources for future comparisons.',
  登记一款游戏: 'Register a game',
  '日期先后是核查线索，不能单独证明创作归属。':
    'Date order is a lead for review; it cannot establish authorship on its own.',
  '每一步，都能核对': 'Make every step verifiable',
  登记公开时间: 'Record public dates',
  '保留游戏页面、宣传链接与日期。': 'Keep game pages, announcement links, and dates.',
  对照具体证据: 'Compare specific evidence',
  '创意特征、宣传文案与视频画面。':
    'Compare creative features, promotional copy, and video frames.',
  独立参与审核: 'Review independently',
  '说明判断理由，允许回应和更正。': 'Explain your reasoning and allow responses and corrections.',
  打开对照工作台: 'Open comparison workspace',
  '相似度，不是抄袭概率': 'Similarity, not plagiarism probability',
  '同类型玩法、共同授权素材与独立创作，都可能产生相似内容。分数需要结合可核对的证据阅读。':
    'Shared genres, licensed assets, and independent creation can produce similar content. Read scores alongside verifiable evidence.',
  查看评估方法: 'View methodology',
  怎样阅读评估: 'How to read an assessment',
  '创意描述使用多语言语义向量；视频使用 CLIP 视觉向量，寻找抽样画面之间的对应。余弦相似度范围为 -1 至 1，越高表示模型特征越接近，不代表复制发生的概率。':
    'Creative descriptions use multilingual semantic embeddings. Video comparisons use CLIP visual embeddings to match sampled frames. Cosine similarity ranges from -1 to 1: a higher value means closer model features, not a probability that copying occurred.',
  视频分析范围: 'Video analysis coverage',
  '完整文件在浏览器中解码，默认每段抽取 12 帧，可选择 24 帧。原视频不会上传；报告包含采样时间点、文件 SHA-256 和最接近的画面对。未检测音频、完整镜头顺序、代码或 AI 使用情况；短暂画面和快速剪辑可能漏检。':
    'Complete files are decoded in your browser, with 12 frames sampled per video by default, or 24 if selected. Original videos are not uploaded. Reports include timestamps, SHA-256 file fingerprints, and the closest frame pairs. Audio, full shot order, code, and AI use are not analyzed. Brief scenes and fast cuts may be missed.',
  多人审核: 'Community review',
  '提交者不能审核自己的对照。每个账户每条对照只能保留一份审核意见，修订会留痕。两名独立审核者意见一致时显示“多人意见一致”；仍然不是法律认定。相关方可以登录提交回应与补充证据。':
    'Submitters cannot review their own comparisons. Each account has one current opinion per comparison, with revisions recorded. Agreement from at least two reviewer accounts is marked as community agreement; it is not a legal finding or proof of distinct people. Parties can sign in to respond and add evidence.',
  公开范围: 'What becomes public',
  '登记与已发布对照公开可见。发布后展示文字说明、相似度、采样时间、文件指纹和审核记录；原视频和采样图片始终留在本机。请仅公开有权分享的文字与数据。':
    'Registrations and published comparisons are public. Published reports show text, similarity scores, sample times, file fingerprints, and reviews. Original videos and sampled images stay on your device. Share only text and data you have the right to publish.',
  '下载 MIT 开源代码': 'Download MIT-licensed source',
  '溯游 · 让独立创作者的证据被看见': "Orivex · Make independent creators' evidence visible",
  'Orivex · 让独立创作者的证据被看见': "Orivex · Make independent creators' evidence visible",
  评估方法: 'Methodology',
  'MIT 开源': 'MIT open source',
  相似线索不等于侵权认定: 'Similarity is not a finding of infringement',
  关闭: 'Close',
  游戏名称: 'Game title',
  '开发者 / 工作室': 'Developer / studio',
  首次宣传日期: 'First announcement date',
  正式发布日期: 'Release date',
  时间证据链接: 'Date evidence URL',
  创意与玩法描述: 'Creative and gameplay description',
  '描述核心循环、交互规则和独特之处，至少 20 字。':
    'Describe the core loop, interaction rules, and distinctive features. At least 20 characters.',
  '日期标记为提交者提供，保留来源等待核实。':
    'Dates are marked as submitter-provided, with sources kept for verification.',
  '正在保存…': 'Saving…',
  保存到公开时间线: 'Save to public timeline',
  未评估: 'Not assessed',
  '模型特征余弦相似度 · 非抄袭概率': 'Model feature cosine similarity · not plagiarism probability',
  '作品A {0}秒采样画面': 'Work A: sampled frame at {0}s',
  '作品B {0}秒采样画面': 'Work B: sampled frame at {0}s',
  视觉特征相似度: 'Visual feature similarity ',
  '视频对照需要同时提供两段完整视频。':
    'Please provide both complete videos for a video comparison.',
  '请提供两段至少 20 字的创意描述，或同时提供两段视频。':
    'Provide two creative descriptions of at least 20 characters each, or two videos.',
  '有效画面不足：黑场和单色画面已排除，请提供至少包含三帧有效画面的宣传视频。':
    'Too few usable frames. Blank and flat-color frames were excluded. Please provide videos with at least three usable sampled frames each.',
  '准备开源模型；首次运行需要下载模型，通常需要几分钟。':
    'Preparing open-source models. The first run downloads model files and may take a few minutes.',
  '模型特征相似度无法确认复制行为、侵权或是否使用 AI。':
    'Model feature similarity cannot confirm copying, infringement, or AI use.',
  '视频采用均匀抽样，未分析音轨与完整镜头顺序。':
    'Videos are sampled evenly. Audio and full shot order are not analyzed.',
  '创意描述仅比较前 800 字符，模型可能进一步截断。':
    'Only the first 800 characters of each description are compared; the model may truncate them further.',
  '共同题材、授权素材、黑场和视觉风格可能影响相似度。':
    'Shared themes, licensed assets, blank frames, and visual styles may affect similarity.',
  '报告由提交者浏览器生成，尚未独立验证。':
    "This report was generated in the submitter's browser and has not been independently verified.",
  '已排除单色画面：A {0} 帧，B {1} 帧。': 'Flat-color frames excluded: A {0}, B {1}.',
  '分析完成。请核对画面对与分析范围，再决定是否发布。':
    'Analysis complete. Check the frame pairs and coverage before deciding whether to publish.',
  分析失败: 'Analysis failed',
  发布失败: 'Could not publish',
  创意与宣传视频对照: 'Compare ideas and promotional videos',
  '选择两款作品，或直接输入描述与视频进行本地分析。视频与采样图片仅留在本机；发布时只提交文字、相似度、采样时间和文件指纹。':
    'Select two works, or enter descriptions and videos for local analysis. Videos and sampled images stay on your device. Publishing sends only text, similarity scores, sample times, and file fingerprints.',
  作品: 'Work ',
  参考作品: 'Reference work',
  待比较作品: 'Work to compare',

  '选择游戏（发布报告时必填）': 'Select a game (required to publish)',
  '创意 / 宣传文案': 'Creative description / promotional copy',
  '描述核心循环、规则与独特之处。文本对照至少 20 字。':
    'Describe the core loop, rules, and distinctive features. At least 20 characters for text comparison.',
  完整宣传视频: 'Complete promotional video',
  '浏览器支持的 MP4 / WebM · 100 MB / 10 分钟以内':
    'Browser-supported MP4 / WebM · up to 100 MB and 10 minutes',
  每段视频采样: 'Samples per video',
  '12 帧 · 标准': '12 frames · standard',
  '24 帧 · 更密集': '24 frames · denser',
  '正在分析…': 'Analyzing…',
  '开始 AI 对照': 'Start AI comparison',
  '首次分析需要联网下载开源模型，后续可复用浏览器缓存。分析耗时取决于设备和网络。':
    'The first analysis requires an internet connection to download open-source models. Later runs can reuse your browser cache. Processing time depends on your device and connection.',
  '对照结果 · 待人工核查': 'Comparison results · pending human review',
  创意语义相似度: 'Creative semantic similarity',
  抽样画面平均匹配相似度: 'Average sampled-frame match similarity',
  '有效帧；B': 'usable frames; B ',
  '有效帧。设定采样间隔 A': 'usable frames. Planned sample interval: A ',
  's。未处理音轨。': 's. Audio not analyzed.',
  需要核查的方向: 'What to examine',
  '逐一检查对应画面是否包含同一素材、相同构图或连续复制迹象；再核实时间来源、授权素材与差异。模型无法仅凭高分判断复制。':
    'Examine each frame pair for shared assets, matching composition, or signs of continuous copying. Then verify dates, asset licenses, and differences. A high score alone cannot establish copying.',
  导出分析报告: 'Export report',
  提交社区审核: 'Submit for community review',
  '报告将公开显示为“提交者设备生成 · 待核查”。请选择已登记的不同游戏，并说明具体依据。':
    'Published reports are marked as device-generated and unverified. Select two different registered games and explain the specific evidence.',
  证据说明: 'Evidence notes',
  '指出对应时间点、素材及可能的其他解释，至少 20 字。':
    'Identify timestamps, assets, and possible alternative explanations. At least 20 characters.',
  '我有权公开报告中的文字与数据，已核对说明与来源。':
    'I have the right to publish the report text and data and have checked the notes and sources.',
  '发布对照，等待审核': 'Publish for review',
  登录后发布对照: 'Sign in to publish',
  有具体相似证据: 'Specific similarity evidence',
  存在重要差异: 'Significant differences',
  证据不足: 'Insufficient evidence',
  社区审核记录: 'Community reviews',
  最新: 'Latest ',
  条对照: ' comparisons',
  '公开的是相似证据与审核意见。AI 使用情况、复制行为和侵权均需另行核实。':
    'Published material consists of similarity evidence and review opinions. AI use, copying, and infringement require separate verification.',
  还没有发布的对照: 'No published comparisons yet',
  '在对照工作台完成分析后，可以提交具体证据供社区核查。':
    'Analyze works in the comparison workspace, then submit specific evidence for community review.',
  读取失败: 'Could not load data',
  提交失败: 'Could not submit',
  与: 'and',
  多人意见一致: 'Community agreement',
  审核意见已记录: 'Reviews recorded',
  待独立核查: 'Pending independent review',
  '提交 ·': 'submitted · ',
  '· 报告由提交者设备生成，尚未独立验证': ' · Device-generated report, not independently verified',
  收起详情: 'Hide details',
  查看证据与参与审核: 'View evidence and review',
  抽样画面匹配相似度: 'Sampled-frame match similarity',
  实际参与比较的创意文本: 'Creative text used in this comparison',
  未评估文本: 'Text not assessed',
  '视频采样：A': 'Video samples: A ',
  '帧 / B': 'frames / B ',
  '帧；未处理音轨。': 'frames; audio not analyzed. ',
  '分析范围、局限与文件指纹': 'Coverage, limitations, and file fingerprints',
  未提供视频: 'No video provided',
  审核意见: 'Review opinions ',
  回应与补充证据: 'Responses and additional evidence',
  补充来源: 'Additional source',
  '审核修订记录（': 'Review revision history (',
  参与方式: 'Contribution type',
  '独立审核（提交者不可自审）': 'Independent review (no self-review)',
  '回应 / 申诉 / 补充证据': 'Response / appeal / additional evidence',
  判断: 'Assessment',
  具体理由: 'Specific reasons',
  回应说明: 'Response',
  '补充来源（可选）': 'Additional source (optional)',
  '保存中…': 'Saving…',
  提交意见并保留记录: 'Submit and keep a record',
  登录后参与审核与回应: 'Sign in to review or respond',
  '模型向量格式不一致。': 'The model returned incompatible embeddings.',
  '模型返回了空向量。': 'The model returned an empty embedding.',
  '视频解码超时，请使用浏览器支持的 MP4 或 WebM 文件。':
    'Video decoding timed out. Please use an MP4 or WebM file supported by your browser.',
  '浏览器无法解码这段视频，请转换为 MP4 或 WebM。':
    'Your browser cannot decode this video. Please convert it to MP4 or WebM.',
  '每段视频上限 100 MB。': 'Each video must be 100 MB or smaller.',
  '请选择视频文件。': 'Please select a video file.',
  '每段视频最长 10 分钟，且必须具有可读取的时长。':
    'Each video must be no longer than 10 minutes and have a readable duration.',
  '计算视频文件指纹…': 'Calculating the video file fingerprint…',
  '浏览器不支持画面抽取。': 'Your browser does not support frame extraction.',
  '抽取 {0}：{1} / {2} 帧': 'Extracting frames from {0}: {1} / {2}',
  '模型分析超过 10 分钟，请减少采样或检查模型下载连接。':
    'Analysis exceeded 10 minutes. Please reduce the sample count or check your connection.',
  '模型启动失败：{0}': 'The model could not start: {0}',
  '下载开源模型：{0} {1}%': 'Downloading the open-source model: {0} {1}%',
  '正在比较创意描述…': 'Comparing creative descriptions…',
  '分析视频画面 {0} / {1}': 'Analyzing video frames: {0} / {1}',
  '开源模型加载或分析失败：{0}。请检查网络和浏览器内存后重试。':
    'Model loading or analysis failed: {0}. Please check your connection and available browser memory, then try again.',
  '服务器暂时没有返回有效数据，请稍后重试。':
    'The server returned an invalid response. Please try again later.',
  '请求失败，请稍后重试。': 'The request failed. Please try again later.',
  '数据库暂时不可用，请稍后重试。':
    'The database is temporarily unavailable. Please try again later.',
  '证据存储暂时不可用，请稍后重试。':
    'Evidence storage is temporarily unavailable. Please try again later.',
  '请从本站页面提交。': 'Please submit through this website.',
  '请先登录后再提交。': 'Please sign in before submitting.',
  '提交内容过大。': 'The submission is too large.',
  '提交内容不能为空。': 'The submission cannot be empty.',
  '提交格式无效。': 'The submission format is invalid.',
  '请检查必填内容、日期和链接格式。': 'Please check the required fields, dates, and links.',
  '保存或读取暂时失败，请稍后重试，输入不会被清空。':
    "We couldn't save or load the data. Please try again later. Your input has been preserved.",
  '今天的提交次数已达到上限，请明天再试。':
    "You've reached the submission limit for the past 24 hours. Please try again later.",
  '过去 24 小时的提交次数已达到上限，请稍后再试。':
    "You've reached the submission limit for the past 24 hours. Please try again later.",
  '成员 {0}': 'Member {0}',
  已登录成员: 'Signed-in member',
  读取已登记游戏: 'List registered games',
  '读取当前游戏时间线中的游戏和公开日期，不修改数据。':
    'Read games and public dates in the current timeline without changing data.',
  参数必须为空对象: 'The input must be an empty object',
  打开游戏登记表: 'Open game registration',
  '打开当前用户的游戏登记表，仅开始填写，不会提交或创建记录。':
    "Open the current user's game registration form without submitting or creating a record.",
  '这款游戏与来源已经登记过。': 'This game and source have already been registered.',
  '请选择两款不同游戏。': 'Please select two different games.',
  '游戏记录不存在，请重新选择。': 'The game records could not be found. Please select them again.',
  '画面文件格式或尺寸无效。': 'The frame image format or dimensions are invalid.',
  '请提供对照编号。': 'Please provide a comparison ID.',
  '这条对照不存在。': 'This comparison could not be found.',
  '提交者不能审核自己的对照，可在回应中补充证据。':
    'Submitters cannot review their own comparisons. You can add evidence in a response.',
  '证据不存在。': 'This evidence could not be found.',
  '证据尚未发布。': 'This evidence has not been published.',
  游戏档案: 'Game archives',
  '独立游戏 · 创作档案': 'INDIE GAMES · CREATOR ARCHIVES',
  '看见游戏背后的创作者。': 'Meet the people behind the games.',
  '了解创作故事、公开时间与同人文化，找到值得支持的作品。':
    'Explore game stories, public dates, and fan works. Find creators to support.',
  从故事到支持: 'From stories to support',
  '保留来源，认识创作者': 'Keep sources. Meet creators.',
  排序方式: 'Sort by',
  最近登记: 'Recently added',
  较早公开的来源: 'Earlier public sources',
  查看创作档案: 'Explore the archive',
  '登记游戏，再补充它的故事、来源与支持链接。':
    'Add a game, then share its story, sources, and support links.',
  认识一款游戏的来历: 'Discover a game’s story',
  创作故事: 'Creation stories',
  证据时间线: 'Source timeline',
  同人文化: 'Fan culture',
  支持创作者: 'Support the creator',
  '了解灵感、开发过程与设计变化。': 'Explore ideas, development, and design changes.',
  '从公开帖子、开发日志与首秀了解创作轨迹。': 'Follow public posts, dev logs, and first reveals.',
  '发现同人创作，保留作者与原始作品的联系。':
    'Discover fan works and credit their creators and source games.',
  'Orivex · 让游戏创作者被看见': 'Orivex · Help game creators be seen',
  '所属系列（可选）': 'Series (optional)',
  同系列游戏使用相同名称: 'Use the same name for games in one series',
  公开点子: 'Public idea',
  开发日志: 'Dev log',
  首次展示: 'First reveal',
  其他记录: 'Other source',
  同人游戏: 'Fan game',
  绘画: 'Art',
  音乐: 'Music',
  视频: 'Video',
  文字作品: 'Writing',
  其他二创: 'Other fan work',
  '购买 / 愿望单': 'Buy / Wishlist',
  试玩: 'Play a demo',
  开发者主页: 'Creator page',
  来源支持日期: 'Source supports date',
  需要更多证据: 'More evidence needed',
  来源与日期不符: 'Source does not match date',
  返回游戏档案: 'Back to game archives',
  '正在读取创作档案…': 'Loading the archive…',
  '请复制浏览器地址来分享这份档案。': 'Copy the browser address to share this archive.',
  链接已复制: 'Link copied',
  分享档案: 'Share archive',
  档案内容: 'Archive sections',
  添加记录: 'Add a record',
  登录后添加: 'Sign in to add',
  '记录灵感、开发过程和设计变化，并保留作者与原始来源。':
    'Share ideas, development, and design changes. Credit the author and link the original source.',
  '按公开日期排列。核查投票针对来源与日期；更正后需要重新核查。':
    'Sorted by public date. Votes check sources and dates. Corrections need new checks.',
  '同人作品属于各自的创作者。本区也展示关联游戏与同系列的二创。':
    'Fan works belong to their creators. This section also shows works linked to related games and the same series.',
  '前往作品或创作者的外部页面。链接由社区提供，请核对来源。':
    'Visit the game or creator’s page. Community members provide these links. Check their sources.',
  这里还没有记录: 'No records yet',
  '从一段创作故事或一条可核对的来源开始。':
    'Start with a creation story or a source people can check.',
  '当前展示最新的 250 条档案记录。': 'Showing the latest 250 archive records.',
  找到作品与创作者: 'Find the game and creator',
  '从了解一款游戏，到试玩、加入愿望单或支持开发者。':
    'Discover a game, try it, wishlist it, or support its creator.',
  '还没有收录支持链接。': 'No support links yet.',
  查看支持链接: 'View support links',
  让游戏背后的人被看见: 'Help the people behind games be seen',
  '公开时间、创作故事与同人文化，一起组成作品的来历。':
    'Public dates, creation stories, and fan culture tell a game’s story.',
  '撤回这条记录？它将不再公开展示。': 'Withdraw this record? It will no longer be shown publicly.',
  非官方同人作品: 'Unofficial fan work',
  '原作者：': 'Original creator: ',
  打开链接: 'Open link',
  查看原始来源: 'View original source',
  社区收录: 'Added by the community',
  '版本 {0}': 'Version {0}',
  等待其他成员核查: 'Waiting for other members to check',
  修改核查意见: 'Edit your check',
  核查来源与日期: 'Check source and date',
  登录后核查: 'Sign in to check',
  查看更正与核查记录: 'View corrections and checks',
  更正记录: 'Correct record',
  撤回记录: 'Withdraw record',
  核查意见: 'Your check',
  保存核查意见: 'Save your check',
  '正在读取记录…': 'Loading records…',
  '原作者 / 创作者': 'Original author / Creator',
  记录类型: 'Record type',
  公开日期: 'Public date',
  创作故事与设计变化: 'Creation story and design changes',
  内容说明: 'Description',
  外部链接: 'External link',
  原始来源链接: 'Original source link',
  '也关联这些游戏（最多 4 款）': 'Also link these games (up to 4)',
  尚无其他已登记游戏: 'No other games have been added',
  更正原因: 'Reason for correction',
  保存更正并保留历史: 'Save correction and keep history',
  保存到创作档案: 'Save to archive',
  首次收录: 'First record',
  '这条档案记录不存在。': 'This archive record does not exist.',
  '这条时间线记录不存在。': 'This timeline record does not exist.',
  '提交者不能核查自己的时间线记录。': 'You cannot check your own timeline record.',
  '记录已更正，请刷新后重新核查。': 'This record was corrected. Refresh before checking it.',
  '这个来源已经收录，请查看现有记录。': 'This source is already listed. View the existing record.',
  '只能修改自己提交的档案记录。': 'You can only edit records you submitted.',
  '更正不能改变记录类型或所属游戏。':
    'A correction cannot change the record type or its main game.',
  '记录已变化或不属于你，请刷新后重试。':
    'This record changed or belongs to another member. Refresh and try again.',
};

// Also allow messages already translated into English to switch back to Chinese.
const reversed = Object.fromEntries(Object.entries(english).map(([zh, en]) => [en, zh]));
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Match messages that already contain values, such as a download percentage.
const patterns = Object.entries(english)
  .filter(([key]) => /\{\d+\}/.test(key))
  .map(([zh, en]) => ({
    zh,
    en,
    zhPattern: new RegExp(
      '^' +
        zh
          .split(/\{\d+\}/)
          .map(escape)
          .join('([\\s\\S]*?)') +
        '$',
    ),
    enPattern: new RegExp(
      '^' +
        en
          .split(/\{\d+\}/)
          .map(escape)
          .join('([\\s\\S]*?)') +
        '$',
    ),
  }));

// Translate the template, then fill {0}, {1}, and other numbered values.
export function translate(message: string, locale: Locale, ...values: (string | number)[]): string {
  let result = locale === 'en' ? (english[message] ?? message) : (reversed[message] ?? message);
  if (!values.length && result === message) {
    for (const pattern of patterns) {
      const match = message.match(locale === 'en' ? pattern.zhPattern : pattern.enPattern);
      if (match) {
        result = locale === 'en' ? pattern.en : pattern.zh;
        values = match.slice(1);
        break;
      }
    }
  }
  return result.replace(/\{(\d+)\}/g, (token, index) =>
    values[Number(index)] === undefined ? token : String(values[Number(index)]),
  );
}

export function clientLocale(): Locale {
  return typeof document !== 'undefined' && document.documentElement.lang.startsWith('en')
    ? 'en'
    : 'zh';
}

export function localize(message: string, ...values: (string | number)[]) {
  return translate(message, clientLocale(), ...values);
}

// Translate the member label without changing its short ID.
export function formatMemberName(name: string, locale: Locale) {
  const match = name.match(/^(?:Member|成员) ([a-zA-Z0-9]{1,6})$/);
  return match ? (locale === 'en' ? 'Member ' : '成员 ') + match[1] : name;
}
