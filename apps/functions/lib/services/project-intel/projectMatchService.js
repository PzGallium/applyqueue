"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBulletRewritePrompt = buildBulletRewritePrompt;
exports.parseBulletResponse = parseBulletResponse;
exports.runProjectScoring = runProjectScoring;
exports.buildExplanation = buildExplanation;
exports.buildProjectMatchDocs = buildProjectMatchDocs;
exports.buildMatchResult = buildMatchResult;
const shared_1 = require("@applyqueue/shared");
/**
 * Prompt template for LLM-based bullet rewriting.
 * Generates ATS-friendly bullet points for selected projects
 * using only facts present in the original bullets.
 */
function buildBulletRewritePrompt(project, jdKeywords) {
    return `You are an ATS resume bullet writer. Rewrite the project bullets below to be concise, metric-driven, and aligned with these target keywords.

RULES:
- Use ONLY facts from the original bullets. Do NOT invent metrics or claims.
- Start each bullet with a strong action verb.
- Naturally incorporate target keywords where truthful.
- Keep each bullet under 120 characters.
- Return ONLY a JSON array of strings, no explanation.

Target keywords: ${jdKeywords.join(', ')}

Project: ${project.title}
Summary: ${project.summary}

Original bullets:
${project.rawBullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}

Return format: ["bullet1", "bullet2", ...]`;
}
/**
 * Parse LLM bullet rewrite response into string array.
 */
function parseBulletResponse(raw) {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed))
        return [];
    return parsed.filter((s) => typeof s === 'string');
}
/**
 * Run the full deterministic scoring pass, select top K projects,
 * and build the keyword strategy.
 *
 * Bullet generation is handled separately via LLM (caller orchestrates).
 */
function runProjectScoring(projects, jd, topK = 3, weights) {
    const rankings = (0, shared_1.rankProjects)(projects, jd, weights);
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const ranked = rankings.map((r) => ({
        project: projectMap.get(r.projectId),
        scoreTotal: r.scoreTotal,
        scoreBreakdown: r.scoreBreakdown,
    }));
    const selected = ranked.slice(0, topK).map((r) => r.project);
    const keywordStrategy = (0, shared_1.buildKeywordStrategy)(selected, jd);
    return { ranked, selected, keywordStrategy };
}
/**
 * Build explanation string describing why projects were chosen.
 */
function buildExplanation(ranked, topK) {
    const selected = ranked.slice(0, topK);
    const lines = selected.map((r, i) => {
        const b = r.scoreBreakdown;
        const topFactor = Object.entries(b).sort(([, a], [, b]) => b - a)[0];
        return `${i + 1}. "${r.project.title}" (score: ${r.scoreTotal}/100) — strongest signal: ${topFactor[0]} (${topFactor[1]}/100)`;
    });
    return `Selected ${topK} of ${ranked.length} projects based on JD alignment:\n${lines.join('\n')}`;
}
/**
 * Assemble ProjectMatch Firestore documents from scoring results.
 */
function buildProjectMatchDocs(userId, jdProfileId, ranked, topK, bulletMap, keywordMap, idGenerator) {
    return ranked.map((r, i) => ({
        id: idGenerator(),
        userId,
        jdProfileId,
        projectId: r.project.id,
        scoreTotal: r.scoreTotal,
        scoreBreakdown: r.scoreBreakdown,
        selected: i < topK,
        rank: i + 1,
        generatedKeywords: keywordMap[r.project.id] ?? [],
        generatedBullets: bulletMap[r.project.id] ?? [],
        createdAt: new Date().toISOString(),
    }));
}
/**
 * Assemble the final API response from all computed artifacts.
 */
function buildMatchResult(jdProfileId, ranked, topK, matchDocs, keywordStrategy, bulletMap) {
    const selected = matchDocs
        .filter((m) => m.selected)
        .sort((a, b) => a.rank - b.rank);
    const projectMap = new Map(ranked.map((r) => [r.project.id, r.project]));
    return {
        jdProfileId,
        selectedProjects: selected.map((m) => ({
            rank: m.rank,
            project: projectMap.get(m.projectId),
            match: m,
        })),
        keywordStrategy,
        bulletSuggestions: bulletMap,
        explanation: buildExplanation(ranked, topK),
    };
}
//# sourceMappingURL=projectMatchService.js.map