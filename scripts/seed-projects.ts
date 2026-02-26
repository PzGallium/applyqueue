/**
 * Seed data for Project Intelligence Layer demo.
 *
 * Usage: npx tsx scripts/seed-projects.ts
 * (or import the constants for unit tests / demos)
 */

import type { UserProject, JdProfile } from '@applyqueue/shared';

// ---------------------------------------------------------------------------
// Sample project pool (6 projects for a new-grad CS student)
// ---------------------------------------------------------------------------

export const SEED_PROJECTS: Omit<UserProject, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'Real-time Collaborative Code Editor',
    summary: 'Browser-based code editor with live multi-cursor collaboration using CRDTs and WebSocket.',
    domainTags: ['developer-tools', 'collaboration', 'real-time'],
    techTags: ['typescript', 'react', 'node.js', 'websocket', 'yjs', 'tailwindcss'],
    roleTags: ['fullstack'],
    difficultyLevel: 'advanced',
    impactMetrics: { users: 200, latencyMs: 30 },
    recencyScore: 95,
    proofLinks: ['https://github.com/user/collab-editor'],
    rawBullets: [
      'Implemented CRDT-based conflict resolution for concurrent edits across multiple users',
      'Built WebSocket relay server handling 200 concurrent sessions with 30ms sync latency',
      'Designed React component architecture with Monaco Editor integration and custom themes',
      'Deployed on AWS with Docker, achieving 99.5% uptime over 3 months',
    ],
  },
  {
    title: 'ML-powered Resume Parser',
    summary: 'NLP pipeline that extracts structured data from PDF resumes using spaCy and custom NER.',
    domainTags: ['nlp', 'machine-learning', 'document-processing'],
    techTags: ['python', 'spacy', 'fastapi', 'postgresql', 'docker'],
    roleTags: ['ml', 'backend'],
    difficultyLevel: 'advanced',
    impactMetrics: { dataScale: '50k resumes', latencyMs: 200 },
    recencyScore: 70,
    proofLinks: ['https://github.com/user/resume-parser'],
    rawBullets: [
      'Trained custom NER model on 50k annotated resumes achieving 94% F1 score',
      'Built FastAPI service processing 100 resumes/min with async pipeline',
      'Designed PostgreSQL schema for structured resume storage with full-text search',
      'Containerized with Docker and deployed to GCP Cloud Run',
    ],
  },
  {
    title: 'E-commerce Microservices Platform',
    summary: 'Distributed e-commerce backend with order management, inventory, and payment microservices.',
    domainTags: ['e-commerce', 'distributed-systems', 'payments'],
    techTags: ['java', 'spring boot', 'kafka', 'postgresql', 'redis', 'docker', 'kubernetes'],
    roleTags: ['backend'],
    difficultyLevel: 'advanced',
    impactMetrics: { qps: 5000, users: 10000 },
    recencyScore: 60,
    proofLinks: ['https://github.com/user/ecom-platform'],
    rawBullets: [
      'Designed event-driven architecture with Kafka handling 5k messages/sec',
      'Implemented saga pattern for distributed transactions across 4 microservices',
      'Built Redis-backed inventory cache reducing DB queries by 80%',
      'Deployed to Kubernetes cluster with auto-scaling and health checks',
    ],
  },
  {
    title: 'Personal Finance Dashboard',
    summary: 'React dashboard for tracking expenses, budgets, and investments with Plaid API integration.',
    domainTags: ['fintech', 'data-visualization', 'personal-finance'],
    techTags: ['typescript', 'react', 'next.js', 'd3.js', 'prisma', 'postgresql'],
    roleTags: ['fullstack', 'frontend'],
    difficultyLevel: 'intermediate',
    impactMetrics: { users: 50 },
    recencyScore: 85,
    proofLinks: ['https://github.com/user/finance-dash'],
    rawBullets: [
      'Built interactive D3.js charts for expense trends and budget tracking',
      'Integrated Plaid API for automatic bank transaction syncing',
      'Implemented server-side rendering with Next.js for SEO and performance',
      'Designed responsive UI with Tailwind CSS supporting mobile and desktop',
    ],
  },
  {
    title: 'Distributed Key-Value Store',
    summary: 'Raft consensus-based distributed KV store written in Go with CLI and HTTP interfaces.',
    domainTags: ['distributed-systems', 'databases', 'consensus'],
    techTags: ['go', 'raft', 'grpc', 'protobuf'],
    roleTags: ['backend'],
    difficultyLevel: 'advanced',
    impactMetrics: { qps: 20000, latencyMs: 5 },
    recencyScore: 40,
    proofLinks: ['https://github.com/user/kv-store'],
    rawBullets: [
      'Implemented Raft consensus algorithm with leader election and log replication',
      'Achieved 20k reads/sec and 5ms p99 latency on 3-node cluster',
      'Built gRPC API with Protobuf serialization for inter-node communication',
      'Wrote comprehensive test suite with chaos testing for network partition scenarios',
    ],
  },
  {
    title: 'CLI Task Manager',
    summary: 'Terminal-based task/todo manager with TUI, SQLite persistence, and Git-style branching.',
    domainTags: ['developer-tools', 'productivity'],
    techTags: ['rust', 'sqlite', 'tui'],
    roleTags: ['backend'],
    difficultyLevel: 'intermediate',
    impactMetrics: {},
    recencyScore: 30,
    proofLinks: ['https://github.com/user/task-cli'],
    rawBullets: [
      'Built terminal UI with Ratatui supporting keyboard navigation and themes',
      'Implemented SQLite-backed persistence with migration support',
      'Added Git-style branching for parallel task workflows',
    ],
  },
];

// ---------------------------------------------------------------------------
// Sample JD (Stripe New Grad SWE)
// ---------------------------------------------------------------------------

export const SEED_JD_RAW = `Software Engineer, New Grad — Stripe

About the role:
We're looking for new grad software engineers to join our Payments Infrastructure team.
You'll build and maintain the systems that process billions of dollars in payments.

What you'll do:
- Design and implement scalable backend services handling high-throughput payment flows
- Build real-time data pipelines and event-driven architectures
- Collaborate with product and design teams to ship user-facing features
- Write clean, well-tested TypeScript and Python code
- Participate in on-call rotations and incident response

What we look for:
- BS/MS in Computer Science or equivalent
- Strong fundamentals in data structures, algorithms, and system design
- Experience with TypeScript, Python, or similar languages
- Experience building web applications with React or similar frameworks
- Familiarity with distributed systems concepts

Nice to have:
- Experience with Node.js, PostgreSQL, or Redis
- Knowledge of event-driven architectures (Kafka, RabbitMQ)
- Experience with Docker and container orchestration
- Contributions to open-source projects`;

export const SEED_JD_PARSED: Omit<JdProfile, 'id' | 'userId' | 'createdAt'> = {
  sourceUrl: 'https://stripe.com/jobs/listing/swe-new-grad',
  rawText: SEED_JD_RAW,
  parsedRequirements: {
    hardSkills: ['typescript', 'python', 'react', 'data structures', 'algorithms', 'system design'],
    softSkills: ['collaboration', 'communication'],
    responsibilities: [
      'design scalable backend services',
      'build real-time data pipelines',
      'event-driven architectures',
      'ship user-facing features',
      'incident response',
    ],
    qualifications: ['BS/MS in Computer Science'],
  },
  mustHaveKeywords: ['typescript', 'python', 'react', 'distributed systems', 'system design'],
  niceToHaveKeywords: ['node.js', 'postgresql', 'redis', 'kafka', 'docker'],
  seniority: 'entry',
  roleType: 'fullstack',
};

// ---------------------------------------------------------------------------
// End-to-end demo: expected output
// ---------------------------------------------------------------------------

export const EXPECTED_DEMO_OUTPUT = {
  description: 'Running project-match against Stripe New Grad SWE JD with 6 projects, top_k=3',
  expectedTopK: 3,
  expectedRankOrder: [
    'Real-time Collaborative Code Editor',
    'E-commerce Microservices Platform',
    'Personal Finance Dashboard',
  ],
  reasoning: [
    'Code Editor: typescript + react + node.js + websocket hits must-haves; fullstack role match; high recency',
    'E-commerce: kafka + redis + postgresql + docker hit nice-to-haves; distributed systems + event-driven domain overlap',
    'Finance Dashboard: typescript + react + next.js + postgresql; fullstack role match; high recency',
  ],
  expectedKeywordStrategy: {
    mustInclude: ['typescript', 'react'],
    goodToInclude: ['node.js', 'redis', 'postgresql', 'docker', 'kafka'],
    currentlyMissing: ['python'],
  },
};
