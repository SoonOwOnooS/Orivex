'use client';
import { useI18n } from '../lib/i18n';
import { formatMemberName } from '../lib/messages';
import { useState, useEffect } from 'react';
import { readResponse } from '../lib/client';
import type { User } from './workspace';
import { Score, FramePairs } from './compare';
import type { PublishedReport } from '../lib/report';
type Comparison = {
  id: string;
  a_title: string;
  b_title: string;
  note: string;
  author_name: string;
  created_at: string;
  analysis: PublishedReport;
};
type Review = {
  display_name: string;
  verdict: string;
  reason: string;
  updated_at?: string;
  created_at?: string;
};
type ResponseItem = { display_name: string; body: string; source_url: string; created_at: string };
const verdicts: { [key: string]: string } = {
  similar: '有具体相似证据',
  different: '存在重要差异',
  unclear: '证据不足',
};
// Fetch the published reports. Anyone can read this list.
export default function Reviews({ user, signIn }: { user: User; signIn: string }) {
  const { t } = useI18n();
  const [items, setItems] = useState<Comparison[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/comparisons')
      .then(async (response) => {
        const data = await readResponse<{ comparisons: Comparison[] }>(response);
        setItems(data.comparisons);
      })
      .catch((error) => setError(error.message));
  }, []);
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">REVIEW / 03</p>
          <h2>{t('社区审核记录')}</h2>
        </div>
        <span className="badge">
          {t('最新')}
          {items.length} {t('条对照')}
        </span>
      </div>
      <p className="notice" style={{ margin: '0 25px 20px' }}>
        {t('公开的是相似证据与审核意见。AI 使用情况、复制行为和侵权均需另行核实。')}
      </p>
      {error && (
        <div role="alert" className="alert">
          {t(error)}
        </div>
      )}
      {items.length ? (
        items.map((comparison) => (
          <ReviewCard key={comparison.id} c={comparison} user={user} signIn={signIn} />
        ))
      ) : (
        <div className="empty">
          <h3>{t('还没有发布的对照')}</h3>
          <p>{t('在对照工作台完成分析后，可以提交具体证据供社区核查。')}</p>
        </div>
      )}
    </section>
  );
}

// Load reviews and responses when a reader opens this card.
function ReviewCard({
  c: comparison,
  user,
  signIn,
}: {
  c: Comparison;
  user: User;
  signIn: string;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{
    reviews: Review[];
    responses: ResponseItem[];
    history: Review[];
  } | null>(null);
  const [error, setError] = useState('');
  const [kind, setKind] = useState('review');
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      const response = await fetch(`/api/reviews?id=${encodeURIComponent(comparison.id)}`);
      const data = await readResponse<{
        reviews: Review[];
        responses: ResponseItem[];
        history: Review[];
      }>(response);
      setData(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : t('读取失败'));
    }
  }
  // The server checks login, limits, and whether this is a self-review.
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, kind, comparison_id: comparison.id }),
      });
      await readResponse<{ saved: boolean }>(response);
      form.reset();
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('提交失败'));
    } finally {
      setBusy(false);
    }
  }
  // This label needs at least two votes and no opposing vote. It is not a verdict.
  const counts = data
    ? ['similar', 'different', 'unclear'].map(
        (verdict) => data.reviews.filter((review) => review.verdict === verdict).length,
      )
    : [0, 0, 0];
  const agreement =
    counts.some((count) => count >= 2) && counts.filter((count) => count > 0).length === 1;
  return (
    <article className="review-card">
      <h3>
        {comparison.a_title} <span className="muted">{t('与')}</span> {comparison.b_title}
      </h3>
      <span className="badge">
        {agreement
          ? t('多人意见一致')
          : data?.reviews.length
            ? t('审核意见已记录')
            : t('待独立核查')}
      </span>
      <p>{comparison.note}</p>
      <small>
        {formatMemberName(comparison.author_name, locale)} {t('提交 ·')}
        {new Date(comparison.created_at).toLocaleString(locale === 'en' ? 'en-GB' : 'zh-CN', {
          timeZone: 'Asia/Kuala_Lumpur',
        })}{' '}
        {t('· 报告由提交者设备生成，尚未独立验证')}
      </small>
      <div className="inline-actions">
        <button
          className="button ghost"
          onClick={() => {
            setOpen(!open);
            if (!data) {
              void load();
            }
          }}
        >
          {open ? t('收起详情') : t('查看证据与参与审核')}
        </button>
      </div>
      {open && (
        <div className="result">
          <div className="scores">
            <Score label={t('创意语义相似度')} value={comparison.analysis.idea_similarity} />
            <Score label={t('抽样画面匹配相似度')} value={comparison.analysis.video_similarity} />
          </div>
          <p className="notice">
            {t(
              '公开视频报告只保留采样时间、文件指纹和相似度，不包含采样图片。核查画面需要取得原视频；仅凭分数无法确认复制。',
            )}
          </p>
          <FramePairs matches={comparison.analysis.matches} />
          <details style={{ marginTop: 16 }}>
            <summary>{t('实际参与比较的创意文本')}</summary>
            <p className="muted">A: {comparison.analysis.texts.a || t('未评估文本')}</p>
            <p className="muted">B: {comparison.analysis.texts.b || t('未评估文本')}</p>
          </details>
          <p className="muted">
            {t('视频采样：A')}
            {comparison.analysis.coverage.a_frame_count} {t('帧 / B')}
            {comparison.analysis.coverage.b_frame_count} {t('帧；未处理音轨。')}
            {comparison.analysis.model}
          </p>
          <details>
            <summary>{t('分析范围、局限与文件指纹')}</summary>
            {comparison.analysis.limitations.map((s) => (
              <p className="muted" key={s}>
                {t(s)}
              </p>
            ))}
            <p className="muted" style={{ overflowWrap: 'anywhere' }}>
              A SHA-256: {comparison.analysis.coverage.a_hash || t('未提供视频')}
              <br />B SHA-256: {comparison.analysis.coverage.b_hash || t('未提供视频')}
            </p>
          </details>
          <h3 style={{ marginTop: 22 }}>
            {t('审核意见')}
            {data?.reviews.length || 0}
          </h3>
          {data?.reviews.map((r, itemIndex) => (
            <div className="review-entry" key={itemIndex}>
              <strong>{t(verdicts[r.verdict])}</strong>
              <p>{r.reason}</p>
              <small>
                {formatMemberName(r.display_name, locale)} · {r.updated_at}
              </small>
            </div>
          ))}
          <h3 style={{ marginTop: 22 }}>{t('回应与补充证据')}</h3>
          {data?.responses.map((r, itemIndex) => (
            <div className="review-entry" key={itemIndex}>
              <p>{r.body}</p>
              {r.source_url && (
                <a className="text-button" href={r.source_url} target="_blank" rel="noreferrer">
                  {t('补充来源')}
                </a>
              )}
              <small>
                {formatMemberName(r.display_name, locale)} · {r.created_at}
              </small>
            </div>
          ))}
          <details style={{ marginTop: 16 }}>
            <summary>
              {t('审核修订记录（')}
              {data?.history.length || 0})
            </summary>
            {data?.history.map((r, itemIndex) => (
              <div className="review-entry" key={itemIndex}>
                <strong>{t(verdicts[r.verdict])}</strong>
                <p>{r.reason}</p>
                <small>
                  {formatMemberName(r.display_name, locale)} · {r.created_at}
                </small>
              </div>
            ))}
          </details>
          {error && (
            <div role="alert" className="alert">
              {t(error)}
            </div>
          )}
          {user ? (
            <form onSubmit={submit} className="review-content">
              <label>
                {t('参与方式')}
                <select value={kind} onChange={(event) => setKind(event.target.value)}>
                  <option value="review">{t('独立审核（提交者不可自审）')}</option>
                  <option value="response">{t('回应 / 申诉 / 补充证据')}</option>
                </select>
              </label>
              {kind === 'review' ? (
                <>
                  <label>
                    {t('判断')}
                    <select name="verdict">
                      <option value="unclear">{t('证据不足')}</option>
                      <option value="similar">{t('有具体相似证据')}</option>
                      <option value="different">{t('存在重要差异')}</option>
                    </select>
                  </label>
                  <label>
                    {t('具体理由')}
                    <textarea name="reason" rows={3} required minLength={20} maxLength={2000} />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    {t('回应说明')}
                    <textarea name="body" required minLength={20} maxLength={2000} rows={3} />
                  </label>
                  <label>
                    {t('补充来源（可选）')}
                    <input name="source_url" type="url" />
                  </label>
                </>
              )}
              <button className="button" disabled={busy}>
                {busy ? t('保存中…') : t('提交意见并保留记录')}
              </button>
            </form>
          ) : (
            <a href={signIn} target="_top" className="button" style={{ marginTop: 20 }}>
              {t('登录后参与审核与回应')}
            </a>
          )}
        </div>
      )}
    </article>
  );
}
