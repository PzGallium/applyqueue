/**
 * Assemble a UserProfile slice for resume refine from identity + explicit selections only (strict_empty).
 */
import type { Project, UserProfile, UserProject } from '@applyqueue/shared';
export interface IdentityForRefine {
    name: string;
    email: string;
    phone: string;
    headline: string;
    location: string;
}
export declare function normalizeIdentityEntry(raw: {
    name: string;
    email: string;
    phone: string;
    headline?: string;
    location?: string;
}): IdentityForRefine;
export declare function userProjectToResumeProject(p: UserProject): Project;
export interface RefineSelection {
    experienceIndices: number[];
    educationIndices: number[];
    skillIndices: number[];
}
/** Returns error message or null if valid. */
export declare function validateSelectionAgainstProfile(profile: UserProfile, selection: RefineSelection): string | null;
export declare function buildRefineProfile(fullProfile: UserProfile, identity: IdentityForRefine, selection: RefineSelection, projectsFromPool: UserProject[]): UserProfile;
