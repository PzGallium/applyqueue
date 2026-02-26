import { Link } from 'react-router-dom';
import { ArrowRight, Zap, FileText, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Landing() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <section className="container flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          New Grad 求职
          <br />
          <span className="text-primary">一键到位</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          按匹配度排名职位，apply N 触发全流程：JD 解析 → 定制简历 → 导出 PDF。
          <br />
          连接 Google 即可开始，无需 API Key。
        </p>
        <div className="mt-10 flex gap-4">
          {user ? (
            <Link to="/dashboard">
              <Button size="lg" className="gap-2">
                进入工作台
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Link to="/auth/login">
              <Button size="lg" className="gap-2">
                使用 Google 登录
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      <section className="border-t bg-muted/30 py-24">
        <div className="container px-4">
          <h2 className="text-center text-2xl font-semibold">核心能力</h2>
          <div className="mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-3">
            <Feature
              icon={<BarChart3 className="h-8 w-8" />}
              title="智能排名"
              desc="根据你的偏好与 JD 自动打分排序，优先申请最适合的职位。"
            />
            <Feature
              icon={<Zap className="h-8 w-8" />}
              title="Apply N"
              desc="输入 apply 3，一键解析 JD、生成定制简历并导出。"
            />
            <Feature
              icon={<FileText className="h-8 w-8" />}
              title="定制导出"
              desc="支持 PDF / DOCX，针对每份 JD 优化 bullet points。"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className={cn('rounded-xl border bg-card p-6 text-left')}>
      <div className="text-primary">{icon}</div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
