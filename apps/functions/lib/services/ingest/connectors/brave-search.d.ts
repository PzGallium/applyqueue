import type { SourceConnector } from './types';
/**
 * Brave Search connector — discovers job postings via web search,
 * extracts ATS URLs, and returns them as RawJob entries.
 *
 * config.config.baseUrl should be the Brave API key (or it can be
 * passed via config.config.filters.apiKey).
 * config.config.filters.query contains the search query.
 */
export declare const braveSearchConnector: SourceConnector;
