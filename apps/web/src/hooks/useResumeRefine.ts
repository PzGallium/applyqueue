import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { apiRequest } from '@/lib/api';
import { getIdToken } from '@/lib/firebase';

export interface ResumeContent {
  headline: string;
  summary: string;
  experience: Array<{ company: string; title: string; date: string; bullets: string[] }>;
  education: Array<{ school: string; degree: string; major: string; date: string; gpa: string | null }>;
  skills: string[];
  projects: Array<{ name: string; description: string; url: string | null; highlights: string[] }>;
}

export interface RefineResult {
  resumeContent: ResumeContent;
  changes: Array<{ section: string; field: string; original: string; tailored: string; reason: string }>;
  identity: { name: string; email: string; phone: string } | null;
}

export function useResumeRefine() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refine = useCallback(
    async (
      rawJdText: string,
      options?: { identityId?: string; useProjectPool?: boolean },
    ): Promise<RefineResult | null> => {
      if (!user) return null;
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken(user);
        const data = await apiRequest<RefineResult>('/api/resume/refine', {
          method: 'POST',
          body: JSON.stringify({
            rawJdText: rawJdText.trim(),
            identityId: options?.identityId,
            useProjectPool: options?.useProjectPool ?? true,
            llmProvider: 'gemini',
          }),
          token,
        });
        return data;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Resume generation failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  return { refine, loading, error };
}
