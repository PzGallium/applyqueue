"use strict";
/**
 * Apply MVP — generate tailored Resume JSON from user profile + JD via LLM.
 * Output is validated with Zod; do not fabricate experience/companies/dates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildResumePrompt = buildResumePrompt;
exports.generateResumeContent = generateResumeContent;
const types_1 = require("./types");
const resume_style_reference_default_1 = require("./resume-style-reference-default");
const RESUME_JSON_INSTRUCTION = `You must respond with a single JSON object only, no markdown or code fences.
The JSON must match this exact structure (all fields required unless noted):
{
  "headline": "string",
  "summary": "",
  "experience": [{"company":"","title":"","date":"","bullets":[]}],
  "education": [{"school":"","degree":"","major":"","date":"","gpa":null or "string"}],
  "skills": ["string"],
  "projects": [{"name":"","description":"","url":null or "","highlights":[]}]
}
Rules: Use ONLY the candidate's real companies, titles, and dates. Do not invent any experience or education.
The "summary" field MUST be exactly an empty string "" — do not write a personal summary.
You may reword bullets to emphasize JD-relevant skills. Keep dates and company/title names unchanged.`;
function buildResumePrompt(profile, jdText) {
    const styleRef = (0, resume_style_reference_default_1.resolveResumeStyleReference)(profile.resumeStyleReference ?? null);
    const profileBlob = JSON.stringify({
        headline: profile.headline,
        location: profile.location,
        education: profile.education.map((e) => ({
            school: e.school,
            degree: e.degree,
            major: e.major,
            startDate: e.startDate,
            endDate: e.endDate,
            gpa: e.gpa,
        })),
        experience: profile.experience.map((e) => ({
            company: e.company,
            title: e.title,
            startDate: e.startDate,
            endDate: e.endDate,
            description: e.description,
            highlights: e.highlights,
        })),
        skills: profile.skills,
        projects: profile.projects.map((p) => ({
            name: p.name,
            description: p.description,
            url: p.url,
            highlights: p.highlights,
        })),
    });
    return `${RESUME_JSON_INSTRUCTION}

Style reference resume (match section flow, bullet style, and tone; all factual content MUST come from the candidate profile below — do not copy employers, dates, or contact details from the reference):
${styleRef}

Candidate profile (use only this data, do not invent):
${profileBlob}

Job description:
${jdText.slice(0, 12000)}

Output the tailored resume as a single JSON object:`;
}
/**
 * Extract JSON from LLM text (strip markdown code block if present).
 */
function extractJson(text) {
    const trimmed = text.trim();
    const codeBlock = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
    if (codeBlock)
        return codeBlock[1].trim();
    return trimmed;
}
/**
 * Generate resume content via LLM and validate. Throws on LLM or validation failure.
 */
async function generateResumeContent(llm, profile, jdText, model) {
    const prompt = buildResumePrompt(profile, jdText);
    const response = await llm.complete(prompt, model);
    const raw = extractJson(response.text);
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        throw new Error('LLM response is not valid JSON');
    }
    const result = types_1.resumeContentSchema.safeParse(parsed);
    if (!result.success) {
        throw new Error(`Resume schema validation failed: ${result.error.message}`);
    }
    return { ...result.data, summary: '' };
}
//# sourceMappingURL=resume-generator.js.map