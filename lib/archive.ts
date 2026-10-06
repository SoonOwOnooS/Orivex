import { z } from 'zod';

// Shared labels keep forms and server checks in sync.
export const evidenceCategories = {
  idea: '公开点子',
  devlog: '开发日志',
  showcase: '首次展示',
  release: '正式发布',
  other: '其他记录',
} as const;
export const fanCategories = {
  game: '同人游戏',
  art: '绘画',
  music: '音乐',
  video: '视频',
  writing: '文字作品',
  other: '其他二创',
} as const;
export const supportCategories = {
  store: '购买 / 愿望单',
  demo: '试玩',
  creator: '开发者主页',
  support: '支持创作者',
} as const;
export const voteLabels = {
  supports: '来源支持日期',
  unclear: '需要更多证据',
  disputes: '来源与日期不符',
} as const;

const sourceUrl = z
  .string()
  .trim()
  .max(2000)
  .url()
  .refine((value) => {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  });
const publicDate = z
  .string()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
  );
const common = {
  game_id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  url: sourceUrl,
};
export const archiveItemSchema = z.discriminatedUnion('kind', [
  z
    .object({
      ...common,
      kind: z.literal('story'),
      body: z.string().trim().min(20).max(4000),
      credit: z.string().trim().min(1).max(100),
    })
    .strict(),
  z
    .object({
      ...common,
      kind: z.literal('evidence'),
      body: z.string().trim().min(20).max(2000),
      occurred_on: publicDate,
      category: z.enum(['idea', 'devlog', 'showcase', 'release', 'other']),
    })
    .strict(),
  z
    .object({
      ...common,
      kind: z.literal('fan'),
      body: z.string().trim().min(10).max(2000),
      credit: z.string().trim().min(1).max(100),
      category: z.enum(['game', 'art', 'music', 'video', 'writing', 'other']),
      related_game_ids: z.array(z.string().uuid()).max(4).default([]),
    })
    .strict(),
  z
    .object({
      ...common,
      kind: z.literal('support'),
      body: z.string().trim().max(500).default(''),
      category: z.enum(['store', 'demo', 'creator', 'support']),
    })
    .strict(),
]);
export const archiveEditSchema = z
  .object({
    id: z.string().min(1).max(100),
    revision: z.number().int().positive(),
    reason: z.string().trim().min(10).max(500),
    item: archiveItemSchema,
  })
  .strict();
export const archiveVoteSchema = z
  .object({
    kind: z.literal('vote'),
    id: z.string().min(1).max(100),
    revision: z.number().int().positive(),
    verdict: z.enum(['supports', 'unclear', 'disputes']),
    reason: z.string().trim().min(10).max(1000),
  })
  .strict();
export type ArchiveInput = z.infer<typeof archiveItemSchema>;
export type ArchiveItem = {
  id: string;
  game_id: string;
  kind: 'story' | 'evidence' | 'fan' | 'support';
  title: string;
  body: string;
  url: string;
  credit: string;
  category: string;
  occurred_on: string;
  author_name: string;
  revision: number;
  created_at: string;
  updated_at: string;
  can_edit: boolean;
  related_games: { id: string; title: string }[];
  votes: { supports: number; unclear: number; disputes: number };
  my_vote: string | null;
};
export type ArchiveData = {
  game: { id: string; title: string; developer: string; description: string; series: string };
  items: ArchiveItem[];
  has_more: boolean;
};
export type ArchiveHistory = {
  revision: number;
  snapshot: ArchiveInput;
  reason: string;
  display_name: string;
  created_at: string;
};

// Store plain text and links only. Public snapshots never include account IDs.
export function itemFields(item: ArchiveInput) {
  return {
    game_id: item.game_id,
    kind: item.kind,
    title: item.title,
    body: item.body,
    url: item.url,
    credit: 'credit' in item ? item.credit : '',
    category: 'category' in item ? item.category : '',
    occurred_on: 'occurred_on' in item ? item.occurred_on : '',
  };
}
