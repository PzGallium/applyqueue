import { useEffect, useState } from 'react';
import { User, Plus, Trash2, Star } from 'lucide-react';
import { useIdentityPool, type IdentityEntry } from '@/hooks/useIdentityPool';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function IdentityItem({
  entry,
  isDefault,
  onSetDefault,
  onDelete,
}: {
  entry: IdentityEntry;
  isDefault: boolean;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
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
  );
}

function AddIdentityForm({ onSuccess }: { onSuccess: () => void }) {
  const { create, loading, error } = useIdentityPool();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [label, setLabel] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) return;
    const ok = await create(name.trim(), email.trim(), phone.trim(), label.trim());
    if (ok) {
      setName('');
      setEmail('');
      setPhone('');
      setLabel('');
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
  const { list, remove, setDefault, loading } = useIdentityPool();
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
          维护多组姓名、邮箱、电话，用于投递时切换使用。精修简历时可选择要使用的身份。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length > 0 && (
          <div className="space-y-2">
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
