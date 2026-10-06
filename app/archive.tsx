'use client';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  ExternalLink,
  Copy,
  BookOpen,
  Clock3,
  Palette,
  Heart,
  X,
} from 'lucide-react';
import { useI18n, LanguageSwitch } from '../lib/i18n';
import { readResponse } from '../lib/client';
import { formatMemberName } from '../lib/messages';
import {
  evidenceCategories,
  fanCategories,
  supportCategories,
  voteLabels,
  type ArchiveData,
  type ArchiveItem,
  type ArchiveHistory,
} from '../lib/archive';
import type { Game, User } from './workspace';

const sections = {
  story: '创作故事',
  evidence: '证据时间线',
  fan: '同人文化',
  support: '支持创作者',
} as const;
const icons = { story: BookOpen, evidence: Clock3, fan: Palette, support: Heart };
type Kind = keyof typeof sections;
type HistoryData = {
  history: ArchiveHistory[];
  votes: {
    revision: number;
    display_name: string;
    verdict: keyof typeof voteLabels;
    reason: string;
    updated_at: string;
  }[];
};

// A public game page combines its stories, sources, fan works, and support links.
export default function Archive({
  gameId,
  games,
  user,
  signIn,
  onBack,
  onOpenGame,
}: {
  gameId: string;
  games: Game[];
  user: User;
  signIn: string;
  onBack: () => void;
  onOpenGame: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const [data, setData] = useState<ArchiveData | null>(null);
  const [error, setError] = useState('');
  const [section, setSection] = useState<Kind>('story');
  const [editor, setEditor] = useState<{ kind: Kind; item?: ArchiveItem } | null>(null);
  const [shared, setShared] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/archive?game_id=${encodeURIComponent(gameId)}`, { signal: controller.signal })
      .then((response) => readResponse<ArchiveData>(response))
      .then(setData)
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [gameId]);
  async function reload() {
    const response = await fetch(`/api/archive?game_id=${encodeURIComponent(gameId)}`);
    setData(await readResponse<ArchiveData>(response));
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(location.href);
      setShared(true);
    } catch {
      setError(t('请复制浏览器地址来分享这份档案。'));
    }
  }
  if (!data)
    return (
      <section className="panel archive-body">
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={16} />
          {t('返回游戏档案')}
        </button>
        {error ? (
          <div className="alert" role="alert">
            {t(error)}
            <button onClick={() => void reload().catch((error) => setError(error.message))}>
              {t('重试')}
            </button>
          </div>
        ) : (
          <p role="status">{t('正在读取创作档案…')}</p>
        )}
      </section>
    );
  const items = data.items
    .filter((item) => item.kind === section)
    .sort((a, b) =>
      section === 'evidence'
        ? a.occurred_on.localeCompare(b.occurred_on) || a.created_at.localeCompare(b.created_at)
        : b.created_at.localeCompare(a.created_at),
    );
  const supportLinks = data.items.filter((item) => item.kind === 'support');
  return (
    <div className="archive-layout">
      <section className="panel archive-main">
        <div className="archive-heading">
          <button className="text-button" onClick={onBack}>
            <ArrowLeft size={16} />
            {t('返回游戏档案')}
          </button>
          <div className="archive-title">
            <div>
              <p className="eyebrow">CREATOR ARCHIVE</p>
              <h2>{data.game.title}</h2>
              <p className="muted">
                {data.game.developer}
                {data.game.series && ` · ${data.game.series}`}
              </p>
            </div>
            <button className="button ghost" onClick={() => void share()}>
              <Copy size={15} />
              {shared ? t('链接已复制') : t('分享档案')}
            </button>
          </div>
          <p className="archive-description">{data.game.description}</p>
        </div>
        <div className="archive-tabs" role="tablist" aria-label={t('档案内容')}>
          {(Object.keys(sections) as Kind[]).map((kind) => {
            const Icon = icons[kind];
            return (
              <button
                key={kind}
                type="button"
                role="tab"
                id={`tab-${kind}`}
                aria-controls="archive-content"
                aria-selected={section === kind}
                onClick={() => setSection(kind)}
              >
                <Icon size={16} />
                {t(sections[kind])}
                <span>{data.items.filter((item) => item.kind === kind).length}</span>
              </button>
            );
          })}
        </div>
        <div
          className="archive-body"
          id="archive-content"
          role="tabpanel"
          aria-labelledby={`tab-${section}`}
        >
          <div className="archive-actions">
            <h3>{t(sections[section])}</h3>
            {user ? (
              <button className="button small" onClick={() => setEditor({ kind: section })}>
                <Plus size={15} />
                {t('添加记录')}
              </button>
            ) : (
              <a href={signIn} className="button small" target="_top">
                {t('登录后添加')}
              </a>
            )}
          </div>
          {section === 'story' && (
            <p className="muted archive-help">
              {t('记录灵感、开发过程和设计变化，并保留作者与原始来源。')}
            </p>
          )}
          {section === 'evidence' && (
            <p className="muted archive-help">
              {t('按公开日期排列。核查投票针对来源与日期；更正后需要重新核查。')}
            </p>
          )}
          {section === 'fan' && (
            <p className="muted archive-help">
              {t('同人作品属于各自的创作者。本区也展示关联游戏与同系列的二创。')}
            </p>
          )}
          {section === 'support' && (
            <p className="muted archive-help">
              {t('前往作品或创作者的外部页面。链接由社区提供，请核对来源。')}
            </p>
          )}
          {error && (
            <div className="alert" role="alert">
              {t(error)}
            </div>
          )}
          {!items.length && (
            <div className="empty">
              <h3>{t('这里还没有记录')}</h3>
              <p>{t('从一段创作故事或一条可核对的来源开始。')}</p>
            </div>
          )}
          {items.map((item) => (
            <ArchiveCard
              key={`${item.id}-${item.revision}`}
              item={item}
              user={user}
              signIn={signIn}
              locale={locale}
              onEdit={() => setEditor({ kind: item.kind, item })}
              onSaved={reload}
              onOpenGame={onOpenGame}
            />
          ))}
          {data.has_more && <p className="muted">{t('当前展示最新的 250 条档案记录。')}</p>}
        </div>
      </section>
      <aside className="sidebar archive-sidebar">
        <section className="panel side-card">
          <p className="eyebrow">SUPPORT THE CREATOR</p>
          <h2>{t('找到作品与创作者')}</h2>
          <p className="muted">{t('从了解一款游戏，到试玩、加入愿望单或支持开发者。')}</p>
          <div className="support-links">
            {supportLinks.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="button ghost wide"
              >
                <ExternalLink size={15} />
                {item.title}
              </a>
            ))}
          </div>
          {!supportLinks.length && <p className="muted">{t('还没有收录支持链接。')}</p>}
          <button className="text-button" onClick={() => setSection('support')}>
            {t('查看支持链接')}
          </button>
        </section>
        <section className="principle">
          <h3>{t('让游戏背后的人被看见')}</h3>
          <p>{t('公开时间、创作故事与同人文化，一起组成作品的来历。')}</p>
        </section>
      </aside>
      {editor && (
        <ArchiveEditor
          key={editor.item?.id || editor.kind}
          kind={editor.kind}
          item={editor.item}
          gameId={gameId}
          games={games}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            await reload();
            setEditor(null);
          }}
        />
      )}
    </div>
  );
}

function ArchiveCard({
  item,
  user,
  signIn,
  locale,
  onEdit,
  onSaved,
  onOpenGame,
}: {
  item: ArchiveItem;
  user: User;
  signIn: string;
  locale: 'zh' | 'en';
  onEdit: () => void;
  onSaved: () => Promise<void>;
  onOpenGame: (id: string) => void;
}) {
  const { t } = useI18n();
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [voteOpen, setVoteOpen] = useState(false);
  const label =
    item.kind === 'evidence'
      ? evidenceCategories[item.category as keyof typeof evidenceCategories]
      : item.kind === 'fan'
        ? fanCategories[item.category as keyof typeof fanCategories]
        : item.kind === 'support'
          ? supportCategories[item.category as keyof typeof supportCategories]
          : sections.story;
  async function loadHistory() {
    try {
      const response = await fetch(`/api/archive?item_id=${encodeURIComponent(item.id)}`);
      setHistory(await readResponse<HistoryData>(response));
    } catch (error) {
      setError(error instanceof Error ? error.message : t('读取失败'));
    }
  }
  async function vote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch('/api/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, kind: 'vote', id: item.id, revision: item.revision }),
      });
      await readResponse(response);
      await onSaved();
      setVoteOpen(false);
      if (showHistory) await loadHistory();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('提交失败'));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!confirm(t('撤回这条记录？它将不再公开展示。'))) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/archive', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, revision: item.revision }),
      });
      await readResponse(response);
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('提交失败'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className={`archive-card ${item.kind === 'evidence' ? 'timeline-card' : ''}`}>
      <div className="archive-card-top">
        <span className="badge">{t(label)}</span>
        {item.occurred_on && <time dateTime={item.occurred_on}>{item.occurred_on}</time>}
        {item.kind === 'fan' && <span className="badge">{t('非官方同人作品')}</span>}
      </div>
      <h3>{item.title}</h3>
      {item.credit && (
        <p className="muted">
          {t('原作者：')}
          {item.credit}
        </p>
      )}
      {item.body && <p className="archive-text">{item.body}</p>}
      <a href={item.url} target="_blank" rel="noreferrer" className="text-button">
        <ExternalLink size={14} />
        {item.kind === 'support' ? t('打开链接') : t('查看原始来源')}
      </a>
      {item.kind === 'fan' && (
        <div className="related-games">
          {item.related_games.map((game) => (
            <button key={game.id} className="text-button" onClick={() => onOpenGame(game.id)}>
              {game.title}
            </button>
          ))}
        </div>
      )}
      <small className="archive-attribution">
        {formatMemberName(item.author_name, locale)} · {t('社区收录')} ·{' '}
        {t('版本 {0}', item.revision)}
      </small>
      {item.kind === 'evidence' && (
        <div className="vote-totals">
          {(Object.keys(voteLabels) as (keyof typeof voteLabels)[]).map((verdict) => (
            <span key={verdict}>
              {t(voteLabels[verdict])} <b>{item.votes[verdict]}</b>
            </span>
          ))}
        </div>
      )}
      <div className="inline-actions archive-card-actions">
        {item.kind === 'evidence' &&
          (item.can_edit ? (
            <span className="muted">{t('等待其他成员核查')}</span>
          ) : user ? (
            <button className="text-button" onClick={() => setVoteOpen(!voteOpen)}>
              {item.my_vote ? t('修改核查意见') : t('核查来源与日期')}
            </button>
          ) : (
            <a href={signIn} target="_top" className="text-button">
              {t('登录后核查')}
            </a>
          ))}
        <button
          className="text-button"
          onClick={() => {
            setShowHistory(!showHistory);
            if (!history) void loadHistory();
          }}
        >
          {t('查看更正与核查记录')}
        </button>
        {item.can_edit && (
          <>
            <button className="text-button" onClick={onEdit}>
              {t('更正记录')}
            </button>
            <button className="text-button" disabled={busy} onClick={() => void remove()}>
              {t('撤回记录')}
            </button>
          </>
        )}
      </div>
      {error && (
        <div className="alert" role="alert">
          {t(error)}
        </div>
      )}
      {voteOpen && (
        <form onSubmit={vote} className="archive-form">
          <label>
            {t('核查意见')}
            <select name="verdict" defaultValue={item.my_vote || 'unclear'}>
              {Object.entries(voteLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {t(label)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('具体理由')}
            <textarea name="reason" required minLength={10} maxLength={1000} rows={3} />
          </label>
          <button className="button small" disabled={busy}>
            {busy ? t('保存中…') : t('保存核查意见')}
          </button>
        </form>
      )}
      {showHistory && (
        <div className="archive-history">
          {!history ? (
            <p role="status">{t('正在读取记录…')}</p>
          ) : (
            <>
              {history.history.map((entry) => (
                <details key={entry.revision}>
                  <summary>
                    {t('版本 {0}', entry.revision)} · {entry.created_at.slice(0, 10)} ·{' '}
                    {t(entry.reason)}
                  </summary>
                  <p>{entry.snapshot.title}</p>
                  {'occurred_on' in entry.snapshot && <p>{entry.snapshot.occurred_on}</p>}
                  <p className="archive-text">{entry.snapshot.body}</p>
                  <a href={entry.snapshot.url} target="_blank" rel="noreferrer">
                    {t('查看原始来源')}
                  </a>
                  <small>{formatMemberName(entry.display_name, locale)}</small>
                </details>
              ))}
              {history.votes.map((vote, index) => (
                <div className="review-entry" key={index}>
                  <strong>
                    {t(voteLabels[vote.verdict])} · {t('版本 {0}', vote.revision)}
                  </strong>
                  <p>{vote.reason}</p>
                  <small>
                    {formatMemberName(vote.display_name, locale)} · {vote.updated_at.slice(0, 10)}
                  </small>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </article>
  );
}

// Keep all drafts in the form until the server confirms a successful save.
function ArchiveEditor({
  kind,
  item,
  gameId,
  games,
  onClose,
  onSaved,
}: {
  kind: Kind;
  item?: ArchiveItem;
  gameId: string;
  games: Game[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const categories =
    kind === 'evidence'
      ? evidenceCategories
      : kind === 'fan'
        ? fanCategories
        : kind === 'support'
          ? supportCategories
          : null;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      kind,
      game_id: item?.game_id || gameId,
      title: form.get('title'),
      body: form.get('body'),
      url: form.get('url'),
    };
    if (kind === 'story' || kind === 'fan') payload.credit = form.get('credit');
    if (categories) payload.category = form.get('category');
    if (kind === 'evidence') payload.occurred_on = form.get('occurred_on');
    if (kind === 'fan') payload.related_game_ids = form.getAll('related_game_ids');
    try {
      const response = await fetch('/api/archive', {
        method: item ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          item
            ? { id: item.id, revision: item.revision, reason: form.get('reason'), item: payload }
            : payload,
        ),
      });
      await readResponse(response);
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('保存失败，输入已保留'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-editor-title"
      >
        <div className="panel-head">
          <h2 id="archive-editor-title">
            {item ? t('更正记录') : t('添加记录')} · {t(sections[kind])}
          </h2>
          <div className="dialog-controls">
            <LanguageSwitch />
            <button
              type="button"
              className="icon-button"
              aria-label={t('关闭')}
              disabled={busy}
              onClick={onClose}
            >
              <X />
            </button>
          </div>
        </div>
        <form onSubmit={submit}>
          {error && (
            <div className="alert" role="alert">
              {t(error)}
            </div>
          )}
          <label>
            {t('标题')}
            <input
              name="title"
              required
              maxLength={120}
              defaultValue={item?.title || ''}
              autoFocus
              disabled={busy}
            />
          </label>
          {(kind === 'story' || kind === 'fan') && (
            <label>
              {t('原作者 / 创作者')}
              <input
                name="credit"
                required
                maxLength={100}
                defaultValue={item?.credit || ''}
                disabled={busy}
              />
            </label>
          )}
          {categories && (
            <label>
              {t('记录类型')}
              <select
                name="category"
                defaultValue={item?.category || Object.keys(categories)[0]}
                disabled={busy}
              >
                {Object.entries(categories).map(([value, label]) => (
                  <option key={value} value={value}>
                    {t(label)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {kind === 'evidence' && (
            <label>
              {t('公开日期')}
              <input
                type="date"
                name="occurred_on"
                required
                defaultValue={item?.occurred_on || ''}
                disabled={busy}
              />
            </label>
          )}
          <label>
            {kind === 'story' ? t('创作故事与设计变化') : t('内容说明')}
            <textarea
              name="body"
              rows={5}
              required={kind !== 'support'}
              minLength={kind === 'story' || kind === 'evidence' ? 20 : kind === 'fan' ? 10 : 0}
              maxLength={kind === 'story' ? 4000 : kind === 'support' ? 500 : 2000}
              defaultValue={item?.body || ''}
              disabled={busy}
            />
          </label>
          <label>
            {kind === 'support' ? t('外部链接') : t('原始来源链接')}
            <input
              type="url"
              name="url"
              required
              maxLength={2000}
              placeholder="https://…"
              defaultValue={item?.url || ''}
              disabled={busy}
            />
          </label>
          {kind === 'fan' && (
            <fieldset className="related-picker">
              <legend>{t('也关联这些游戏（最多 4 款）')}</legend>
              {games
                .filter((game) => game.id !== (item?.game_id || gameId))
                .map((game) => (
                  <label key={game.id}>
                    <input
                      type="checkbox"
                      name="related_game_ids"
                      value={game.id}
                      defaultChecked={
                        item?.related_games.some((related) => related.id === game.id) || false
                      }
                      disabled={busy}
                    />
                    {game.title}
                  </label>
                ))}
              {!games.some((game) => game.id !== (item?.game_id || gameId)) && (
                <p className="muted">{t('尚无其他已登记游戏')}</p>
              )}
            </fieldset>
          )}
          {item && (
            <label>
              {t('更正原因')}
              <textarea
                name="reason"
                required
                minLength={10}
                maxLength={500}
                rows={2}
                disabled={busy}
              />
            </label>
          )}
          <button className="button wide" disabled={busy}>
            {busy ? t('保存中…') : item ? t('保存更正并保留历史') : t('保存到创作档案')}
          </button>
        </form>
      </section>
    </div>
  );
}
