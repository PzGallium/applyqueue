import { useEffect, useState } from 'react';
import { Key, ChevronDown } from 'lucide-react';
import { LLM_PROVIDERS } from '@applyqueue/shared';
import { useKeys, type KeyStatus } from '@/hooks/useKeys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

function OAuthConnect({ provider }: { provider: string }) {
  const { getOAuthUrl, loading, error } = useKeys();
  const config = LLM_PROVIDERS[provider as keyof typeof LLM_PROVIDERS];
  if (!config) return null;

  const handleConnect = async () => {
    const url = await getOAuthUrl(provider);
    if (url) window.location.href = url;
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleConnect}
        disabled={loading}
        className="w-full gap-2 sm:w-auto"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Connect with Google
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function ByokForm({ provider, onSuccess }: { provider: string; onSuccess: () => void }) {
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
        placeholder={`Paste your ${config.name} API key`}
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

  const geminiStatus = keys.find((k) => k.provider === 'gemini');
  const byokProviders = Object.keys(LLM_PROVIDERS);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          AI 密钥
        </CardTitle>
        <CardDescription>
          连接 Google 即可使用 Gemini。或使用自己的 API Key（高级选项）。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* OAuth primary — Gemini */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">首选：Google 账号</h4>
          {geminiStatus?.configured ? (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">已连接</p>
                <p className="text-sm text-muted-foreground">
                  {geminiStatus.displayLabel || 'Google 账号'} · Gemini
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (await deleteKey('gemini')) refresh();
                }}
              >
                断开
              </Button>
            </div>
          ) : (
            <OAuthConnect provider="gemini" />
          )}
        </div>

        {/* BYOK — collapsible */}
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger className="text-muted-foreground hover:text-foreground">
            <span className="flex items-center gap-2 text-sm">
              <ChevronDown className="h-4 w-4" />
              Advanced: 使用自己的 API Key
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            {byokProviders.map((provider) => {
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
                    <ByokForm provider={provider} onSuccess={refresh} />
                  )}
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
