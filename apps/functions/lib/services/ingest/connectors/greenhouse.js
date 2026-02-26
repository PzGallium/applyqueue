"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.greenhouseConnector = void 0;
exports.greenhouseConnector = {
    type: 'greenhouse',
    async fetch(config) {
        const boardToken = config.config.baseUrl.replace(/^https?:\/\/boards-api\.greenhouse\.io\/v1\/boards\//, '').split('/')[0]
            || config.config.baseUrl;
        const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;
        const resp = await fetch(url);
        if (!resp.ok)
            throw new Error(`Greenhouse API error (${resp.status}): ${boardToken}`);
        const data = (await resp.json());
        const filters = config.config.filters ?? {};
        return data.jobs
            .filter((j) => {
            if (filters.titleContains) {
                const kw = filters.titleContains.toLowerCase();
                if (!j.title.toLowerCase().includes(kw))
                    return false;
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
function stripHtml(html) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
//# sourceMappingURL=greenhouse.js.map