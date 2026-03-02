import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Settings, FileEdit } from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="container px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">工作台</h1>
        <p className="mt-1 text-muted-foreground">
          {user?.displayName || user?.email || '欢迎回来'}，用项目池与经历池精修你的简历。
        </p>
      </div>

      <div className="space-y-6">
        <Card className="transition-colors hover:border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5" />
              精修简历
            </CardTitle>
            <CardDescription>
              粘贴目标职位描述，系统将根据你的项目池、经历池与身份池自动组装并精修一份定制简历。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/refine">
              <Button>生成精修简历</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              设置
            </CardTitle>
            <CardDescription>
              管理项目池、经历池、身份池与 AI 密钥。
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
  );
}
