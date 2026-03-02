import { useState, useEffect } from 'react';
import { FileEdit, Loader2 } from 'lucide-react';
import { useIdentityPool } from '@/hooks/useIdentityPool';
import { useResumeRefine, type RefineResult } from '@/hooks/useResumeRefine';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';

function ResumePreview({ result }: { result: RefineResult }) {
  const { resumeContent, identity } = result;
  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4 text-sm">
      {identity && (
        <div className="border-b pb-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">本次使用身份</p>
          <p>{identity.name} · {identity.email} · {identity.phone}</p>
        </div>
      )}
      <div>
        <h4 className="mb-1 font-medium">{resumeContent.headline}</h4>
        <p className="whitespace-pre-wrap text-muted-foreground">{resumeContent.summary}</p>
      </div>
      {resumeContent.experience.length > 0 && (
        <div>
          <h4 className="mb-2 font-medium">经历</h4>
          <ul className="space-y-2">
            {resumeContent.experience.map((e, i) => (
              <li key={i}>
                <div className="font-medium">{e.title} @ {e.company}</div>
                <div className="text-xs text-muted-foreground">{e.date}</div>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                  {e.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
      {resumeContent.projects.length > 0 && (
        <div>
          <h4 className="mb-2 font-medium">项目</h4>
          <ul className="space-y-2">
            {resumeContent.projects.map((p, i) => (
              <li key={i}>
                <div className="font-medium">{p.name}</div>
                <p className="text-muted-foreground">{p.description}</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                  {p.highlights.map((h, j) => (
                    <li key={j}>{h}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
      {resumeContent.skills.length > 0 && (
        <div>
          <h4 className="mb-1 font-medium">技能</h4>
          <p className="text-muted-foreground">{resumeContent.skills.join(', ')}</p>
        </div>
      )}
    </div>
  );
}

export function Refine() {
  const { list } = useIdentityPool();
  const { refine, loading, error } = useResumeRefine();
  const [jdText, setJdText] = useState('');
  const [identityId, setIdentityId] = useState<string | ''>('');
  const [useProjectPool, setUseProjectPool] = useState(true);
  const [items, setItems] = useState<{ id: string; name: string; label: string }[]>([]);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [result, setResult] = useState<RefineResult | null>(null);

  useEffect(() => {
    list().then(({ items: i, defaultId: d }) => {
      setItems(i.map((e) => ({ id: e.id, name: e.name, label: e.label || e.email })));
      setDefaultId(d);
      if (!identityId && d) setIdentityId(d);
    });
  }, [list]);

  const handleGenerate = async () => {
    if (!jdText.trim() || jdText.trim().length < 50) return;
    setResult(null);
    const res = await refine(jdText.trim(), {
      identityId: identityId || undefined,
      useProjectPool,
    });
    if (res) setResult(res);
  };

  return (
    <div className="container max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">精修简历</h1>
        <p className="mt-1 text-muted-foreground">
          粘贴目标职位描述，系统将根据你的项目池、经历池与身份池自动组装并精修一份定制简历。
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5" />
              目标职位描述
            </CardTitle>
            <CardDescription>
              粘贴完整的 JD 文本（至少 50 字）。系统将解析关键词并精修简历内容。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="min-h-[160px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="粘贴职位描述..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm">身份</label>
                <select
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  value={identityId}
                  onChange={(e) => setIdentityId(e.target.value)}
                >
                  <option value="">不指定</option>
                  {items.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} {e.label ? `(${e.label})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useProjectPool}
                  onChange={(e) => setUseProjectPool(e.target.checked)}
                />
                优先使用项目池
              </label>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={loading || jdText.trim().length < 50}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <FileEdit className="h-4 w-4" />
                  生成精修简历
                </>
              )}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>精修结果</CardTitle>
              <CardDescription>
                基于 JD 定制的简历内容。可在设置中维护项目池与经历池以获得更好效果。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResumePreview result={result} />
              <Link to="/settings" className="mt-4 inline-block text-sm text-primary hover:underline">
                前往设置维护项目池与经历池
              </Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              请先在
              <Link to="/settings" className="text-primary hover:underline"> 设置 </Link>
              中维护项目池、经历池、身份池，并连接 AI 密钥（Google OAuth 或 API Key）。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
