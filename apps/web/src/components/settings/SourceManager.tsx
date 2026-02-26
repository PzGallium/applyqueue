import { useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { useJobSources, type JobSource } from '@/hooks/useJobSources';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const SOURCE_TYPES = [
  { value: 'greenhouse', label: 'Greenhouse', placeholder: 'stripe' },
  { value: 'lever', label: 'Lever', placeholder: 'cloudflare' },
] as const;

function AddSourceForm({ onSuccess }: { onSuccess: () => void }) {
  const { addSource, loading, error } = useJobSources();
  const [type, setType] = useState<string>('greenhouse');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const currentType = SOURCE_TYPES.find((t) => t.value === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    const ok = await addSource(name.trim(), type, slug.trim());
    if (ok) {
      setName('');
      setSlug('');
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        {SOURCE_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              type === t.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-input hover:bg-accent'
            }`}
            onClick={() => setType(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Input
        placeholder="公司名称，如 Stripe"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        placeholder={`Board slug，如 ${currentType?.placeholder ?? 'company'}`}
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        className="font-mono text-sm"
      />
      <Button type="submit" size="sm" disabled={loading || !name.trim() || !slug.trim()} className="gap-1.5">
        <Plus className="h-4 w-4" />
        添加
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}

function SourceItem({ source, onDelete }: { source: JobSource; onDelete: () => void }) {
  const typeLabels: Record<string, string> = { greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby', custom: 'Search' };

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{source.name}</span>
          <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
            {typeLabels[source.type] ?? source.type}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{source.jobCount} 职位</span>
          {source.lastRunAt && (
            <span>
              上次：{new Date(source.lastRunAt).toLocaleDateString('zh-CN')}
              {source.lastRunStatus === 'error' && ' (失败)'}
            </span>
          )}
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onDelete}>
        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
      </Button>
    </div>
  );
}

export function SourceManager() {
  const { listSources, deleteSource, triggerIngest, loading } = useJobSources();
  const [sources, setSources] = useState<JobSource[]>([]);

  const refresh = async () => {
    const s = await listSources();
    setSources(s);
  };

  useEffect(() => {
    refresh();
  }, [listSources]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              职位来源
            </CardTitle>
            <CardDescription>添加要监控的公司 ATS，系统每天自动抓取新职位。</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={async () => {
              await triggerIngest();
              await refresh();
            }}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
            手动抓取
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sources.length > 0 && (
          <div className="space-y-2">
            {sources.map((s) => (
              <SourceItem
                key={s.id}
                source={s}
                onDelete={async () => {
                  if (await deleteSource(s.id)) refresh();
                }}
              />
            ))}
          </div>
        )}
        <div className="rounded-lg border border-dashed p-4">
          <p className="mb-3 text-sm font-medium">添加来源</p>
          <AddSourceForm onSuccess={refresh} />
        </div>
      </CardContent>
    </Card>
  );
}
