'use client';
import { useI18n } from '../lib/i18n';
import { useState, useEffect } from 'react';
import { readResponse } from '../lib/client';
import { ScanLine, Download, FileUp } from 'lucide-react';
import type { Game, User } from './workspace';
import { sampleVideo, runModels, cosine, type VideoSample } from '../lib/video';
import { MODEL_VERSION, toPublishedReport, type Report, type PublishedReport } from '../lib/report';
// A similarity score is a model result, not proof of copying.
export function Score({ value, label }: { value: number | null; label: string }) {
  const { t } = useI18n();
  return (
    <div className="score">
      <span>{label}</span>
      <strong>{value === null ? t('未评估') : value.toFixed(3)}</strong>
      <small>{t('模型特征余弦相似度 · 非抄袭概率')}</small>
    </div>
  );
}

// Local reports have images. Public reports only have times and scores.
export function FramePairs({
  matches,
}: {
  matches: (Report['matches'][number] | PublishedReport['matches'][number])[];
}) {
  const { t } = useI18n();
  return (
    <div className="frame-pairs">
      {matches.map((match, frameIndex) => (
        <div className="frame-pair" key={frameIndex}>
          {'image' in match.a && 'image' in match.b && (
            <div>
              <img
                src={match.a.image}
                alt={t('作品A {0}秒采样画面', match.a.time)}
                loading="lazy"
              />
              <img
                src={match.b.image}
                alt={t('作品B {0}秒采样画面', match.b.time)}
                loading="lazy"
              />
            </div>
          )}
          <p>
            A {match.a.time.toFixed(2)}s / B {match.b.time.toFixed(2)}s<br />
            {t('视觉特征相似度')}
            {match.similarity.toFixed(3)}
          </p>
        </div>
      ))}
    </div>
  );
}

// All video decoding and model work happens in the visitor's browser.
export default function Compare({
  games,
  user,
  signIn,
  onPublished,
}: {
  games: Game[];
  user: User;
  signIn: string;
  onPublished: () => void;
}) {
  const { t } = useI18n();
  // Store the selected games, inputs, and current report.
  const [referenceGameId, setReferenceGameId] = useState('');
  const [comparedGameId, setComparedGameId] = useState('');
  const [referenceText, setReferenceText] = useState('');
  const [comparedText, setComparedText] = useState('');
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [comparedFile, setComparedFile] = useState<File | null>(null);
  const [samples, setSamples] = useState(12);
  const [report, setReport] = useState<Report | null>(null);
  const [note, setNote] = useState('');
  const [permission, setPermission] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [referencePreviewUrl, setReferencePreviewUrl] = useState('');
  const [comparedPreviewUrl, setComparedPreviewUrl] = useState('');
  // Create local preview links and release them when a file changes.
  useEffect(() => {
    if (!referenceFile) {
      setReferencePreviewUrl('');
      return;
    }
    const previewUrl = URL.createObjectURL(referenceFile);
    setReferencePreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [referenceFile]);
  useEffect(() => {
    if (!comparedFile) {
      setComparedPreviewUrl('');
      return;
    }
    const previewUrl = URL.createObjectURL(comparedFile);
    setComparedPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [comparedFile]);
  // Selecting a game fills its description and clears the old report.
  function select(side: 'a' | 'b', gameId: string) {
    const game = games.find((candidate) => candidate.id === gameId);
    if (side === 'a') {
      setReferenceGameId(gameId);
      setReferenceText(game?.description || '');
    } else {
      setComparedGameId(gameId);
      setComparedText(game?.description || '');
    }
    setReport(null);
  }
  // Check inputs, sample videos, run models, then build a local report.
  async function analyze() {
    setBusy(true);
    setError('');
    setReport(null);
    try {
      if ((referenceFile && !comparedFile) || (!referenceFile && comparedFile)) {
        throw Error(t('视频对照需要同时提供两段完整视频。'));
      }
      const hasText = referenceText.trim().length >= 20 && comparedText.trim().length >= 20;
      if (!hasText && !referenceFile) {
        throw Error(t('请提供两段至少 20 字的创意描述，或同时提供两段视频。'));
      }
      let referenceVideo: VideoSample | null = null;
      let comparedVideo: VideoSample | null = null;
      if (referenceFile && comparedFile) {
        referenceVideo = await sampleVideo(referenceFile, samples, setProgress);
        comparedVideo = await sampleVideo(comparedFile, samples, setProgress);
        if (referenceVideo.frames.length < 3 || comparedVideo.frames.length < 3) {
          throw Error(
            t('有效画面不足：黑场和单色画面已排除，请提供至少包含三帧有效画面的宣传视频。'),
          );
        }
      }
      setProgress(t('准备开源模型；首次运行需要下载模型，通常需要几分钟。'));
      // Send text and sampled images to a local Web Worker, not to our server.
      const output = await runModels(
        hasText ? [referenceText, comparedText] : [],
        [
          ...(referenceVideo?.frames.map((frame) => frame.image) || []),
          ...(comparedVideo?.frames.map((frame) => frame.image) || []),
        ],
        setProgress,
      );
      // For each frame in A, find the most similar frame in B.
      const matches: Report['matches'] = [];
      if (referenceVideo && comparedVideo) {
        for (let frameIndex = 0; frameIndex < referenceVideo.frames.length; frameIndex++) {
          let bestSimilarity = -2;
          let bestFrameIndex = 0;
          for (
            let comparedFrameIndex = 0;
            comparedFrameIndex < comparedVideo.frames.length;
            comparedFrameIndex++
          ) {
            const similarity = cosine(
              output.images[frameIndex],
              output.images[referenceVideo.frames.length + comparedFrameIndex],
            );
            if (similarity > bestSimilarity) {
              bestSimilarity = similarity;
              bestFrameIndex = comparedFrameIndex;
            }
          }
          matches.push({
            a: referenceVideo.frames[frameIndex],
            b: comparedVideo.frames[bestFrameIndex],
            similarity: bestSimilarity,
          });
        }
        matches.sort((firstMatch, secondMatch) => secondMatch.similarity - firstMatch.similarity);
      }
      // Average best matches in both directions. One frame may match several frames.
      const forwardSimilarity = matches.length
        ? matches.reduce((similarity, match) => similarity + match.similarity, 0) / matches.length
        : null;
      let backwardSimilarity: number | null = null;
      if (referenceVideo && comparedVideo) {
        backwardSimilarity =
          comparedVideo.frames.reduce(
            (sum, _f, comparedFrameIndex) =>
              sum +
              Math.max(
                ...referenceVideo!.frames.map((_x, frameIndex) =>
                  cosine(
                    output.images[frameIndex],
                    output.images[referenceVideo!.frames.length + comparedFrameIndex],
                  ),
                ),
              ),
            0,
          ) / comparedVideo.frames.length;
      }
      const videoSimilarity =
        forwardSimilarity !== null && backwardSimilarity !== null
          ? (forwardSimilarity + backwardSimilarity) / 2
          : null;
      // Save the method and coverage so readers can see what was analyzed.
      const generatedReport: Report = {
        version: '1.0',
        texts: { a: referenceText.slice(0, 800), b: comparedText.slice(0, 800) },
        model: MODEL_VERSION,
        generated_at: new Date().toISOString(),
        idea_similarity: hasText ? cosine(output.texts[0], output.texts[1]) : null,
        video_similarity: videoSimilarity,
        coverage: {
          samples: referenceVideo ? samples : 0,
          a_duration: referenceVideo?.duration || 0,
          b_duration: comparedVideo?.duration || 0,
          a_hash: referenceVideo?.hash || null,
          b_hash: comparedVideo?.hash || null,
          a_frame_count: referenceVideo?.frames.length || 0,
          b_frame_count: comparedVideo?.frames.length || 0,
          audio_processed: false,
        },
        matches: matches.slice(0, 6),
        limitations: [
          t('模型特征相似度无法确认复制行为、侵权或是否使用 AI。'),
          t('视频采用均匀抽样，未分析音轨与完整镜头顺序。'),
          t('创意描述仅比较前 800 字符，模型可能进一步截断。'),
          t('共同题材、授权素材、黑场和视觉风格可能影响相似度。'),
          t('报告由提交者浏览器生成，尚未独立验证。'),
          t(
            '已排除单色画面：A {0} 帧，B {1} 帧。',
            referenceVideo?.discarded || 0,
            comparedVideo?.discarded || 0,
          ),
        ],
      };
      setReport(generatedReport);
      setProgress(t('分析完成。请核对画面对与分析范围，再决定是否发布。'));
    } catch (error) {
      setError(error instanceof Error ? error.message : t('分析失败'));
      setProgress('');
    } finally {
      setBusy(false);
    }
  }
  // Remove images before sending the report to the public API.
  async function publish() {
    if (!report) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/comparisons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          a_id: referenceGameId,
          b_id: comparedGameId,
          note,
          share_permission: permission,
          analysis: toPublishedReport(report),
        }),
      });
      await readResponse<{ id: string }>(response);
      onPublished();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('发布失败'));
    } finally {
      setBusy(false);
    }
  }
  // The private download keeps images. Do not confuse it with public metadata.
  function download() {
    if (!report) {
      return;
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'orivex-report.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">COMPARE / 02</p>
          <h2>{t('创意与宣传视频对照')}</h2>
        </div>
        <ScanLine />
      </div>
      <div className="compare-body">
        <div className="notice">
          {t(
            '选择两款作品，或直接输入描述与视频进行本地分析。视频与采样图片仅留在本机；发布时只提交文字、相似度、采样时间和文件指纹。',
          )}
        </div>
        <div className="compare-columns" style={{ marginTop: 20 }}>
          {(['a', 'b'] as const).map((side) => {
            const isA = side === 'a';
            return (
              <div className="compare-side" key={side}>
                <h3>
                  {t('作品')}
                  {isA ? 'A' : 'B'} · {isA ? t('参考作品') : t('待比较作品')}
                </h3>
                <label>
                  {t('已登记游戏')}
                  <select
                    disabled={busy}
                    value={isA ? referenceGameId : comparedGameId}
                    onChange={(event) => select(side, event.target.value)}
                  >
                    <option value="">{t('选择游戏（发布报告时必填）')}</option>
                    {games.map((game) => (
                      <option key={game.id} value={game.id}>
                        {game.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('创意 / 宣传文案')}
                  <textarea
                    disabled={busy}
                    rows={5}
                    maxLength={4000}
                    value={isA ? referenceText : comparedText}
                    onChange={(event) => {
                      isA
                        ? setReferenceText(event.target.value)
                        : setComparedText(event.target.value);
                      setReport(null);
                    }}
                    placeholder={t('描述核心循环、规则与独特之处。文本对照至少 20 字。')}
                  />
                </label>
                <label className="upload">
                  <FileUp size={18} />
                  {t('完整宣传视频')}
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/ogg"
                    disabled={busy}
                    onChange={(event) => {
                      isA
                        ? setReferenceFile(event.target.files?.[0] || null)
                        : setComparedFile(event.target.files?.[0] || null);
                      setReport(null);
                    }}
                  />
                  <small>{t('浏览器支持的 MP4 / WebM · 100 MB / 10 分钟以内')}</small>
                </label>
                {(isA ? referencePreviewUrl : comparedPreviewUrl) && (
                  <video
                    className="preview-video"
                    src={isA ? referencePreviewUrl : comparedPreviewUrl}
                    controls
                    preload="metadata"
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="actionbar">
          <label>
            {t('每段视频采样')}
            <select
              value={samples}
              disabled={busy}
              onChange={(event) => {
                setSamples(Number(event.target.value));
                setReport(null);
              }}
            >
              <option value={12}>{t('12 帧 · 标准')}</option>
              <option value={24}>{t('24 帧 · 更密集')}</option>
            </select>
          </label>
          <button className="button" disabled={busy} onClick={() => void analyze()}>
            <ScanLine size={17} />
            {busy ? t('正在分析…') : t('开始 AI 对照')}
          </button>
        </div>
        <p className="muted">
          {t('首次分析需要联网下载开源模型，后续可复用浏览器缓存。分析耗时取决于设备和网络。')}
        </p>
        {progress && (
          <div className="progress" role="status">
            {t(progress)}
          </div>
        )}
        {error && (
          <div className="alert" role="alert">
            {t(error)}
          </div>
        )}
        {report && (
          <div className="result">
            <h3>{t('对照结果 · 待人工核查')}</h3>
            <div className="scores">
              <Score value={report.idea_similarity} label={t('创意语义相似度')} />
              <Score value={report.video_similarity} label={t('抽样画面平均匹配相似度')} />
            </div>
            <p className="muted">
              A {report.coverage.a_duration.toFixed(1)}s / {report.coverage.a_frame_count}{' '}
              {t('有效帧；B')}
              {report.coverage.b_duration.toFixed(1)}s / {report.coverage.b_frame_count}{' '}
              {t('有效帧。设定采样间隔 A')}
              {(report.coverage.a_duration / (report.coverage.samples || 1)).toFixed(1)}s / B{' '}
              {(report.coverage.b_duration / (report.coverage.samples || 1)).toFixed(1)}
              {t('s。未处理音轨。')}
            </p>
            <FramePairs matches={report.matches} />
            <div className="summary">
              <strong>{t('需要核查的方向')}</strong>
              <p>
                {t(
                  '逐一检查对应画面是否包含同一素材、相同构图或连续复制迹象；再核实时间来源、授权素材与差异。模型无法仅凭高分判断复制。',
                )}
              </p>
              <ul>
                {report.limitations.map((similarity) => (
                  <li className="muted" key={similarity}>
                    {t(similarity)}
                  </li>
                ))}
              </ul>
            </div>
            <button className="button ghost" onClick={download}>
              <Download size={16} />
              {t('导出分析报告')}
            </button>
            <div className="result">
              <h3>{t('提交社区审核')}</h3>
              <p className="muted">
                {t(
                  '报告将公开显示为“提交者设备生成 · 待核查”。请选择已登记的不同游戏，并说明具体依据。',
                )}
              </p>
              <label>
                {t('证据说明')}
                <textarea
                  rows={3}
                  minLength={20}
                  maxLength={2000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t('指出对应时间点、素材及可能的其他解释，至少 20 字。')}
                />
              </label>
              <label className="checks">
                <input
                  type="checkbox"
                  checked={permission}
                  onChange={(event) => setPermission(event.target.checked)}
                />
                {t('我有权公开报告中的文字与数据，已核对说明与来源。')}
              </label>
              {user ? (
                <button
                  className="button"
                  disabled={
                    busy ||
                    !referenceGameId ||
                    !comparedGameId ||
                    referenceGameId === comparedGameId ||
                    note.trim().length < 20 ||
                    !permission
                  }
                  onClick={() => void publish()}
                >
                  {t('发布对照，等待审核')}
                </button>
              ) : (
                <a className="button" href={signIn} target="_top">
                  {t('登录后发布对照')}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
