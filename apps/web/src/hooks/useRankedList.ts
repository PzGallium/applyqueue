import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { apiRequest } from '@/lib/api';
import { getIdToken } from '@/lib/firebase';

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo: string | null;
  location: string;
  locationType: string;
  url: string;
  level: string;
  postedAt: string;
  salary: { min: number | null; max: number | null; currency: string };
}

export interface ScoreBreakdown {
  roleMatch: number;
  locationMatch: number;
  companyRating: number;
  salaryMatch: number;
  recency: number;
}

export interface RankedItem {
  rank: number;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  addedAt: string;
  job: Job | null;
}

export interface RankedListMeta {
  userId: string;
  totalJobs: number;
  generatedAt: string | null;
  filters: { targetRoles: string[]; targetLocations: string[]; level: string[] };
}

export interface RankedListResponse {
  list: RankedListMeta | null;
  items: RankedItem[];
  generatedAt: string | null;
}

export function useRankedList() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRankedList = useCallback(async (): Promise<RankedListResponse> => {
    if (!user) {
      return { list: null, items: [], generatedAt: null };
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken(user);
      const data = await apiRequest<RankedListResponse>('/api/ranked-list', { token });
      return {
        list: data.list ?? null,
        items: data.items ?? [],
        generatedAt: data.generatedAt ?? null,
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ranked list');
      return { list: null, items: [], generatedAt: null };
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { fetchRankedList, loading, error };
}
