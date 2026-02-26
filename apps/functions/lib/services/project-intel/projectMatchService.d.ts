import type { UserProject, JdProfile, ProjectMatch, ProjectMatchResult, ProjectScoreWeights, KeywordStrategy } from '@applyqueue/shared';
/**
 * Prompt template for LLM-based bullet rewriting.
 * Generates ATS-friendly bullet points for selected projects
 * using only facts present in the original bullets.
 */
export declare function buildBulletRewritePrompt(project: UserProject, jdKeywords: string[]): string;
/**
 * Parse LLM bullet rewrite response into string array.
 */
export declare function parseBulletResponse(raw: string): string[];
/**
 * Run the full deterministic scoring pass, select top K projects,
 * and build the keyword strategy.
 *
 * Bullet generation is handled separately via LLM (caller orchestrates).
 */
export declare function runProjectScoring(projects: UserProject[], jd: JdProfile, topK?: number, weights?: ProjectScoreWeights): {
    ranked: Array<{
        project: UserProject;
        scoreTotal: number;
        scoreBreakdown: ProjectMatch['scoreBreakdown'];
    }>;
    selected: UserProject[];
    keywordStrategy: KeywordStrategy;
};
/**
 * Build explanation string describing why projects were chosen.
 */
export declare function buildExplanation(ranked: Array<{
    project: UserProject;
    scoreTotal: number;
    scoreBreakdown: ProjectMatch['scoreBreakdown'];
}>, topK: number): string;
/**
 * Assemble ProjectMatch Firestore documents from scoring results.
 */
export declare function buildProjectMatchDocs(userId: string, jdProfileId: string, ranked: Array<{
    project: UserProject;
    scoreTotal: number;
    scoreBreakdown: ProjectMatch['scoreBreakdown'];
}>, topK: number, bulletMap: Record<string, string[]>, keywordMap: Record<string, string[]>, idGenerator: () => string): ProjectMatch[];
/**
 * Assemble the final API response from all computed artifacts.
 */
export declare function buildMatchResult(jdProfileId: string, ranked: Array<{
    project: UserProject;
    scoreTotal: number;
    scoreBreakdown: ProjectMatch['scoreBreakdown'];
}>, topK: number, matchDocs: ProjectMatch[], keywordStrategy: KeywordStrategy, bulletMap: Record<string, string[]>): ProjectMatchResult;
