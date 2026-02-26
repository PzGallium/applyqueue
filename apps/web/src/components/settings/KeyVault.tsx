import { useEffect, useState } from 'react';
import { Key } from 'lucide-react';
import { LLM_PROVIDERS } from '@applyqueue/shared';
import { useKeys, type KeyStatus } from '@/hooks/useKeys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function ApiKeyForm({ provider, onSuccess }: { provider: string; onSuccess: () => void }) {
  const [key, setKey] = useState('');
  const { saveApiKey, loading, error } = useKeys();
  const config = LLM_PROVIDERS[provider as keyof typeof LLM_PROVIDERS];
  if (!config) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    const ok = await saveApiKey(provider, key.trim());
    if (ok) {
      setKey('');
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Input
        type="password"
        placeholder={`输入 ${config.name} API Key`}
        value={key}
        onChange={(e) => setKey(e.target.value)}
        className="font-mono text-sm"
      />
      <Button type="submit" size="sm" disabled={loading || !key.trim()}>
        保存
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}

export function KeyVault() {
  const { listKeys, deleteKey } = useKeys();
  const [keys, setKeys] = useState<KeyStatus[]>([]);

  const refresh = async () => {
    const k = await listKeys();
    setKeys(k);
  };

  useEffect(() => {
    refresh();
  }, [listKeys]);

  const providers = Object.keys(LLM_PROVIDERS);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          AI 密钥
        </CardTitle>
        <CardDescription>
          使用 API Key 配置各 LLM（如 Gemini、OpenAI、Anthropic），用于简历生成与 JD 解析。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {providers.map((provider) => {
          const config = LLM_PROVIDERS[provider as keyof typeof LLM_PROVIDERS];
          if (!config) return null;
          const status = keys.find((k) => k.provider === provider);
          return (
            <div key={provider} className="rounded-lg border p-4">
              <p className="mb-2 text-sm font-medium">{config.name}</p>
              {status?.configured ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">已配置</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (await deleteKey(provider)) refresh();
                    }}
                  >
                    删除
                  </Button>
                </div>
              ) : (
                <ApiKeyForm provider={provider} onSuccess={refresh} />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
