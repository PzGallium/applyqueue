export type EventType = 'api_call' | 'resume_gen' | 'export' | 'jd_parse' | 'job_ingest';

export interface EventDetails {
  model: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  estimatedCost: number | null;
  latencyMs: number;
  success: boolean;
}

export interface TelemetryEvent {
  id: string;
  userId: string;
  type: EventType;
  provider: string;
  details: EventDetails;
  relatedId: string | null;
  createdAt: string;
  sessionId: string | null;
}

export interface UsageSummary {
  period: 'day' | 'week' | 'month';
  startDate: string;
  endDate: string;
  summary: {
    totalCalls: number;
    totalTokens: number;
    estimatedCost: number;
    byProvider: Record<
      string,
      { calls: number; tokens: number; cost: number }
    >;
    byType: Record<string, { count: number; cost: number }>;
  };
}
