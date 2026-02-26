import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { apiRequest } from '@/lib/api';
import { getIdToken } from '@/lib/firebase';

export interface KeyStatus {
  provider: string;
  configured: boolean;
  mode?: 'api_key' | 'oauth';
  updatedAt?: string | null;
  displayLabel?: string;
}

export interface KeysListResponse {
  keys: KeyStatus[];
}

export function useKeys() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listKeys = useCallback(async (): Promise<KeyStatus[]> => {
    if (!user) return [];
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken(user);
      const data = await apiRequest<KeysListResponse>('/api/keys', { token });
      return data.keys ?? [];
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load keys');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getOAuthUrl = useCallback(
    async (provider: string): Promise<string | null> => {
      if (!user) return null;
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken(user);
        const data = await apiRequest<{ authUrl: string }>(
          `/api/keys/oauth/authorize/${provider}`,
          { token }
        );
        return data.authUrl ?? null;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to get OAuth URL');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const saveApiKey = useCallback(
    async (provider: string, apiKey: string): Promise<boolean> => {
      if (!user) return false;
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken(user);
        await apiRequest('/api/keys', {
          method: 'PUT',
          body: JSON.stringify({ provider, apiKey }),
          token,
        });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save key');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const deleteKey = useCallback(
    async (provider: string): Promise<boolean> => {
      if (!user) return false;
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken(user);
        await apiRequest(`/api/keys?provider=${provider}`, { method: 'DELETE', token });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete key');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const completeOAuthCallback = useCallback(
    async (provider: string, code: string, state: string, redirectUri: string): Promise<boolean> => {
      if (!user) return false;
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken(user);
        await apiRequest('/api/keys/oauth/callback', {
          method: 'POST',
          body: JSON.stringify({ provider, code, state, redirectUri }),
          token,
        });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'OAuth callback failed');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return {
    listKeys,
    getOAuthUrl,
    saveApiKey,
    deleteKey,
    completeOAuthCallback,
    loading,
    error,
  };
}
