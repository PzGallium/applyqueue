import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Settings, FileText } from 'lucide-react';
import { JobRankList } from '@/components/dashboard/JobRankList';

export function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="container px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">工作台</h1>
        <p className="mt-1 text-muted-foreground">
          {user?.displayName || user?.email || '欢迎回来'}，开始管理你的申请流程。
        </p>
      </div>

      <div className="space-y-6">
        <JobRankList />

        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="transition-colors hover:border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                申请队列
              </CardTitle>
              <CardDescription>
                查看待处理的申请队列与进度。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                功能开发中。
              </p>
            </CardContent>
          </Card>

          <Card className="transition-colors hover:border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                设置
              </CardTitle>
              <CardDescription>
                管理职位来源、个人偏好与 AI 密钥。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/settings">
                <Button variant="outline" size="sm">
                  前往设置
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
