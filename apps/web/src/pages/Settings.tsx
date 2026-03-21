import { KeyVault } from '@/components/settings/KeyVault';
import { PreferencesForm } from '@/components/settings/PreferencesForm';
import { IdentityPoolManager } from '@/components/settings/IdentityPoolManager';

export function Settings() {
  return (
    <div className="container max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">设置</h1>
        <p className="mt-1 text-muted-foreground">
          管理 AI 密钥、简历偏好、身份池与项目池。精修简历<strong>不使用</strong>主档案中的个人总结（summary），标题请在身份池中填写。
        </p>
      </div>
      <div className="space-y-6">
        <PreferencesForm />
        <IdentityPoolManager />
        <KeyVault />
      </div>
    </div>
  );
}
