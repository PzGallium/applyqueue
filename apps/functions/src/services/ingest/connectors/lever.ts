import type { JobSourceConfig } from '@applyqueue/shared';
import type { RawJob, SourceConnector } from './types';

interface LeverPosting {
  id: string;
  text: string;
  createdAt: number;
  hostedUrl: string;
  categories: {
    location?: string;
    team?: string;
    department?: string;
    commitment?: string;
  };
  description: string;
  descriptionPlain: string;
  lists: Array<{ text: string; content: string }>;
}

export const leverConnector: SourceConnector = {
  type: 'lever',

  async fetch(config: JobSourceConfig): Promise<RawJob[]> {
    const companySlug = config.config.baseUrl.replace(/^https?:\/\/api\.lever\.co\/v0\/postings\//, '').split(/[/?]/)[0]
      || config.config.baseUrl;

    const url = `https://api.lever.co/v0/postings/${companySlug}?mode=json`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Lever API error (${resp.status}): ${companySlug}`);

    const data = (await resp.json()) as LeverPosting[];
    const filters = config.config.filters ?? {};

    return data
      .filter((p) => {
        if (filters.titleContains) {
          const kw = filters.titleContains.toLowerCase();
          if (!p.text.toLowerCase().includes(kw)) return false;
        }
        return true;
      })
      .map((p) => ({
        externalId: `lv-${companySlug}-${p.id}`,
        title: p.text,
        company: config.name,
        location: p.categories?.location ?? 'Unknown',
        url: p.hostedUrl,
        description: p.descriptionPlain || stripHtml(p.description || ''),
        postedAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
        metadata: {
          source: 'lever',
          companySlug,
          team: p.categories?.team ?? null,
          department: p.categories?.department ?? null,
          commitment: p.categories?.commitment ?? null,
        },
      }));
  },
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
