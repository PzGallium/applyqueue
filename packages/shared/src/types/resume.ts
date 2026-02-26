export interface ResumeExperienceItem {
  company: string;
  title: string;
  date: string;
  bullets: string[];
}

export interface ResumeEducationItem {
  school: string;
  degree: string;
  major: string;
  date: string;
  gpa: string | null;
}

export interface ResumeProjectItem {
  name: string;
  description: string;
  url: string | null;
  highlights: string[];
}

export interface ResumeContent {
  headline: string;
  summary: string;
  experience: ResumeExperienceItem[];
  education: ResumeEducationItem[];
  skills: string[];
  projects: ResumeProjectItem[];
}

export interface ResumeChange {
  section: string;
  field: string;
  original: string;
  tailored: string;
  reason: string;
}

export interface Resume {
  id: string;
  userId: string;
  jobId: string;
  applicationId: string | null;
  templateId: string;
  content: ResumeContent;
  changeSummary: string;
  changes: ResumeChange[];
  jdKeywords: string[];
  atsScore: number | null;
  llmModel: string;
  llmTokensUsed: number;
  generatedAt: string;
  createdAt: string;
}

export interface ParsedJD {
  requirements: string[];
  niceToHaves: string[];
  keywords: string[];
  responsibilities: string[];
  teamInfo: string;
  level: string;
}
