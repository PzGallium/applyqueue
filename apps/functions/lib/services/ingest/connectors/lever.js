"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leverConnector = void 0;
exports.leverConnector = {
    type: 'lever',
    async fetch(config) {
        const companySlug = config.config.baseUrl.replace(/^https?:\/\/api\.lever\.co\/v0\/postings\//, '').split(/[/?]/)[0]
            || config.config.baseUrl;
        const url = `https://api.lever.co/v0/postings/${companySlug}?mode=json`;
        const resp = await fetch(url);
        if (!resp.ok)
            throw new Error(`Lever API error (${resp.status}): ${companySlug}`);
        const data = (await resp.json());
        const filters = config.config.filters ?? {};
        return data
            .filter((p) => {
            if (filters.titleContains) {
                const kw = filters.titleContains.toLowerCase();
                if (!p.text.toLowerCase().includes(kw))
                    return false;
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
function stripHtml(html) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
//# sourceMappingURL=lever.js.map