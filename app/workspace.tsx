'use client';
import { useI18n, LanguageSwitch } from '../lib/i18n';
import { useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
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
import Archive from './archive';
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
  series: string;
  earliest_public?: string | null;
};
export type User = { id: string; name: string; defaultName?: boolean } | null;
// Read the game ID from the URL so each archive can be shared.
function selectedGame() {
  return new URLSearchParams(location.search).get('game') || '';
}
function watchNavigation(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
}
function openGame(id: string) {
  const url = new URL(location.href);
  if (id) url.searchParams.set('game', id);
  else url.searchParams.delete('game');
  history.pushState(null, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0 });
}
// Main screen: public archives, comparison tools, and community reviews.
export default function Workspace({
  user,
  signIn,
  signOut,
}: {
  user: User;
  signIn: string;
  signOut: string;
}) {
  const { t } = useI18n();
  // React state is screen data. Updating it redraws the screen.
  const [tab, setTab] = useState('games');
  const selectedId = useSyncExternalStore(watchNavigation, selectedGame, () => '');
  const [sort, setSort] = useState('recent');
  const loginLink = selectedId
    ? '/auth/signin?return_to=' + encodeURIComponent('/?game=' + selectedId)
    : signIn;
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
    const controller = new AbortController();
    fetch('/api/games', { signal: controller.signal })
      .then((response) => readResponse<{ games: Game[] }>(response))
      .then((data) => setGames(data.games))
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
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
    [games, user, t],
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
      const saved = await readResponse<{ id: string }>(response);
      setModal(false);
      await refresh();
      openGame(saved.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : t('保存失败，输入已保留'));
    } finally {
      setBusy(false);
    }
  }
  // Search only changes what is shown; it does not change stored games.
  const visible = games
    .filter((game) => (game.title + game.developer).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) =>
      sort === 'public'
        ? (a.earliest_public || '9999').localeCompare(b.earliest_public || '9999')
        : games.indexOf(a) - games.indexOf(b),
    );
  function navigate(tabId: string) {
    openGame('');
    setTab(tabId);
  }
  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brandmark">
            <Fingerprint size={25} />
          </span>
          <span>
            Orivex<small>CREATOR ARCHIVES</small>
          </span>
        </Link>
        <nav aria-label={t('主导航')}>
          {[
            ['games', t('游戏档案')],
            ['compare', t('对照工作台')],
            ['reviews', t('审核记录')],
          ].map(([tabId, label]) => (
            <button
              key={tabId}
              onClick={() => navigate(tabId)}
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
            <a className="button small" href={loginLink} target="_top">
              {t('GitHub 登录')}
            </a>
          )}
        </div>
      </header>
      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">{t('独立游戏 · 创作档案')}</p>
            <h1>{t('看见游戏背后的创作者。')}</h1>
            <p>{t('了解创作故事、公开时间与同人文化，找到值得支持的作品。')}</p>
          </div>
          <div className="intro-note">
            <ShieldCheck size={21} />
            <span>
              {t('从故事到支持')}
              <small>{t('保留来源，认识创作者')}</small>
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
        {selectedId ? (
          <Archive
            key={selectedId}
            gameId={selectedId}
            games={games}
            user={user}
            signIn={loginLink}
            onBack={() => {
              navigate('games');
              void refresh();
            }}
            onOpenGame={openGame}
          />
        ) : tab === 'games' ? (
          <div className="workspace-grid">
            <section className="panel ledger">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">REGISTRY / 01</p>
                  <h2>{t('游戏档案')}</h2>
                </div>
                {user ? (
                  <button className="button" onClick={() => setModal(true)}>
                    <Plus size={16} />
                    {t('登记游戏')}
                  </button>
                ) : (
                  <a className="button" href={loginLink} target="_top">
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
                <select
                  aria-label={t('排序方式')}
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="recent">{t('最近登记')}</option>
                  <option value="public">{t('较早公开的来源')}</option>
                </select>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('游戏 / 开发者')}</th>
                      <th>{t('较早公开的来源')}</th>
                      <th>{t('正式发布')}</th>
                      <th>{t('时间证据')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((game) => (
                      <tr key={game.id}>
                        <td>
                          <button
                            className="game-title text-button"
                            onClick={() => openGame(game.id)}
                          >
                            {game.title}
                          </button>
                          <small>
                            {game.developer}
                            {game.series && ` · ${game.series}`}
                          </small>
                          <button
                            className="text-button archive-open"
                            onClick={() => openGame(game.id)}
                          >
                            {t('查看创作档案')}
                            <ChevronRight size={13} />
                          </button>
                          <details>
                            <summary>{t('创意描述')}</summary>
                            <p style={{ maxWidth: 280, whiteSpace: 'pre-wrap' }}>
                              {game.description}
                            </p>
                          </details>
                        </td>
                        <td>{game.earliest_public || t('未提供')}</td>
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
                    {query
                      ? t('没有匹配的游戏。')
                      : t('登记游戏，再补充它的故事、来源与支持链接。')}
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
                <p className="eyebrow">DISCOVER THE CREATOR</p>
                <h2>{t('认识一款游戏的来历')}</h2>
                <ol className="steps">
                  {[
                    [t('创作故事'), t('了解灵感、开发过程与设计变化。')],
                    [t('证据时间线'), t('从公开帖子、开发日志与首秀了解创作轨迹。')],
                    [t('同人文化'), t('发现同人创作，保留作者与原始作品的联系。')],
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
                <button className="text-button" onClick={() => navigate('method')}>
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
        <span>{t('Orivex · 让游戏创作者被看见')}</span>
        <div>
          <button onClick={() => navigate('method')}>{t('评估方法')}</button>
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
              <label>
                {t('所属系列（可选）')}
                <input name="series" maxLength={100} placeholder={t('同系列游戏使用相同名称')} />
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
