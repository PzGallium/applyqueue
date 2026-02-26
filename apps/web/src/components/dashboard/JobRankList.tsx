import { useEffect, useState } from 'react';
import { BarChart3, ExternalLink, RefreshCw } from 'lucide-react';
import { useRankedList, type RankedItem, type RankedListMeta } from '@/hooks/useRankedList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function RankRow({ item }: { item: RankedItem }) {
  const { rank, score, job } = item;
  if (!job) {
    return (
      <div className="flex items-center gap-4 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        <span className="w-8 font-mono">#{rank}</span>
        <span>职位已下架或不存在</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-input bg-card p-3 transition-colors hover:border-primary/30 sm:flex-nowrap">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-sm font-medium text-primary">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-medium">{job.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0 text-xs text-muted-foreground">
          <span>{job.company}</span>
          <span>{job.location}</span>
          {job.level && <span className="capitalize">{job.level}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
          {score} 分
        </span>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          查看
        </a>
      </div>
    </div>
  );
}

export function JobRankList() {
  const { fetchRankedList, loading, error } = useRankedList();
  const [listMeta, setListMeta] = useState<RankedListMeta | null>(null);
  const [items, setItems] = useState<RankedItem[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const load = async () => {
    const res = await fetchRankedList();
    setListMeta(res.list);
    setItems(res.items);
    setGeneratedAt(res.generatedAt);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              职位排名
            </CardTitle>
            <CardDescription>
              按你的偏好排序的推荐职位。每日早 9 点、晚 9 点自动更新。
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
        {generatedAt && (
          <p className="text-xs text-muted-foreground">
            上次生成：{new Date(generatedAt).toLocaleString('zh-CN')}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-4 text-sm text-destructive">{error}</p>
        )}
        {loading && items.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            <p>暂无排名数据。</p>
            <p className="mt-1">
              请在设置中添加职位来源并保存偏好，然后手动触发一次抓取，或等待每日自动更新。
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <RankRow key={item.rank} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
