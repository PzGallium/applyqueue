/**
 * Assemble a UserProfile slice for resume refine from identity + explicit selections only (strict_empty).
 */

import type { Education, Experience, Project, UserProfile, UserProject } from '@applyqueue/shared';

export interface IdentityForRefine {
  name: string;
  email: string;
  phone: string;
  location: string;
}

export function normalizeIdentityEntry(raw: {
  name: string;
  email: string;
  phone: string;
  location?: string;
}): IdentityForRefine {
  return {
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    location: typeof raw.location === 'string' ? raw.location : '',
  };
}

export function userProjectToResumeProject(p: UserProject): Project {
  return {
    name: p.title,
    description: p.summary,
    url: p.proofLinks?.length ? p.proofLinks[0]! : null,
    highlights: [...(p.rawBullets ?? [])],
  };
}

export interface RefineSelection {
  experienceIndices: number[];
  educationIndices: number[];
  skillIndices: number[];
}

function uniqueSortedInts(indices: number[]): number[] {
  return [...new Set(indices)].sort((a, b) => a - b);
}

/** Returns error message or null if valid. */
export function validateSelectionAgainstProfile(
  profile: UserProfile,
  selection: RefineSelection,
): string | null {
  const expMax = profile.experience.length;
  for (const i of selection.experienceIndices) {
    if (i < 0 || i >= expMax) return `Invalid experience index: ${i}`;
  }
  const eduMax = profile.education.length;
  for (const i of selection.educationIndices) {
    if (i < 0 || i >= eduMax) return `Invalid education index: ${i}`;
  }
  const skillMax = profile.skills.length;
  for (const i of selection.skillIndices) {
    if (i < 0 || i >= skillMax) return `Invalid skill index: ${i}`;
  }
  return null;
}

export function buildRefineProfile(
  fullProfile: UserProfile,
  identity: IdentityForRefine,
  selection: RefineSelection,
  projectsFromPool: UserProject[],
): UserProfile {
  const expIdx = uniqueSortedInts(selection.experienceIndices);
  const experience: Experience[] = expIdx
    .map((i) => fullProfile.experience[i])
    .filter((e): e is Experience => e != null);

  const eduIdx = uniqueSortedInts(selection.educationIndices);
  const education: Education[] = eduIdx
    .map((i) => fullProfile.education[i])
    .filter((e): e is Education => e != null);

  const skillIdx = uniqueSortedInts(selection.skillIndices);
  const skills: string[] = skillIdx
    .map((i) => fullProfile.skills[i])
    .filter((s): s is string => s != null);

  const projects: Project[] = projectsFromPool.map(userProjectToResumeProject);

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
