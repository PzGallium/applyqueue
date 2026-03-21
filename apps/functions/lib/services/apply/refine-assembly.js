"use strict";
/**
 * Assemble a UserProfile slice for resume refine from identity + explicit selections only (strict_empty).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeIdentityEntry = normalizeIdentityEntry;
exports.userProjectToResumeProject = userProjectToResumeProject;
exports.validateSelectionAgainstProfile = validateSelectionAgainstProfile;
exports.buildRefineProfile = buildRefineProfile;
function normalizeIdentityEntry(raw) {
    return {
        name: raw.name,
        email: raw.email,
        phone: raw.phone,
        location: typeof raw.location === 'string' ? raw.location : '',
    };
}
function userProjectToResumeProject(p) {
    return {
        name: p.title,
        description: p.summary,
        url: p.proofLinks?.length ? p.proofLinks[0] : null,
        highlights: [...(p.rawBullets ?? [])],
    };
}
function uniqueSortedInts(indices) {
    return [...new Set(indices)].sort((a, b) => a - b);
}
/** Returns error message or null if valid. */
function validateSelectionAgainstProfile(profile, selection) {
    const expMax = profile.experience.length;
    for (const i of selection.experienceIndices) {
        if (i < 0 || i >= expMax)
            return `Invalid experience index: ${i}`;
    }
    const eduMax = profile.education.length;
    for (const i of selection.educationIndices) {
        if (i < 0 || i >= eduMax)
            return `Invalid education index: ${i}`;
    }
    const skillMax = profile.skills.length;
    for (const i of selection.skillIndices) {
        if (i < 0 || i >= skillMax)
            return `Invalid skill index: ${i}`;
    }
    return null;
}
function buildRefineProfile(fullProfile, identity, selection, projectsFromPool) {
    const expIdx = uniqueSortedInts(selection.experienceIndices);
    const experience = expIdx
        .map((i) => fullProfile.experience[i])
        .filter((e) => e != null);
    const eduIdx = uniqueSortedInts(selection.educationIndices);
    const education = eduIdx
        .map((i) => fullProfile.education[i])
        .filter((e) => e != null);
    const skillIdx = uniqueSortedInts(selection.skillIndices);
    const skills = skillIdx
        .map((i) => fullProfile.skills[i])
        .filter((s) => s != null);
    const projects = projectsFromPool.map(userProjectToResumeProject);
    return {
        headline: fullProfile.headline,
        summary: '',
        location: identity.location,
        education,
        experience,
        skills,
        projects,
        links: fullProfile.links,
        resumeStyleReference: fullProfile.resumeStyleReference,
    };
}
//# sourceMappingURL=refine-assembly.js.map