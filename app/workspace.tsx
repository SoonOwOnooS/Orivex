'use client';
import { useI18n, LanguageSwitch } from '../lib/i18n';
import { useState, useEffect } from 'react';
import {
  Fingerprint,
  Plus,
  Search,
  ScanLine,
  Clock3,
  GitBranch,
  ShieldCheck,
  FileCheck2,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import Compare from './compare';
import { readResponse } from '../lib/client';
import Reviews from './reviews';
import { registerTools } from '../lib/webmcp';
export type Game = {
  id: string;
  title: string;
  developer: string;
  published: string;
  announced: string;
  source_url: string;
  description: string;
};
export type User = { id: string; name: string; defaultName?: boolean } | null;
// Main screen: game list, comparison tools, and community reviews.
export default function Workspace({
  user,
  signIn,
  signOut,
}: {
  user: User;
  signIn: string;
  signOut: string;
}) {
  const { t, locale } = useI18n();
  // React state is screen data. Updating it redraws the screen.
  const [tab, setTab] = useState('games');
  const [games, setGames] = useState<Game[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  // Load the shared game list from the server.
  async function refresh() {
    try {
      const response = await fetch('/api/games');
      const data = await readResponse<{ games: Game[] }>(response);
      setGames(data.games);
    } catch (error) {
      setError(error instanceof Error ? error.message : t('数据暂时不可用'));
    } finally {
      setLoading(false);
    }
  }
  // Fetch the game list when this screen opens.
  useEffect(() => {
    void refresh();
  }, []);
  // Optional browser tools can read games or open the form. They cannot save it.
  useEffect(
    () =>
      registerTools(
        () => ({ games }),
        () => {
          if (!user) {
            throw Error(t('请先登录'));
          }
          setModal(true);
        },
      ),
    [games, user, locale],
  );
  // Save the form. Keep the inputs if the server rejects it.
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await readResponse<{ id: string }>(response);
      setModal(false);
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('保存失败，输入已保留'));
    } finally {
      setBusy(false);
    }
  }
  // Search only changes what is shown; it does not change stored games.
  const visible = games.filter((game) =>
    (game.title + game.developer).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="shell">
      <header className="topbar">
        <a href="/" className="brand">
          <span className="brandmark">
            <Fingerprint size={25} />
          </span>
          <span>
            Orivex<small>GAME EVIDENCE</small>
          </span>
        </a>
        <nav aria-label={t('主导航')}>
          {[
            ['games', t('游戏时间线')],
            ['compare', t('对照工作台')],
            ['reviews', t('审核记录')],
          ].map(([tabId, label]) => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              className={tab === tabId ? 'active' : ''}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="account">
          <LanguageSwitch />
          <a
            href="https://github.com/SoonOwOnooS/Orivex"
            target="_blank"
            rel="noreferrer"
            className="source-link"
          >
            <GitBranch size={16} />
            {t('开源代码')}
          </a>
          {user ? (
            <>
              <span>{user.defaultName ? t('已登录成员') : user.name}</span>
              <form method="post" action={signOut} target="_top">
                <button className="button small ghost">{t('退出')}</button>
              </form>
            </>
          ) : (
            <a className="button small" href={signIn} target="_top">
              {t('GitHub 登录')}
            </a>
          )}
        </div>
      </header>
      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">{t('独立游戏 · 创作证据库')}</p>
            <h1>{t('让创作有迹可循。')}</h1>
            <p>{t('记录公开时间，核对相似之处，为每一份判断保留依据。')}</p>
          </div>
          <div className="intro-note">
            <ShieldCheck size={21} />
            <span>
              {t('证据先于结论')}
              <small>{t('AI 辅助对照，社区独立审核')}</small>
            </span>
          </div>
        </section>
        <div className="stats">
          <div>
            <span>{t('已登记游戏')}</span>
            <strong>{games.length.toString().padStart(2, '0')}</strong>
            <Fingerprint />
          </div>
          <div>
            <span>{t('时间来源')}</span>
            <strong>
              {games
                .filter((game) => game.source_url)
                .length.toString()
                .padStart(2, '0')}
            </strong>
            <Clock3 />
          </div>
          <div>
            <span>{t('访问方式')}</span>
            <strong className="word">{t('公开浏览')}</strong>
            <ShieldCheck />
          </div>
        </div>
        {error && (
          <div role="alert" className="alert">
            {t(error)}
            <button
              onClick={() => {
                setError('');
                void refresh();
              }}
            >
              {t('重试')}
            </button>
          </div>
        )}
        {tab === 'games' ? (
          <div className="workspace-grid">
            <section className="panel ledger">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">REGISTRY / 01</p>
                  <h2>{t('游戏时间线')}</h2>
                </div>
                {user ? (
                  <button className="button" onClick={() => setModal(true)}>
                    <Plus size={16} />
                    {t('登记游戏')}
                  </button>
                ) : (
                  <a className="button" href={signIn} target="_top">
                    <Plus size={16} />
                    {t('登录后登记')}
                  </a>
                )}
              </div>
              <div className="filterbar">
                <div className="search">
                  <Search size={17} />
                  <input
                    aria-label={t('搜索游戏或开发者')}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t('搜索游戏或开发者')}
                  />
                </div>
                <span>{t('按登记时间排序')}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('游戏 / 开发者')}</th>
                      <th>{t('首次宣传')}</th>
                      <th>{t('正式发布')}</th>
                      <th>{t('时间证据')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((game) => (
                      <tr key={game.id}>
                        <td>
                          <strong>{game.title}</strong>
                          <small>{game.developer}</small>
                          <details>
                            <summary>{t('创意描述')}</summary>
                            <p style={{ maxWidth: 280, whiteSpace: 'pre-wrap' }}>
                              {game.description}
                            </p>
                          </details>
                        </td>
                        <td>{game.announced || t('未提供')}</td>
                        <td>{game.published || t('未发布 / 未提供')}</td>
                        <td>
                          <a href={game.source_url} target="_blank" rel="noreferrer">
                            {t('查看来源')}
                            <ExternalLink size={13} />
                          </a>
                          <small>{t('提交者提供 · 待核实')}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!visible.length && (
                <div className="empty">
                  <span className="empty-icon">
                    <Fingerprint size={32} />
                  </span>
                  <h3>{loading ? t('正在读取时间线') : t('第一条时间线，从这里开始')}</h3>
                  <p>
                    {query ? t('没有匹配的游戏。') : t('登记作品的公开日期与来源，帮助后续对照。')}
                  </p>
                  <button
                    className="text-button"
                    onClick={() => (user ? setModal(true) : location.assign(signIn))}
                  >
                    {t('登记一款游戏')}
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
              <div className="panel-foot">
                <Clock3 size={15} />
                {t('日期先后是核查线索，不能单独证明创作归属。')}
              </div>
            </section>
            <aside className="sidebar">
              <section className="panel side-card">
                <p className="eyebrow">REVIEW PROTOCOL</p>
                <h2>{t('每一步，都能核对')}</h2>
                <ol className="steps">
                  {[
                    [t('登记公开时间'), t('保留游戏页面、宣传链接与日期。')],
                    [t('对照具体证据'), t('创意特征、宣传文案与视频画面。')],
                    [t('独立参与审核'), t('说明判断理由，允许回应和更正。')],
                  ].map(([t, data], stepIndex) => (
                    <li key={t}>
                      <b>0{stepIndex + 1}</b>
                      <div>
                        <strong>{t}</strong>
                        <p>{data}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <button className="button ghost wide" onClick={() => setTab('compare')}>
                  <ScanLine size={16} />
                  {t('打开对照工作台')}
                </button>
              </section>
              <section className="principle">
                <div>
                  <FileCheck2 size={21} />
                  <h3>{t('相似度，不是抄袭概率')}</h3>
                </div>
                <p>
                  {t(
                    '同类型玩法、共同授权素材与独立创作，都可能产生相似内容。分数需要结合可核对的证据阅读。',
                  )}
                </p>
                <button className="text-button" onClick={() => setTab('method')}>
                  {t('查看评估方法')}
                  <ChevronRight size={14} />
                </button>
              </section>
            </aside>
          </div>
        ) : tab === 'method' ? (
          <section className="panel method">
            <p className="eyebrow">METHOD / v1.0</p>
            <h2>{t('怎样阅读评估')}</h2>
            <p>
              {t(
                '创意描述使用多语言语义向量；视频使用 CLIP 视觉向量，寻找抽样画面之间的对应。余弦相似度范围为 -1 至 1，越高表示模型特征越接近，不代表复制发生的概率。',
              )}
            </p>
            <h3>{t('视频分析范围')}</h3>
            <p>
              {t(
                '完整文件在浏览器中解码，默认每段抽取 12 帧，可选择 24 帧。原视频不会上传；报告包含采样时间点、文件 SHA-256 和最接近的画面对。未检测音频、完整镜头顺序、代码或 AI 使用情况；短暂画面和快速剪辑可能漏检。',
              )}
            </p>
            <h3>{t('多人审核')}</h3>
            <p>
              {t(
                '提交者不能审核自己的对照。每个账户每条对照只能保留一份审核意见，修订会留痕。两名独立审核者意见一致时显示“多人意见一致”；仍然不是法律认定。相关方可以登录提交回应与补充证据。',
              )}
            </p>
            <h3>{t('公开范围')}</h3>
            <p>
              {t(
                '登记与已发布对照公开可见。发布后展示文字说明、相似度、采样时间、文件指纹和审核记录；原视频和采样图片始终留在本机。请仅公开有权分享的文字与数据。',
              )}
            </p>
            <a
              href="https://github.com/SoonOwOnooS/Orivex"
              target="_blank"
              rel="noreferrer"
              className="button ghost"
            >
              {t('查看 MIT 开源代码')}
            </a>
          </section>
        ) : tab === 'compare' ? (
          <Compare
            games={games}
            user={user}
            signIn={signIn}
            onPublished={() => setTab('reviews')}
          />
        ) : (
          <Reviews user={user} signIn={signIn} />
        )}
      </main>
      <footer>
        <span>{t('Orivex · 让独立创作者的证据被看见')}</span>
        <div>
          <button onClick={() => setTab('method')}>{t('评估方法')}</button>
          <a href="https://github.com/SoonOwOnooS/Orivex" target="_blank" rel="noreferrer">
            {t('MIT 开源')}
          </a>
          <span>{t('相似线索不等于侵权认定')}</span>
        </div>
      </footer>
      {modal && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-title"
          >
            <div className="panel-head">
              <h2 id="register-title">{t('登记游戏')}</h2>
              <div className="dialog-controls">
                <LanguageSwitch />
                <button
                  className="icon-button"
                  aria-label={t('关闭')}
                  onClick={() => setModal(false)}
                >
                  <X />
                </button>
              </div>
            </div>
            <form onSubmit={save}>
              {error && (
                <div className="alert" role="alert">
                  {t(error)}
                </div>
              )}
              <label>
                {t('游戏名称')}
                <input name="title" required maxLength={100} autoFocus />
              </label>
              <label>
                {t('开发者 / 工作室')}
                <input name="developer" required maxLength={100} />
              </label>
              <div className="form-grid">
                <label>
                  {t('首次宣传日期')}
                  <input name="announced" type="date" />
                </label>
                <label>
                  {t('正式发布日期')}
                  <input name="published" type="date" />
                </label>
              </div>
              <label>
                {t('时间证据链接')}
                <input name="source_url" type="url" required placeholder="https://…" />
              </label>
              <label>
                {t('创意与玩法描述')}
                <textarea
                  name="description"
                  required
                  minLength={20}
                  maxLength={4000}
                  rows={4}
                  placeholder={t('描述核心循环、交互规则和独特之处，至少 20 字。')}
                />
              </label>
              <p className="muted">{t('日期标记为提交者提供，保留来源等待核实。')}</p>
              <button className="button wide" disabled={busy}>
                {busy ? t('正在保存…') : t('保存到公开时间线')}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
