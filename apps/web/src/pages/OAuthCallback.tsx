import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useKeys } from '@/hooks/useKeys';

export function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { completeOAuthCallback } = useKeys();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const provider = 'gemini';

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth/login', { replace: true });
      return;
    }
    if (!code || !state) {
      setStatus('error');
      setMessage('缺少 OAuth 参数，请重试。');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/oauth/callback`;

    completeOAuthCallback(provider, code, state, redirectUri)
      .then((ok) => {
        if (ok) {
          setStatus('success');
          setMessage('连接成功，正在跳转...');
          setTimeout(() => navigate('/settings', { replace: true }), 1500);
        } else {
          setStatus('error');
          setMessage('OAuth 回调失败，请重试。');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('发生错误，请重试。');
      });
  }, [authLoading, user, code, state, completeOAuthCallback, navigate]);

  if (authLoading || status === 'pending') {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">正在完成授权...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4 px-4">
        <p className="text-destructive">{message}</p>
        <button
          className="text-primary hover:underline"
          onClick={() => navigate('/settings')}
        >
          返回设置
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
