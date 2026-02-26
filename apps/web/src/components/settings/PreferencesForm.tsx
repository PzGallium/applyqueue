import { useEffect, useState } from 'react';
import { Save, GripVertical, Plus, X, Settings2 } from 'lucide-react';
import { usePreferences, type Preferences } from '@/hooks/usePreferences';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const LEVEL_OPTIONS = [
  { value: 'new_grad', label: 'New Grad' },
  { value: 'entry', label: 'Entry Level' },
  { value: 'intern', label: 'Intern' },
] as const;

const DEFAULT_BIG_COMPANIES = [
  'Google', 'Meta', 'Apple', 'Amazon', 'Microsoft', 'Netflix',
  'Uber', 'Airbnb', 'Stripe', 'Coinbase', 'ByteDance', 'Tesla',
  'Oracle', 'Salesforce', 'Adobe', 'LinkedIn', 'Snap', 'Spotify',
  'Databricks', 'Snowflake', 'Palantir', 'Bloomberg',
];

function TagList({
  items,
  onChange,
  placeholder,
  ordered,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  ordered?: boolean;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const val = draft.trim();
    if (!val || items.some((i) => i.toLowerCase() === val.toLowerCase())) return;
    onChange([...items, val]);
    setDraft('');
  };

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...items];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  };

  const moveDown = (idx: number) => {
    if (idx === items.length - 1) return;
    const next = [...items];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add(); }
          }}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={!draft.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div
              key={`${item}-${idx}`}
              className="group flex items-center gap-2 rounded-md border border-input px-2.5 py-1.5 text-sm"
            >
              {ordered && (
                <div className="flex flex-col">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                  >
                    <GripVertical className="h-3 w-3 rotate-180" />
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => moveDown(idx)}
                    disabled={idx === items.length - 1}
                  >
                    <GripVertical className="h-3 w-3" />
                  </button>
                </div>
              )}
              {ordered && (
                <span className="w-5 text-center text-xs font-mono text-muted-foreground">
                  {idx + 1}
                </span>
              )}
              <span className="flex-1">{item}</span>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LevelPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (levels: string[]) => void;
}) {
  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {LEVEL_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => toggle(opt.value)}
          className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
            selected.includes(opt.value)
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-input hover:bg-accent'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function PreferencesForm() {
  const { getPreferences, savePreferences, loading, error } = usePreferences();
  const [saved, setSaved] = useState(false);

  const [roleKeywords, setRoleKeywords] = useState<string[]>([]);
  const [techKeywords, setTechKeywords] = useState<string[]>([]);
  const [locationPriorities, setLocationPriorities] = useState<string[]>([]);
  const [targetLevels, setTargetLevels] = useState<string[]>([]);
  const [priorityCompanies, setPriorityCompanies] = useState<string[]>([]);
  const [batchSize, setBatchSize] = useState(10);

  useEffect(() => {
    getPreferences().then((p) => {
      if (p.roleKeywords?.length) setRoleKeywords(p.roleKeywords);
      if (p.techKeywords?.length) setTechKeywords(p.techKeywords);
      if (p.locationPriorities?.length) setLocationPriorities(p.locationPriorities);
      if (p.targetLevels?.length) setTargetLevels(p.targetLevels);
      if (p.priorityCompanies?.length) setPriorityCompanies(p.priorityCompanies);
      if (p.batchSize) setBatchSize(p.batchSize);
    });
  }, [getPreferences]);

  const handleSave = async () => {
    setSaved(false);
    const ok = await savePreferences({
      roleKeywords,
      techKeywords,
      locationPriorities,
      targetLevels,
      priorityCompanies,
      batchSize,
    });
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const addDefaultBigCompanies = () => {
    const existing = new Set(priorityCompanies.map((c) => c.toLowerCase()));
    const toAdd = DEFAULT_BIG_COMPANIES.filter((c) => !existing.has(c.toLowerCase()));
    setPriorityCompanies([...priorityCompanies, ...toAdd]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              职位偏好
            </CardTitle>
            <CardDescription>
              配置岗位关键词、地点、级别等偏好，系统将按优先级排序推送。顺序越靠前优先级越高。
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleSave}
            disabled={loading}
          >
            <Save className="h-4 w-4" />
            {saved ? '已保存' : '保存'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Role Keywords */}
        <section>
          <h3 className="mb-1.5 text-sm font-medium">岗位关键词 <span className="text-muted-foreground font-normal">（按优先级排序）</span></h3>
          <p className="mb-2 text-xs text-muted-foreground">
            职位标题/描述中匹配这些关键词的岗位会被优先推荐。第一个优先级最高。
          </p>
          <TagList
            items={roleKeywords}
            onChange={setRoleKeywords}
            placeholder="如：Java Backend"
            ordered
          />
        </section>

        {/* Tech Keywords */}
        <section>
          <h3 className="mb-1.5 text-sm font-medium">技术关键词</h3>
          <p className="mb-2 text-xs text-muted-foreground">
            JD 中包含这些技术的岗位得分更高（不区分大小写）。
          </p>
          <TagList
            items={techKeywords}
            onChange={setTechKeywords}
            placeholder="如：Java, Distributed Systems"
          />
        </section>

        {/* Location Priorities */}
        <section>
          <h3 className="mb-1.5 text-sm font-medium">地点优先级 <span className="text-muted-foreground font-normal">（按优先级排序）</span></h3>
          <p className="mb-2 text-xs text-muted-foreground">
            "Remote" 会匹配远程岗位。具体城市按顺序降权。
          </p>
          <TagList
            items={locationPriorities}
            onChange={setLocationPriorities}
            placeholder="如：Remote"
            ordered
          />
        </section>

        {/* Target Levels */}
        <section>
          <h3 className="mb-1.5 text-sm font-medium">目标级别</h3>
          <LevelPicker selected={targetLevels} onChange={setTargetLevels} />
        </section>

        {/* Priority Companies */}
        <section>
          <h3 className="mb-1.5 text-sm font-medium">
            高优先公司 <span className="text-muted-foreground font-normal">（大厂优先推送）</span>
          </h3>
          <p className="mb-2 text-xs text-muted-foreground">
            这些公司的 New Grad/Intern 岗位会获得最高优先推荐。
          </p>
          <TagList
            items={priorityCompanies}
            onChange={setPriorityCompanies}
            placeholder="如：Google"
          />
          {priorityCompanies.length === 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={addDefaultBigCompanies}
            >
              一键添加常见大厂
            </Button>
          )}
        </section>

        {/* Batch Size */}
        <section>
          <h3 className="mb-1.5 text-sm font-medium">每批推送数量</h3>
          <p className="mb-2 text-xs text-muted-foreground">
            每天推送两次（早 9 点 + 晚 9 点），每次推送 Top N 条。
          </p>
          <Input
            type="number"
            min={1}
            max={50}
            value={batchSize}
            onChange={(e) => setBatchSize(Number(e.target.value) || 10)}
            className="w-24"
          />
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
