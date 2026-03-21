import { useState, useEffect, useCallback, useMemo } from 'react';
import { FileEdit, Loader2 } from 'lucide-react';
import { useIdentityPool } from '@/hooks/useIdentityPool';
import { useResumeRefine, type RefineResult } from '@/hooks/useResumeRefine';
import { usePreferences } from '@/hooks/usePreferences';
import { useUserProjects } from '@/hooks/useUserProjects';
import type { UserProfile, UserProject } from '@applyqueue/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

function ResumePreview({ result }: { result: RefineResult }) {
  const { resumeContent, identity } = result;
  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4 text-sm">
      {identity && (
        <div className="border-b pb-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">本次使用身份</p>
          <p className="font-medium">{identity.headline || '（未设置简历标题）'}</p>
          <p className="text-muted-foreground">
            {identity.name} · {identity.email} · {identity.phone}
          </p>
          {identity.location ? (
            <p className="text-muted-foreground">{identity.location}</p>
          ) : null}
        </div>
      )}
      <div>
        <h4 className="mb-1 font-medium">{resumeContent.headline}</h4>
        <p className="text-xs text-muted-foreground">本流程不生成个人总结（summary）段落。</p>
      </div>
      {resumeContent.experience.length > 0 && (
        <div>
          <h4 className="mb-2 font-medium">经历</h4>
          <ul className="space-y-2">
            {resumeContent.experience.map((e, i) => (
              <li key={i}>
                <div className="font-medium">
                  {e.title} @ {e.company}
                </div>
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
      {resumeContent.education.length > 0 && (
        <div>
          <h4 className="mb-2 font-medium">教育</h4>
          <ul className="space-y-1 text-muted-foreground">
            {resumeContent.education.map((ed, i) => (
              <li key={i}>
                {ed.school} — {ed.degree}
                {ed.major ? `，${ed.major}` : ''} · {ed.date}
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

function toggleInSet<T>(set: Set<T>, key: T, on: boolean): Set<T> {
  const next = new Set(set);
  if (on) next.add(key);
  else next.delete(key);
  return next;
}

export function Refine() {
  const { list: listIdentities } = useIdentityPool();
  const { getProfile } = usePreferences();
  const { list: listProjects } = useUserProjects();
  const { refine, loading, error } = useResumeRefine();
  const [jdText, setJdText] = useState('');
  const [identityId, setIdentityId] = useState<string>('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [identityItems, setIdentityItems] = useState<{ id: string; name: string; label: string }[]>([]);
  const [expSel, setExpSel] = useState<Set<number>>(new Set());
  const [projSel, setProjSel] = useState<Set<string>>(new Set());
  const [eduSel, setEduSel] = useState<Set<number>>(new Set());
  const [skillSel, setSkillSel] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<RefineResult | null>(null);

  const refreshData = useCallback(async () => {
    const [p, projs, idRes] = await Promise.all([getProfile(), listProjects(), listIdentities()]);
    setProfile(p);
    setProjects(projs);
    setIdentityItems(idRes.items.map((e) => ({ id: e.id, name: e.name, label: e.label || e.email })));
    setIdentityId((prev) => {
      if (prev && idRes.items.some((e) => e.id === prev)) return prev;
      return idRes.defaultId ?? idRes.items[0]?.id ?? '';
    });
  }, [getProfile, listProjects, listIdentities]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const hasContentGate = expSel.size > 0 || projSel.size > 0;
  const canGenerate =
    jdText.trim().length >= 50 && Boolean(identityId) && hasContentGate && !loading;

  const handleGenerate = async () => {
    if (!canGenerate || !identityId) return;
    setResult(null);
    const res = await refine(jdText.trim(), {
      identityId,
      selectedExperienceIndices: [...expSel].sort((a, b) => a - b),
      selectedProjectIds: [...projSel],
      selectedEducationIndices: [...eduSel].sort((a, b) => a - b),
      selectedSkillIndices: [...skillSel].sort((a, b) => a - b),
    });
    if (res) setResult(res);
  };

  const expList = profile?.experience ?? [];
  const eduList = profile?.education ?? [];
  const skillList = profile?.skills ?? [];

  const identityOptions = useMemo(() => identityItems, [identityItems]);

  return (
    <div className="container max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">精修简历</h1>
        <p className="mt-1 text-muted-foreground">
          粘贴目标职位描述，并<strong>必选一条身份</strong>；<strong>至少勾选一段主档案经历或一个项目池项目</strong>。未勾选的板块不会用主档案回填（strict
          empty）。<strong>不使用个人总结（summary）</strong>；页眉标题来自所选身份的简历标题。
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5" />
              目标职位描述
            </CardTitle>
            <CardDescription>粘贴完整的 JD 文本（至少 50 字）。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="min-h-[160px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="粘贴职位描述..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">身份（必选）</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={identityId}
                onChange={(e) => setIdentityId(e.target.value)}
                disabled={identityOptions.length === 0}
              >
                {identityOptions.length === 0 ? (
                  <option value="">请先在设置中添加身份</option>
                ) : (
                  identityOptions.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} {e.label ? `(${e.label})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">主档案经历（至少与项目二选一）</p>
              {expList.length === 0 ? (
                <p className="text-xs text-muted-foreground">主档案暂无经历，请只选项目池或先在 Firestore/后台补全 profile.experience。</p>
              ) : (
                <ul className="space-y-2">
                  {expList.map((ex, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={expSel.has(i)}
                        onChange={(e) => setExpSel(toggleInSet(expSel, i, e.target.checked))}
                      />
                      <span>
                        <span className="font-medium">{ex.title}</span> @ {ex.company}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">项目池</p>
              {projects.length === 0 ? (
                <p className="text-xs text-muted-foreground">暂无项目，可在设置中通过 API 或后续 UI 维护项目池。</p>
              ) : (
                <ul className="space-y-2">
                  {projects.map((p) => (
                    <li key={p.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={projSel.has(p.id)}
                        onChange={(e) => setProjSel(toggleInSet(projSel, p.id, e.target.checked))}
                      />
                      <span className="font-medium">{p.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">教育（不选则本份简历不含教育段）</p>
              {eduList.length === 0 ? (
                <p className="text-xs text-muted-foreground">主档案暂无教育记录。</p>
              ) : (
                <ul className="space-y-2">
                  {eduList.map((ed, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={eduSel.has(i)}
                        onChange={(e) => setEduSel(toggleInSet(eduSel, i, e.target.checked))}
                      />
                      <span>
                        {ed.school} — {ed.degree}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">技能（不选则本份简历技能为空）</p>
              {skillList.length === 0 ? (
                <p className="text-xs text-muted-foreground">主档案暂无技能词条。</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {skillList.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={skillSel.has(i)}
                        onChange={(e) => setSkillSel(toggleInSet(skillSel, i, e.target.checked))}
                      />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!hasContentGate && (
              <p className="text-sm text-amber-600 dark:text-amber-500">
                请至少勾选一段经历或一个项目后再生成。
              </p>
            )}

            <Button onClick={handleGenerate} disabled={!canGenerate} className="gap-2">
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
              <CardDescription>基于所选片段与 JD 定制的内容。</CardDescription>
            </CardHeader>
            <CardContent>
              <ResumePreview result={result} />
              <Link to="/settings" className="mt-4 inline-block text-sm text-primary hover:underline">
                前往设置维护身份与项目池
              </Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              请先在
              <Link to="/settings" className="text-primary hover:underline">
                {' '}
                设置{' '}
              </Link>
              中维护身份池（含简历标题）、项目池，并连接 AI 密钥。主档案中的「个人总结」字段<strong>不会</strong>用于精修流程。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
