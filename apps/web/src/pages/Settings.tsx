import { KeyVault } from '@/components/settings/KeyVault';
import { SourceManager } from '@/components/settings/SourceManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function Settings() {
  return (
    <div className="container max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">设置</h1>
        <p className="mt-1 text-muted-foreground">管理 AI 密钥、职位来源与个人偏好。</p>
      </div>
      <div className="space-y-6">
        <KeyVault />
        <SourceManager />
        <Card>
          <CardHeader>
            <CardTitle>偏好</CardTitle>
            <CardDescription>
              目标角色、地点、公司规模等。即将支持。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">敬请期待。</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
