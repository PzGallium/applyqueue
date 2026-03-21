import { useEffect, useState } from 'react';
import { User, Plus, Trash2, Star } from 'lucide-react';
import { useIdentityPool } from '@/hooks/useIdentityPool';
import type { IdentityEntry } from '@applyqueue/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function IdentityItem({
  entry,
  isDefault,
  onSetDefault,
  onDelete,
  onUpdateLocation,
}: {
  entry: IdentityEntry;
  isDefault: boolean;
  onSetDefault: () => void;
  onDelete: () => void;
  onUpdateLocation: (location: string) => Promise<void>;
}) {
  const [location, setLocation] = useState(entry.location ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocation(entry.location ?? '');
  }, [entry.id, entry.location]);

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{entry.name}</span>
            {isDefault && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">默认</span>
            )}
            {entry.label && (
              <span className="text-xs text-muted-foreground">{entry.label}</span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {entry.email} · {entry.phone}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSetDefault}
            disabled={isDefault}
            title="设为默认"
          >
            <Star className={`h-4 w-4 ${isDefault ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </div>
      <div className="space-y-2 rounded-md bg-muted/40 p-2">
        <p className="text-xs font-medium text-muted-foreground">所在地（可选，精修组装用）</p>
        <Input
          placeholder="所在地"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="h-8 text-sm"
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onUpdateLocation(location.trim());
            } finally {
              setSaving(false);
            }
          }}
        >
          保存所在地
        </Button>
      </div>
    </div>
  );
}

function AddIdentityForm({ onSuccess }: { onSuccess: () => void }) {
  const { create, loading, error } = useIdentityPool();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [label, setLabel] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) return;
    const ok = await create(name.trim(), email.trim(), phone.trim(), label.trim(), location.trim());
    if (ok) {
      setName('');
      setEmail('');
      setPhone('');
      setLabel('');
      setLocation('');
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        placeholder="姓名"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        type="email"
        placeholder="邮箱"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        placeholder="电话"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
      />
      <Input
        placeholder="所在地（可选）"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <Input
        placeholder="标签（如：主号、备用）"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <Button type="submit" size="sm" disabled={loading || !name.trim() || !email.trim() || !phone.trim()} className="gap-1.5">
        <Plus className="h-4 w-4" />
        添加
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}

export function IdentityPoolManager() {
  const { list, remove, setDefault, update } = useIdentityPool();
  const [items, setItems] = useState<IdentityEntry[]>([]);
  const [defaultId, setDefaultId] = useState<string | null>(null);

  const refresh = async () => {
    const res = await list();
    setItems(res.items);
    setDefaultId(res.defaultId);
  };

  useEffect(() => {
    refresh();
  }, [list]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          身份池
        </CardTitle>
        <CardDescription>
          维护多组姓名、邮箱、电话与所在地。精修简历须选择一条身份；<strong>页眉标题（headline）使用主档案</strong>，版式参考见「简历样式参考」卡片。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length > 0 && (
          <div className="space-y-3">
            {items.map((entry) => (
              <IdentityItem
                key={entry.id}
                entry={entry}
                isDefault={defaultId === entry.id}
                onSetDefault={async () => {
                  if (await setDefault(entry.id)) refresh();
                }}
                onDelete={async () => {
                  if (await remove(entry.id)) refresh();
                }}
                onUpdateLocation={async (loc) => {
                  if (await update(entry.id, { location: loc })) refresh();
                }}
              />
            ))}
          </div>
        )}
        <div className="rounded-lg border border-dashed p-4">
          <p className="mb-3 text-sm font-medium">添加身份</p>
          <AddIdentityForm onSuccess={refresh} />
        </div>
      </CardContent>
    </Card>
  );
}
