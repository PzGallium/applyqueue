import type { JobSourceConfig } from '@applyqueue/shared';
import type { RawJob, SourceConnector } from './types';

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
}

interface BraveSearchResponse {
  web?: { results: BraveWebResult[] };
}

const ATS_PATTERNS: Record<string, string> = {
  'boards.greenhouse.io': 'greenhouse',
  'job-boards.greenhouse.io': 'greenhouse',
  'jobs.lever.co': 'lever',
  'jobs.ashbyhq.com': 'ashby',
};

function detectAtsType(url: string): string | null {
  for (const [pattern, type] of Object.entries(ATS_PATTERNS)) {
    if (url.includes(pattern)) return type;
  }
  return null;
}

function extractCompanyFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[0] ?? u.hostname;
  } catch {
    return 'Unknown';
  }
}

/**
 * Brave Search connector — discovers job postings via web search,
 * extracts ATS URLs, and returns them as RawJob entries.
 *
 * config.config.baseUrl should be the Brave API key (or it can be
 * passed via config.config.filters.apiKey).
 * config.config.filters.query contains the search query.
 */
export const braveSearchConnector: SourceConnector = {
  type: 'custom',

  async fetch(config: JobSourceConfig): Promise<RawJob[]> {
    const apiKey = config.config.filters?.apiKey || config.config.baseUrl;
    const query = config.config.filters?.query ?? 'software engineer new grad';
    const sites = config.config.filters?.sites ?? 'site:boards.greenhouse.io OR site:jobs.lever.co';
    const fullQuery = `${query} ${sites}`;

    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(fullQuery)}&count=20`;
    const resp = await fetch(url, {
      headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' },
    });
    if (!resp.ok) throw new Error(`Brave Search API error (${resp.status})`);

    const data = (await resp.json()) as BraveSearchResponse;
    const results = data.web?.results ?? [];

    return results
      .filter((r) => detectAtsType(r.url) !== null)
      .map((r, i) => ({
        externalId: `brave-${Buffer.from(r.url).toString('base64url').slice(0, 40)}`,
        title: r.title,
        company: config.name || extractCompanyFromUrl(r.url),
        location: 'Unknown',
        url: r.url,
        description: r.description,
        postedAt: null,
        metadata: {
          source: 'brave_search',
          atsType: detectAtsType(r.url),
          originalQuery: fullQuery,
        },
      }));
  },
};
