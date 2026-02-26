import { describe, it, expect } from 'vitest';
import { rankProjects, buildKeywordStrategy } from '../utils/project-score';
import type { UserProject, JdProfile } from '../types';

// Re-use seed data inline to keep tests self-contained (no cross-package import)

const seedProjects: UserProject[] = [
  {
    id: 'proj-1', userId: 'u1', title: 'Real-time Collaborative Code Editor',
    summary: 'Browser-based code editor with live collaboration',
    domainTags: ['developer-tools', 'collaboration', 'real-time'],
    techTags: ['typescript', 'react', 'node.js', 'websocket', 'yjs', 'tailwindcss'],
    roleTags: ['fullstack'], difficultyLevel: 'advanced',
    impactMetrics: { users: 200, latencyMs: 30 }, recencyScore: 95,
    proofLinks: [], rawBullets: ['Built WebSocket relay server'],
    createdAt: '', updatedAt: '',
  },
  {
    id: 'proj-2', userId: 'u1', title: 'ML-powered Resume Parser',
    summary: 'NLP pipeline for PDF resume extraction',
    domainTags: ['nlp', 'machine-learning'],
    techTags: ['python', 'spacy', 'fastapi', 'postgresql', 'docker'],
    roleTags: ['ml', 'backend'], difficultyLevel: 'advanced',
    impactMetrics: { dataScale: '50k' }, recencyScore: 70,
    proofLinks: [], rawBullets: ['Trained custom NER model'],
    createdAt: '', updatedAt: '',
  },
  {
    id: 'proj-3', userId: 'u1', title: 'E-commerce Microservices Platform',
    summary: 'Distributed e-commerce backend',
    domainTags: ['e-commerce', 'distributed-systems', 'payments'],
    techTags: ['java', 'spring boot', 'kafka', 'postgresql', 'redis', 'docker', 'kubernetes'],
    roleTags: ['backend'], difficultyLevel: 'advanced',
    impactMetrics: { qps: 5000, users: 10000 }, recencyScore: 60,
    proofLinks: [], rawBullets: ['Designed event-driven architecture'],
    createdAt: '', updatedAt: '',
  },
  {
    id: 'proj-4', userId: 'u1', title: 'Personal Finance Dashboard',
    summary: 'React dashboard for tracking expenses',
    domainTags: ['fintech', 'data-visualization'],
    techTags: ['typescript', 'react', 'next.js', 'd3.js', 'prisma', 'postgresql'],
    roleTags: ['fullstack', 'frontend'], difficultyLevel: 'intermediate',
    impactMetrics: { users: 50 }, recencyScore: 85,
    proofLinks: [], rawBullets: ['Built interactive D3.js charts'],
    createdAt: '', updatedAt: '',
  },
  {
    id: 'proj-5', userId: 'u1', title: 'Distributed Key-Value Store',
    summary: 'Raft consensus-based distributed KV store in Go',
    domainTags: ['distributed-systems', 'databases'],
    techTags: ['go', 'raft', 'grpc', 'protobuf'],
    roleTags: ['backend'], difficultyLevel: 'advanced',
    impactMetrics: { qps: 20000, latencyMs: 5 }, recencyScore: 40,
    proofLinks: [], rawBullets: ['Implemented Raft consensus'],
    createdAt: '', updatedAt: '',
  },
  {
    id: 'proj-6', userId: 'u1', title: 'CLI Task Manager',
    summary: 'Terminal-based task manager in Rust',
    domainTags: ['developer-tools', 'productivity'],
    techTags: ['rust', 'sqlite', 'tui'],
    roleTags: ['backend'], difficultyLevel: 'intermediate',
    impactMetrics: {}, recencyScore: 30,
    proofLinks: [], rawBullets: ['Built terminal UI'],
    createdAt: '', updatedAt: '',
  },
];

const stripeJd: JdProfile = {
  id: 'jd-stripe', userId: 'u1', sourceUrl: null,
  rawText: 'Stripe SWE New Grad',
  parsedRequirements: {
    hardSkills: ['typescript', 'python', 'react', 'system design'],
    softSkills: ['collaboration'],
    responsibilities: ['design scalable backend services', 'build real-time data pipelines', 'event-driven architectures'],
    qualifications: ['BS in CS'],
  },
  mustHaveKeywords: ['typescript', 'python', 'react', 'distributed systems', 'system design'],
  niceToHaveKeywords: ['node.js', 'postgresql', 'redis', 'kafka', 'docker'],
  seniority: 'entry',
  roleType: 'fullstack',
  createdAt: '',
};

describe('E2E: Project Intelligence against Stripe JD', () => {
  const ranked = rankProjects(seedProjects, stripeJd);

  it('ranks 6 projects', () => {
    expect(ranked).toHaveLength(6);
  });

  it('selects Code Editor as #1 (best tech + role + recency match)', () => {
    expect(ranked[0].projectId).toBe('proj-1');
  });

  it('top 3 all score above 30', () => {
    expect(ranked[0].scoreTotal).toBeGreaterThan(30);
    expect(ranked[1].scoreTotal).toBeGreaterThan(30);
    expect(ranked[2].scoreTotal).toBeGreaterThan(30);
  });

  it('Rust CLI project ranks last (no tech/role overlap)', () => {
    expect(ranked[ranked.length - 1].projectId).toBe('proj-6');
  });

  it('keyword strategy flags python as missing from top 3', () => {
    const top3 = ranked.slice(0, 3).map((r) => seedProjects.find((p) => p.id === r.projectId)!);
    const strategy = buildKeywordStrategy(top3, stripeJd);

    expect(strategy.mustInclude).toContain('typescript');
    expect(strategy.mustInclude).toContain('react');
    // python is a must-have keyword but no top-3 project has it
    // (unless E-commerce or Finance is in top 3 — neither has python)
    expect(strategy.currentlyMissing).toContain('python');
  });

  it('all scores have valid breakdowns', () => {
    for (const r of ranked) {
      expect(r.scoreBreakdown.techMatch).toBeGreaterThanOrEqual(0);
      expect(r.scoreBreakdown.techMatch).toBeLessThanOrEqual(100);
      expect(r.scoreBreakdown.roleMatch).toBeGreaterThanOrEqual(0);
      expect(r.scoreBreakdown.roleMatch).toBeLessThanOrEqual(100);
    }
  });
});
