"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildJdParsePrompt = buildJdParsePrompt;
exports.parseJdLlmResponse = parseJdLlmResponse;
exports.buildJdProfile = buildJdProfile;
/**
 * Prompt template for LLM-based JD parsing.
 * Returns structured JSON that maps directly to JdProfile fields.
 */
function buildJdParsePrompt(rawText) {
    return `You are a job description analyzer. Parse the following JD and return ONLY valid JSON matching this schema — no markdown, no explanation.

{
  "parsedRequirements": {
    "hardSkills": ["string"],
    "softSkills": ["string"],
    "responsibilities": ["string"],
    "qualifications": ["string"]
  },
  "mustHaveKeywords": ["string"],
  "niceToHaveKeywords": ["string"],
  "seniority": "entry | mid | senior | staff",
  "roleType": "frontend | backend | fullstack | mobile | ml | data | devops | security | other"
}

Rules:
- mustHaveKeywords: technologies/skills explicitly required (e.g. "React", "Python", "AWS")
- niceToHaveKeywords: technologies/skills listed as "preferred", "bonus", or "nice to have"
- Keep keywords as single terms or short phrases, lowercase
- responsibilities: key job duties as short phrases
- qualifications: degree, years of experience, certifications

JD:
"""
${rawText}
"""`;
}
const VALID_ROLE_TAGS = [
    'frontend', 'backend', 'fullstack', 'mobile', 'ml', 'data', 'devops', 'security', 'other',
];
/**
 * Parse raw LLM response JSON into typed JdProfile fields.
 * Validates and sanitizes to prevent garbage data.
 */
function parseJdLlmResponse(raw) {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const toStrArr = (v) => Array.isArray(v) ? v.filter((s) => typeof s === 'string') : [];
    const pr = parsed.parsedRequirements ?? {};
    return {
        parsedRequirements: {
            hardSkills: toStrArr(pr.hardSkills),
            softSkills: toStrArr(pr.softSkills),
            responsibilities: toStrArr(pr.responsibilities),
            qualifications: toStrArr(pr.qualifications),
        },
        mustHaveKeywords: toStrArr(parsed.mustHaveKeywords).map((s) => s.toLowerCase()),
        niceToHaveKeywords: toStrArr(parsed.niceToHaveKeywords).map((s) => s.toLowerCase()),
        seniority: typeof parsed.seniority === 'string' ? parsed.seniority : 'entry',
        roleType: VALID_ROLE_TAGS.includes(parsed.roleType) ? parsed.roleType : 'other',
    };
}
/**
 * Assemble a complete JdProfile document from parsed LLM output.
 */
function buildJdProfile(id, userId, sourceUrl, rawText, llmOutput) {
    return {
        id,
        userId,
        sourceUrl,
        rawText,
        ...llmOutput,
        createdAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=jdProfileService.js.map