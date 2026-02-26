import { describe, it, expect } from 'vitest';
import {
  scoreProject,
  rankProjects,
  buildKeywordStrategy,
} from '../utils/project-score';
import type { UserProject, JdProfile } from '../types';
import { DEFAULT_PROJECT_SCORE_WEIGHTS } from '../types/project-intel';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeProject(overrides: Partial<UserProject> = {}): UserProject {
  return {
    id: 'proj-1',
    userId: 'user-1',
    title: 'Real-time Chat Platform',
    summary: 'WebSocket-based chat with Redis pub/sub',
    domainTags: ['messaging', 'real-time'],
    techTags: ['typescript', 'react', 'node.js', 'redis', 'websocket'],
    roleTags: ['fullstack'],
    difficultyLevel: 'intermediate',
    impactMetrics: { users: 5000, latencyMs: 50 },
    recencyScore: 80,
    proofLinks: ['https://github.com/user/chat'],
    rawBullets: [
      'Built real-time messaging system handling 5k concurrent users',
      'Reduced message latency to 50ms using Redis pub/sub',
    ],
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2025-12-01T00:00:00Z',
    ...overrides,
  };
}

function makeJd(overrides: Partial<JdProfile> = {}): JdProfile {
  return {
    id: 'jd-1',
    userId: 'user-1',
    sourceUrl: null,
    rawText: 'Software Engineer role...',
    parsedRequirements: {
      hardSkills: ['typescript', 'react', 'node.js'],
      softSkills: ['collaboration'],
      responsibilities: ['build scalable backend services', 'messaging systems'],
      qualifications: ['BS in CS'],
    },
    mustHaveKeywords: ['typescript', 'react', 'node.js'],
    niceToHaveKeywords: ['redis', 'docker', 'kubernetes'],
    seniority: 'entry',
    roleType: 'fullstack',
    createdAt: '2026-01-15T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('scoreProject', () => {
  it('scores a well-matching project highly', () => {
    const result = scoreProject(makeProject(), makeJd());
    expect(result.scoreTotal).toBeGreaterThanOrEqual(60);
    expect(result.scoreTotal).toBeLessThanOrEqual(100);
    expect(result.scoreBreakdown.techMatch).toBeGreaterThan(0);
    expect(result.scoreBreakdown.roleMatch).toBe(100);
  });

  it('scores a non-matching project low', () => {
    const proj = makeProject({
      id: 'proj-bad',
      techTags: ['java', 'spring', 'oracle'],
      roleTags: ['backend'],
      domainTags: ['enterprise', 'banking'],
      impactMetrics: {},
      recencyScore: 10,
    });
    const result = scoreProject(proj, makeJd());
    expect(result.scoreTotal).toBeLessThan(30);
  });

  it('gives full role score when role matches exactly', () => {
    const result = scoreProject(
      makeProject({ roleTags: ['fullstack'] }),
      makeJd({ roleType: 'fullstack' }),
    );
    expect(result.scoreBreakdown.roleMatch).toBe(100);
  });

  it('gives zero role score when role does not match', () => {
    const result = scoreProject(
      makeProject({ roleTags: ['ml'] }),
      makeJd({ roleType: 'frontend' }),
    );
    expect(result.scoreBreakdown.roleMatch).toBe(0);
  });

  it('impact score increases with more metrics', () => {
    const noMetrics = scoreProject(
      makeProject({ impactMetrics: {} }),
      makeJd(),
    );
    const twoMetrics = scoreProject(
      makeProject({ impactMetrics: { users: 1000, latencyMs: 50 } }),
      makeJd(),
    );
    expect(twoMetrics.scoreBreakdown.impactEvidence).toBeGreaterThan(
      noMetrics.scoreBreakdown.impactEvidence,
    );
  });

  it('respects recencyScore from project', () => {
    const recent = scoreProject(makeProject({ recencyScore: 100 }), makeJd());
    const old = scoreProject(makeProject({ recencyScore: 10 }), makeJd());
    expect(recent.scoreBreakdown.recency).toBeGreaterThan(old.scoreBreakdown.recency);
  });

  it('normalizes score to 0-100', () => {
    const result = scoreProject(makeProject(), makeJd());
    expect(result.scoreTotal).toBeGreaterThanOrEqual(0);
    expect(result.scoreTotal).toBeLessThanOrEqual(100);
  });

  it('uses custom weights when provided', () => {
    const techOnlyWeights = {
      techMatch: 1.0,
      roleMatch: 0,
      domainMatch: 0,
      impactEvidence: 0,
      recency: 0,
    };
    const result = scoreProject(makeProject(), makeJd(), techOnlyWeights);
    expect(result.scoreTotal).toBe(result.scoreBreakdown.techMatch);
  });
});

describe('rankProjects', () => {
  it('returns projects sorted by score descending', () => {
    const goodMatch = makeProject({ id: 'good' });
    const badMatch = makeProject({
      id: 'bad',
      techTags: ['cobol'],
      roleTags: ['other'],
      domainTags: [],
      impactMetrics: {},
      recencyScore: 5,
    });
    const results = rankProjects([badMatch, goodMatch], makeJd());
    expect(results[0].projectId).toBe('good');
    expect(results[1].projectId).toBe('bad');
    expect(results[0].scoreTotal).toBeGreaterThan(results[1].scoreTotal);
  });

  it('handles empty project list', () => {
    expect(rankProjects([], makeJd())).toEqual([]);
  });

  it('handles single project', () => {
    const results = rankProjects([makeProject()], makeJd());
    expect(results).toHaveLength(1);
  });
});

describe('buildKeywordStrategy', () => {
  it('correctly categorizes must-include keywords', () => {
    const proj = makeProject();
    const jd = makeJd();
    const strategy = buildKeywordStrategy([proj], jd);

    // Project has typescript, react, node.js which are must-have
    expect(strategy.mustInclude).toContain('typescript');
    expect(strategy.mustInclude).toContain('react');
    expect(strategy.mustInclude).toContain('node.js');
  });

  it('identifies good-to-include from nice-to-haves', () => {
    const proj = makeProject({ techTags: ['typescript', 'react', 'redis'] });
    const jd = makeJd({
      mustHaveKeywords: ['typescript', 'react'],
      niceToHaveKeywords: ['redis', 'graphql'],
    });
    const strategy = buildKeywordStrategy([proj], jd);

    expect(strategy.goodToInclude).toContain('redis');
  });

  it('identifies currently missing keywords', () => {
    const proj = makeProject({ techTags: ['typescript'] });
    const jd = makeJd({
      mustHaveKeywords: ['typescript', 'react', 'go'],
      niceToHaveKeywords: [],
    });
    const strategy = buildKeywordStrategy([proj], jd);

    expect(strategy.currentlyMissing).toContain('go');
  });

  it('handles no projects', () => {
    const strategy = buildKeywordStrategy([], makeJd());
    expect(strategy.mustInclude).toEqual([]);
    expect(strategy.currentlyMissing.length).toBeGreaterThan(0);
  });
});

describe('DEFAULT_PROJECT_SCORE_WEIGHTS', () => {
  it('sums to 1.0', () => {
    const w = DEFAULT_PROJECT_SCORE_WEIGHTS;
    const sum = w.techMatch + w.roleMatch + w.domainMatch + w.impactEvidence + w.recency;
    expect(sum).toBeCloseTo(1.0);
  });

  it('tech match has the highest weight', () => {
    const w = DEFAULT_PROJECT_SCORE_WEIGHTS;
    expect(w.techMatch).toBeGreaterThan(w.roleMatch);
    expect(w.techMatch).toBeGreaterThan(w.domainMatch);
    expect(w.techMatch).toBeGreaterThan(w.impactEvidence);
    expect(w.techMatch).toBeGreaterThan(w.recency);
  });
});
