import { KeyVault } from '@/components/settings/KeyVault';
import { PreferencesForm } from '@/components/settings/PreferencesForm';
import { IdentityPoolManager } from '@/components/settings/IdentityPoolManager';
import { ResumeStyleReferenceCard } from '@/components/settings/ResumeStyleReferenceCard';

export function Settings() {
  return (
    <div className="container max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">设置</h1>
        <p className="mt-1 text-muted-foreground">
          管理 AI 密钥、简历偏好、简历样式参考、身份池与项目池。精修简历<strong>不使用</strong>个人总结（summary）；页眉标题使用<strong>主档案 headline</strong>。
        </p>
      </div>
      <div className="space-y-6">
        <PreferencesForm />
        <ResumeStyleReferenceCard />
        <IdentityPoolManager />
        <KeyVault />
      </div>
    </div>
  );
}
