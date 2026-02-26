import { Link } from 'react-router-dom';
import { LayoutDashboard, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="text-primary">ApplyQueue</span>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <LayoutDashboard className="h-4 w-4" />
                  工作台
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Settings className="h-4 w-4" />
                  设置
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={logout}>
                <LogOut className="h-4 w-4" />
                退出
              </Button>
            </>
          ) : (
            <Link to="/auth/login">
              <Button size="sm">登录</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
