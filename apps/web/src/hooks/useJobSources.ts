import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { apiRequest } from '@/lib/api';
import { getIdToken } from '@/lib/firebase';

export interface JobSource {
  id: string;
  name: string;
  type: string;
  config: { baseUrl: string; filters: Record<string, string>; schedule: string };
  isEnabled: boolean;
  lastRunAt: string | null;
  lastRunStatus: 'success' | 'error' | null;
  jobCount: number;
  createdAt: string;
  updatedAt: string;
}

export function useJobSources() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listSources = useCallback(async (): Promise<JobSource[]> => {
    if (!user) return [];
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken(user);
      const data = await apiRequest<{ sources: JobSource[] }>('/api/job-sources', { token });
      return data.sources ?? [];
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sources');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addSource = useCallback(
    async (name: string, type: string, baseUrl: string, filters?: Record<string, string>): Promise<boolean> => {
      if (!user) return false;
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken(user);
        await apiRequest('/api/job-sources', {
          method: 'POST',
          body: JSON.stringify({ name, type, config: { baseUrl, filters: filters ?? {}, schedule: '0 9,21 * * *' } }),
          token,
        });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add source');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const deleteSource = useCallback(
    async (sourceId: string): Promise<boolean> => {
      if (!user) return false;
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken(user);
        await apiRequest(`/api/job-sources?sourceId=${sourceId}`, { method: 'DELETE', token });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete source');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const triggerIngest = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken(user);
      await apiRequest('/api/ingest/trigger', { method: 'POST', token });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to trigger ingest');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { listSources, addSource, deleteSource, triggerIngest, loading, error };
}
