export interface Education {
  school: string;
  degree: string;
  major: string;
  gpa: number | null;
  startDate: string;
  endDate: string;
}

export interface Experience {
  company: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string | null;
  highlights: string[];
}

export interface Project {
  name: string;
  description: string;
  url: string | null;
  highlights: string[];
}

export interface UserLinks {
  github: string | null;
  linkedin: string | null;
  portfolio: string | null;
  other: string[];
}

export interface UserProfile {
  headline: string;
  summary: string;
  location: string;
  education: Education[];
  experience: Experience[];
  skills: string[];
  projects: Project[];
  links: UserLinks;
}

export interface RankWeights {
  roleMatch: number;
  locationMatch: number;
  companyRating: number;
  salaryMatch: number;
  recency: number;
}

export interface UserPreferences {
  targetRoles: string[];
  targetLocations: string[];
  minSalary: number | null;
  companySize: ('startup' | 'mid' | 'large')[];
  industries: string[];
  excludeCompanies: string[];
  autoRankWeights: RankWeights;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  profile: UserProfile;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface EncryptedKey {
  encryptedKey: string;
  iv: string;
  tag: string;
  updatedAt: string;
}

export interface UserKeys {
  openai?: EncryptedKey;
  anthropic?: EncryptedKey;
  brave?: EncryptedKey;
  custom: Array<EncryptedKey & { provider: string }>;
}
