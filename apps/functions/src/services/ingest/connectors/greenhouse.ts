import type { JobSourceConfig } from '@applyqueue/shared';
import type { RawJob, SourceConnector } from './types';

interface GreenhouseJob {
  id: number;
  title: string;
  updated_at: string;
  absolute_url: string;
  location: { name: string };
  content: string;
  departments: Array<{ name: string }>;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

export const greenhouseConnector: SourceConnector = {
  type: 'greenhouse',

  async fetch(config: JobSourceConfig): Promise<RawJob[]> {
    const boardToken = config.config.baseUrl.replace(/^https?:\/\/boards-api\.greenhouse\.io\/v1\/boards\//, '').split('/')[0]
      || config.config.baseUrl;

    const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Greenhouse API error (${resp.status}): ${boardToken}`);

    const data = (await resp.json()) as GreenhouseResponse;
    const filters = config.config.filters ?? {};

    return data.jobs
      .filter((j) => {
        if (filters.titleContains) {
          const kw = filters.titleContains.toLowerCase();
          if (!j.title.toLowerCase().includes(kw)) return false;
        }
        return true;
      })
      .map((j) => ({
        externalId: `gh-${boardToken}-${j.id}`,
        title: j.title,
        company: config.name,
        location: j.location?.name ?? 'Unknown',
        url: j.absolute_url,
        description: stripHtml(j.content ?? ''),
        postedAt: j.updated_at ?? null,
        metadata: {
          source: 'greenhouse',
          boardToken,
          departments: j.departments?.map((d) => d.name) ?? [],
        },
      }));
  },
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
