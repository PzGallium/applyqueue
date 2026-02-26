/**
 * Apply MVP — generate tailored Resume JSON from user profile + JD via LLM.
 * Output is validated with Zod; do not fabricate experience/companies/dates.
 */
import type { UserProfile } from '@applyqueue/shared';
import type { LlmClient } from '../../utils/llm';
import { type ResumeContent } from './types';
export declare function buildResumePrompt(profile: UserProfile, jdText: string): string;
/**
 * Generate resume content via LLM and validate. Throws on LLM or validation failure.
 */
export declare function generateResumeContent(llm: LlmClient, profile: UserProfile, jdText: string, model?: string): Promise<ResumeContent>;
