import type { JdProfile, JdParsedRequirements, RoleTag } from '@applyqueue/shared';
/**
 * Prompt template for LLM-based JD parsing.
 * Returns structured JSON that maps directly to JdProfile fields.
 */
export declare function buildJdParsePrompt(rawText: string): string;
/**
 * Parse raw LLM response JSON into typed JdProfile fields.
 * Validates and sanitizes to prevent garbage data.
 */
export declare function parseJdLlmResponse(raw: string): {
    parsedRequirements: JdParsedRequirements;
    mustHaveKeywords: string[];
    niceToHaveKeywords: string[];
    seniority: string;
    roleType: RoleTag;
};
/**
 * Assemble a complete JdProfile document from parsed LLM output.
 */
export declare function buildJdProfile(id: string, userId: string, sourceUrl: string | null, rawText: string, llmOutput: ReturnType<typeof parseJdLlmResponse>): JdProfile;
