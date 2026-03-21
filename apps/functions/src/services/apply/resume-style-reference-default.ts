/**
 * Master resume text (structure / tone reference for LLM).
 * Source: user-provided PDF "Zijia Pan Resume" — do not invent facts; only match layout & phrasing style.
 */
export const RESUME_STYLE_REFERENCE_DEFAULT = `Zijia Pan
No Sponsorship needed | (use candidate contact from profile, not this line) | LinkedIn | GitHub
Education
Stevens Institute of Technology Sep 2024 - Dec 2026
Master of Science, Computer Science Hoboken, NJ
• GPA: 3.7
Experience
BalanX Bio Dec 2025 - Present
Software Engineer Intern
• Developed a health coaching app using React Native, an AGI platform synthesizing Apple Watch/wearable data and evolving personality vectors
through a multimodal ingress pipeline to provide hyper-personalized health coaching for 10,000+ daily users.
• Developed a Bio Feedback dashboard using TypeScript, integrating APIs by Node.js/Express, fetching vital signals (e.g. heart rate, stress level
and sleep quality) through HealthKit/Google Fit, ingesting into the asynchronous ingress pipeline for health interventions.
• Implemented Node.js middleware that accept multimodal inputs (text, audio transcripts, and health data), forward requests to the LLM service, and
parse AI-generated actions to trigger backend features such as quest creation and nutrition recommendations.
• Implemented an asynchronous emotion detection integration that periodically captures visual frames (every 3s) during video chat and sends them
to a backend inference endpoint, ensuring sentiment-aware AI responses without interrupting the main conversation loop.
• Integrated AWS S3 to manage profile photos by generating Presigned URLs, which secured the data by keeping the S3 bucket private.
• Built PostgreSQL schemas and query logic for conversation history and bio-feedback metrics, providing persistent behavioral signals that support
the evolving personality-vector memory system.
• Containerized the application stack using Docker Compose to manage PostgreSQL and Redis dependencies, providing a local development
environment that eliminated manual configuration for the team.
Nissi Travel Consulting Co., Ltd. May 2025 - Aug 2025
Software Engineer Intern
• Developed a pre-submission document audit module using Java/Spring Boot, enabling 500+ monthly applicants to track the real-time status of their
visa preparation, including missing document alerts and return reasons for resubmission; automated the document collection workflow, significantly
reducing manual follow-ups and improving audit efficiency before embassy submission.
• Engineered an automated document parsing engine using Python and OCR technology (Amazon Rekognition) to extract and validate critical data
from visa documents (I-20s, Passports, Bank Statements). Implemented automated logic to verify expiration dates and financial thresholds, reducing
manual audit time and eliminating human entry errors.
• Architected a high-performance data persistence layer using MongoDB to store highly variable document formats across different visa types and
languages extracted from OCR processes enabling rapid data retrieval and reducing backend query latency.
• Integrated AWS Simple Email Service (SES) to build an automated notification loop, triggering real-time email alerts based on OCR validation
results; automated the communication of document discrepancies and missing requirements, slashing manual follow-up time by 50%.
Projects
Distributed E-Commerce System Nov 2025 - Present
• Build online shopping distributed system in Java, handle Prime Day Sale event up to 10K QPS traffic
• Build RESTful APIs on Forum Post module, serve customer news feed operation, integrated with filtering, sorting and pagination functionality.
• Processing Online shopping CRUD operation on Spring Boot with MyBatis, use MySQL as persistent storage.
• Implement distributed UUID Generator service with SnowFlake, provide sequence Unique ID for distributed persistent storage
• Improve Product Search experience via Inverted Index search(ElasticSearch), speed up 90% for search experience.
• Implemented an Event-driven architecture using RocketMQ for a decoupled and asynchronous transaction management
• Utilized Distributed Lock with Redis and Lua script, implement the caching inventory Lock and Revert of Try-Confirm-Cancel pattern,
completely prevented overselling for sale events
• Configured microservices with Spring Cloud Gateway, Consul, and OpenFeign, deployed application, integrated with Load Balancer and AWS
AutoScaling group on multiple EC2 instances, made service open to public with high availability.
• Utilized AWS CDK with TypeScript to construct service infrastructure via CloudFormation, implementing infrastructures as code; streamlined
CI/CD pipelines, automating builds, testing, and deployments between different stages, accelerating rollouts efficiency by 60%.
Custom RPC Framework Jan 2025 - Oct 2025
• Designed and implemented a lightweight Java RPC framework using Spring + Netty, enabling transparent remote method invocation across
distributed services.
• Built a Netty-based TCP communication layer with custom protocol framing and request/response correlation, supporting persistent connections
and asynchronous I/O.
• Implemented annotation-driven service registration with CGLIB dynamic proxies to translate local interface calls into remote invocations.
• Integrated ZooKeeper (Curator) for service registration and discovery using ephemeral nodes and watchers, enabling dynamic instance scaling and
simulated failover handling.
• Developed a custom Future + timeout mechanism to bridge asynchronous network calls into synchronous-style APIs while preserving timeout
control and fault isolation.
Technical Skills
• Backend: FastAPI, Spring Boot, Node.js, REST APIs, Microservices, Express, MVC, JPA, MyBatis, Netty
• Cloud & DevOps: AWS, Kubernetes, Docker, CI/CD, GitHub, Postman, Junit, AWS SES, AWS CDK, CloudFormation, S3, ECS, Lambda
• Databases: PostgreSQL, MySQL, SQLite, MongoDB, DynamoDB
• Frontend: React Native, React, React Navigation, Angular, Zustand / Redux, React Query
• Tools: NumPy, Pandas, PyTorch, Scikit-learn, Jupyter, Matplotlib
• Languages: Java, Python, Go, SQL, TypeScript, C, C++, C#, Swift, Kotlin, MATLAB, Lua
• Distributed Systems: Redis, Kafka, ZooKeeper, Elasticsearch, Spark, Hadoop, RocketMQ, Snowflake`;

const MAX_REF_CHARS = 14_000;

export function resolveResumeStyleReference(profileField?: string | null): string {
  const fromProfile = profileField?.trim();
  if (fromProfile) return fromProfile.slice(0, MAX_REF_CHARS);
  const fromEnv = process.env.REFERENCE_RESUME_TEXT?.trim();
  if (fromEnv) return fromEnv.slice(0, MAX_REF_CHARS);
  return RESUME_STYLE_REFERENCE_DEFAULT.slice(0, MAX_REF_CHARS);
}
