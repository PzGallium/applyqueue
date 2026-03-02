import { useEffect, useState } from 'react';
import { Save, GripVertical, Plus, X, Settings2 } from 'lucide-react';
import { usePreferences, type Preferences } from '@/hooks/usePreferences';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const add = () => {
    const val = draft.trim();
    if (!val || items.some((i) => i.toLowerCase() === val.toLowerCase())) return;
    onChange([...items, val]);
    setDraft('');
  };

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const moveByDrag = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const next = [...items];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    onChange(next);
    setDraggedIndex(null);
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.setData('application/json', JSON.stringify({ index: idx }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
    const fromIndex = typeof raw === 'string' && /^\d+$/.test(raw) ? parseInt(raw, 10) : (() => { try { return JSON.parse(raw).index; } catch { return null; } })();
    if (fromIndex != null && fromIndex !== toIndex) moveByDrag(fromIndex, toIndex);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => setDraggedIndex(null);

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
              className={`group flex items-center gap-2 rounded-md border border-input px-2.5 py-1.5 text-sm ${draggedIndex === idx ? 'opacity-50' : ''} ${ordered ? 'cursor-grab active:cursor-grabbing' : ''}`}
              draggable={ordered}
              onDragStart={ordered ? (e) => handleDragStart(e, idx) : undefined}
              onDragOver={ordered ? handleDragOver : undefined}
              onDrop={ordered ? (e) => handleDrop(e, idx) : undefined}
              onDragEnd={ordered ? handleDragEnd : undefined}
            >
              {ordered && (
                <span
                  className="touch-none text-muted-foreground hover:text-foreground [.group:active_&]:cursor-grabbing"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <GripVertical className="h-4 w-4" />
                </span>
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

export function PreferencesForm() {
  const { getPreferences, savePreferences, loading, error } = usePreferences();
  const [saved, setSaved] = useState(false);

  const [roleKeywords, setRoleKeywords] = useState<string[]>([]);
  const [techKeywords, setTechKeywords] = useState<string[]>([]);

  useEffect(() => {
    getPreferences().then((p) => {
      if (p.roleKeywords?.length) setRoleKeywords(p.roleKeywords);
      if (p.techKeywords?.length) setTechKeywords(p.techKeywords);
    });
  }, [getPreferences]);

  const handleSave = async () => {
    setSaved(false);
    const ok = await savePreferences({ roleKeywords, techKeywords });
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              简历偏好
            </CardTitle>
            <CardDescription>
              目标岗位画像，用于精修时匹配合适的项目与经历。配置常申岗位类型与技术关键词。
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
          <h3 className="mb-1.5 text-sm font-medium">常申岗位类型 <span className="text-muted-foreground font-normal">（按优先级排序）</span></h3>
          <p className="mb-2 text-xs text-muted-foreground">
            精修简历时优先匹配这些岗位类型的项目与经历。第一个优先级最高。
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
            精修时强调简历中与这些技术相关的内容。
          </p>
          <TagList
            items={techKeywords}
            onChange={setTechKeywords}
            placeholder="如：Java, Distributed Systems"
          />
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
