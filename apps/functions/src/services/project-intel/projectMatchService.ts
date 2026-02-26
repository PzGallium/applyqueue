import type {
  UserProject,
  JdProfile,
  ProjectMatch,
  ProjectMatchResult,
  ProjectScoreWeights,
  KeywordStrategy,
} from '@applyqueue/shared';
import { rankProjects, buildKeywordStrategy } from '@applyqueue/shared';

/**
 * Prompt template for LLM-based bullet rewriting.
 * Generates ATS-friendly bullet points for selected projects
 * using only facts present in the original bullets.
 */
export function buildBulletRewritePrompt(
  project: UserProject,
  jdKeywords: string[],
): string {
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
export function parseBulletResponse(raw: string): string[] {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((s): s is string => typeof s === 'string');
}

/**
 * Run the full deterministic scoring pass, select top K projects,
 * and build the keyword strategy.
 *
 * Bullet generation is handled separately via LLM (caller orchestrates).
 */
export function runProjectScoring(
  projects: UserProject[],
  jd: JdProfile,
  topK: number = 3,
  weights?: ProjectScoreWeights,
): {
  ranked: Array<{ project: UserProject; scoreTotal: number; scoreBreakdown: ProjectMatch['scoreBreakdown'] }>;
  selected: UserProject[];
  keywordStrategy: KeywordStrategy;
} {
  const rankings = rankProjects(projects, jd, weights);
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const ranked = rankings.map((r) => ({
    project: projectMap.get(r.projectId)!,
    scoreTotal: r.scoreTotal,
    scoreBreakdown: r.scoreBreakdown,
  }));

  const selected = ranked.slice(0, topK).map((r) => r.project);
  const keywordStrategy = buildKeywordStrategy(selected, jd);

  return { ranked, selected, keywordStrategy };
}

/**
 * Build explanation string describing why projects were chosen.
 */
export function buildExplanation(
  ranked: Array<{ project: UserProject; scoreTotal: number; scoreBreakdown: ProjectMatch['scoreBreakdown'] }>,
  topK: number,
): string {
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
export function buildProjectMatchDocs(
  userId: string,
  jdProfileId: string,
  ranked: Array<{ project: UserProject; scoreTotal: number; scoreBreakdown: ProjectMatch['scoreBreakdown'] }>,
  topK: number,
  bulletMap: Record<string, string[]>,
  keywordMap: Record<string, string[]>,
  idGenerator: () => string,
): ProjectMatch[] {
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
export function buildMatchResult(
  jdProfileId: string,
  ranked: Array<{ project: UserProject; scoreTotal: number; scoreBreakdown: ProjectMatch['scoreBreakdown'] }>,
  topK: number,
  matchDocs: ProjectMatch[],
  keywordStrategy: KeywordStrategy,
  bulletMap: Record<string, string[]>,
): ProjectMatchResult {
  const selected = matchDocs
    .filter((m) => m.selected)
    .sort((a, b) => a.rank - b.rank);

  const projectMap = new Map(ranked.map((r) => [r.project.id, r.project]));

  return {
    jdProfileId,
    selectedProjects: selected.map((m) => ({
      rank: m.rank,
      project: projectMap.get(m.projectId)!,
      match: m,
    })),
    keywordStrategy,
    bulletSuggestions: bulletMap,
    explanation: buildExplanation(ranked, topK),
  };
}
