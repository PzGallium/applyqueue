import type { ApplicationStatus } from '../types/application';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'saved',
  'applied',
  'oa',
  'interview',
  'offer',
  'rejected',
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  oa: 'Online Assessment',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  saved: '#6B7280',
  applied: '#3B82F6',
  oa: '#F59E0B',
  interview: '#8B5CF6',
  offer: '#10B981',
  rejected: '#EF4444',
};

export const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  saved: ['applied', 'rejected'],
  applied: ['oa', 'interview', 'offer', 'rejected'],
  oa: ['interview', 'offer', 'rejected'],
  interview: ['offer', 'rejected'],
  offer: [],
  rejected: [],
};
