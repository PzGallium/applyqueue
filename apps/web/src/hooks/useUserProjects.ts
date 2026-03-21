import { useState, useCallback } from 'react';
import type { UserProject } from '@applyqueue/shared';
import { useAuth } from './useAuth';
import { apiRequest } from '@/lib/api';
import { getIdToken } from '@/lib/firebase';

export function useUserProjects() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (): Promise<UserProject[]> => {
    if (!user) return [];
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken(user);
      const data = await apiRequest<{ projects: UserProject[] }>('/api/projects', { token });
      return data.projects ?? [];
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { list, loading, error };
}
