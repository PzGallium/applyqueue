import { useState, useCallback } from 'react';
import type { UserProfile } from '@applyqueue/shared';
import { useAuth } from './useAuth';
import { apiRequest } from '@/lib/api';
import { getIdToken } from '@/lib/firebase';

export interface Preferences {
  roleKeywords?: string[];
  techKeywords?: string[];
  locationPriorities?: string[];
  targetLevels?: string[];
  priorityCompanies?: string[];
  batchSize?: number;
  targetRoles?: string[];
  targetLocations?: string[];
  minSalary?: number | null;
  excludeCompanies?: string[];
}

/** preferences 字段 + 可选 profile.resumeStyleReference（经 PUT /api/preferences 写入） */
export type PreferencesPatch = Partial<Preferences> & { resumeStyleReference?: string };

export function usePreferences() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPreferences = useCallback(async (): Promise<Preferences> => {
    if (!user) return {};
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken(user);
      const data = await apiRequest<{ preferences: Preferences; profile?: UserProfile | null }>(
        '/api/preferences',
        { token },
      );
      return data.preferences ?? {};
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load preferences');
      return {};
    } finally {
      setLoading(false);
    }
  }, [user]);

  /** 与 preferences 同文档，供精修页组装勾选 */
  const getProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!user) return null;
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken(user);
      const data = await apiRequest<{ preferences: Preferences; profile?: UserProfile | null }>(
        '/api/preferences',
        { token },
      );
      return data.profile ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const savePreferences = useCallback(
    async (prefs: PreferencesPatch): Promise<boolean> => {
      if (!user) return false;
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken(user);
        await apiRequest('/api/preferences', {
          method: 'PUT',
          body: JSON.stringify(prefs),
          token,
        });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save preferences');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  return { getPreferences, getProfile, savePreferences, loading, error };
}
