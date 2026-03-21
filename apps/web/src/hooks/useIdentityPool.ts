import { useState, useCallback } from 'react';
import type { IdentityEntry } from '@applyqueue/shared';
import { useAuth } from './useAuth';
import { apiRequest } from '@/lib/api';
import { getIdToken } from '@/lib/firebase';

export type { IdentityEntry };

export function useIdentityPool() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (): Promise<{ items: IdentityEntry[]; defaultId: string | null }> => {
    if (!user) return { items: [], defaultId: null };
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken(user);
      const data = await apiRequest<{ items: IdentityEntry[]; defaultId: string | null }>('/api/identity-pool', { token });
      return { items: data.items ?? [], defaultId: data.defaultId ?? null };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load identity pool');
      return { items: [], defaultId: null };
    } finally {
      setLoading(false);
    }
  }, [user]);

  const create = useCallback(
    async (name: string, email: string, phone: string, label = '', location = ''): Promise<boolean> => {
      if (!user) return false;
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken(user);
        await apiRequest('/api/identity-pool', {
          method: 'POST',
          body: JSON.stringify({ name, email, phone, label, location }),
          token,
        });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create identity');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  const update = useCallback(
    async (
      id: string,
      updates: Partial<{
        name: string;
        email: string;
        phone: string;
        label: string;
        location: string;
      }>,
    ): Promise<boolean> => {
      if (!user) return false;
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken(user);
        await apiRequest('/api/identity-pool', {
          method: 'PUT',
          body: JSON.stringify({ id, ...updates }),
          token,
        });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update identity');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false;
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken(user);
        await apiRequest('/api/identity-pool', {
          method: 'DELETE',
          body: JSON.stringify({ id }),
          token,
        });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete identity');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  const setDefault = useCallback(
    async (id: string | null): Promise<boolean> => {
      if (!user) return false;
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken(user);
        await apiRequest('/api/identity-pool', {
          method: 'PATCH',
          body: JSON.stringify({ id }),
          token,
        });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to set default');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  return { list, create, update, remove, setDefault, loading, error };
}
