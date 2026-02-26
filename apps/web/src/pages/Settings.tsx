import { KeyVault } from '@/components/settings/KeyVault';
import { SourceManager } from '@/components/settings/SourceManager';
import { PreferencesForm } from '@/components/settings/PreferencesForm';

export function Settings() {
  return (
    <div className="container max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">设置</h1>
        <p className="mt-1 text-muted-foreground">管理 AI 密钥、职位来源与个人偏好。</p>
      </div>
      <div className="space-y-6">
        <PreferencesForm />
        <SourceManager />
        <KeyVault />
      </div>
    </div>
  );
}
