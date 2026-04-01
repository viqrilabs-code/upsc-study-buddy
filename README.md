# UPSC Study Buddy

An AI-powered multi-agent study companion for UPSC aspirants. The system is designed to behave like a real study buddy: it teaches, quizzes, evaluates, tracks progress, and nudges the learner toward steady improvement across Prelims, Mains, Essay, CSAT, and optional subjects.

This document defines the product design, technical architecture, data boundaries, and proposed repository structure for the project.

## Vision

Build a personalized UPSC preparation platform where each aspirant gets:

- Content-based study support by subject and topic.
- Daily current affairs analysis from the platform-stored copy of today's The Indian Express, including concise notes and 10 MCQs in a downloadable PDF.
- Subject-wise notes generation with important keywords, revision-ready content, and probable Mains questions.
- Topic-wise, paper-wise, and year-wise PYQ practice and pattern analysis.
- Mains question practice with evaluation aligned to UPSC standards from the last 10 years.
- Prelims practice aligned to UPSC question patterns from the last 10 years.
- Daily discipline flows including daily quizzes, daily answer-writing tasks, and revision reminders.
- One weekly Mains test and one weekly Prelims test per chosen subject.
- Subject-specific custom modes selected during signup.
- Hindi and English support for UI, content, and answer evaluation.
- CSAT, Essay, Interview, and optional-subject coverage as dedicated tracks.
- Handwritten answer upload with OCR-based text extraction and evaluation.
- A personal workspace with saved notes, bookmarks, archives, and downloadable resources.
- Benchmarking through percentiles, rank bands, and peer-comparison style analytics.
- Community-based accountability through study circles, streaks, and shared targets.
- Mobile-friendly and offline-friendly learning access.
- A strength and weakness dashboard driven by test and practice performance.

## Product Goals

- Mimic a disciplined human study buddy, not just a chatbot.
- Keep guidance personalized by subject, level, and recent performance.
- Make evaluation strict, explainable, and UPSC-oriented.
- Make PYQs, curated content, and benchmarked scores central to trust-building.
- Support bilingual UPSC preparation without reducing evaluation quality.
- Drive consistent daily study habits through revision loops and streak systems.
- Give users a durable personal workspace, not just one-time generated answers.
- Minimize infrastructure cost on GCP by using serverless components.
- Support mobile-first access and offline revision for low-friction usage.
- Stay compliant with content licensing for newspapers and curated source material.
- Persist only user data and reports, not generated tests or user-uploaded documents.

## Core User Flows

### 1. Signup and Personalization

- User signs up and selects subjects.
- User chooses preferred study modes during onboarding.
- User selects preferred language medium such as English or Hindi.
- User selects exam tracks such as GS, CSAT, Essay, Interview, and optional subject support.
- System creates a subject profile for each selected subject.
- A personalized weekly plan and dashboard baseline is generated.

### 2. Content-Based Study

- User selects a subject and topic.
- Subject agent explains concepts, provides structured notes, and suggests revision tasks.
- Study content can reference curated source packs such as NCERTs, standard books, PYQs, and internal revision sheets.
- Study sessions can adapt based on weak areas from previous performance.

### 3. Daily Current Affairs Analysis

- System reads the platform-stored copy of today's The Indian Express.
- Current affairs agent extracts UPSC-relevant themes, facts, editorials, policies, and issue linkages.
- It generates concise notes, 10 MCQs, and a downloadable PDF for the day.
- Topics can be tagged to GS papers, essay themes, and related subjects.

### 4. Subject-Wise Notes Making

- User selects a subject, topic, or syllabus area.
- Notes agent produces structured notes with important keywords, revision bullets, and probable Mains questions.
- Notes can be generated in short revision mode or full concept mode.
- Exportable notes are treated as report artifacts and can be saved in the personal workspace.

### 5. PYQ Practice and Pattern Analysis

- User can browse previous year questions by year, paper, subject, topic, and exam stage.
- PYQ agent maps patterns from the last 10 years and recommends related practice questions.
- Performance on PYQs is tracked separately from synthetic practice for stronger benchmarking.

### 6. Mains Practice

- User requests a question by subject, paper, topic, or difficulty.
- Mains agent generates a UPSC-style prompt.
- User submits an answer.
- Evaluation agent scores the answer using a rubric grounded in the last 10 years of UPSC Mains expectations.
- Users can submit typed or handwritten answers.
- Only the scorecard, feedback, and report are persisted.

### 7. Prelims Practice

- User starts a topic-wise or mixed MCQ practice set.
- Prelims agent generates UPSC-pattern questions and answer explanations.
- Evaluation logic measures accuracy, elimination ability, trap detection, and topic consistency.
- Only performance summary and report are persisted.

### 8. Daily Discipline and Revision

- System issues a daily plan containing current affairs, a short quiz, a Mains prompt, and revision tasks.
- Revision engine resurfaces weak topics, wrong questions, and stale notes through spaced revision rules.
- Streaks, completion rates, and pending revision debt are tracked to encourage consistency.

### 9. Weekly Tests

- Each selected subject gets one weekly Mains test and one weekly Prelims test.
- Scheduler creates weekly test assignments.
- Test content is generated on demand when the user starts the test.
- After submission, the system stores only the result metadata and report, not the test paper itself.

### 10. Workspace and Community Accountability

- Users can save notes, bookmark reports, archive current affairs PDFs, and revisit revision packs.
- Study circles can share goals, streaks, and completion visibility without requiring mentor intervention.
- Community features are designed for accountability, not noisy social feeds.

### 11. Analytics and Dashboard

- Dashboard shows strengths, weaknesses, trend lines, subject-wise consistency, percentiles, and recommended focus areas.
- Recommendations are recalculated from weekly tests, PYQs, Mains practice, Prelims practice, and revision history.

## Design Principles

- Strict UPSC alignment over generic AI tutoring.
- PYQ-first preparation before purely synthetic generation.
- Retrieval-grounded evaluation over free-form scoring.
- Multi-agent backend with a single, simple user experience.
- Daily habit loops and revision scheduling over one-time sessions.
- Bilingual by design across content, practice, and reports.
- Workspace, archives, and benchmarking as core product layers.
- Mobile-first and offline-friendly access for revision-heavy usage.
- Compliance-first handling of newspapers and curated source material.
- Low-cost, scale-to-zero deployment on GCP.
- Privacy-first storage policy with minimal retention.
- Subject customization as a first-class feature, not an add-on.

## Multi-Agent System Design

The platform should use a central orchestrator and a small set of focused agents instead of one monolithic assistant.

### Recommended Agents

#### 1. Orchestrator Agent

- Entry point for all user actions.
- Understands intent and routes work to the correct specialist agent.
- Maintains lightweight session context.

#### 2. Subject Buddy Agent

- Acts like the day-to-day study buddy.
- Explains topics, creates study plans, revises concepts, and recommends next steps.
- Adapts tone and prompts based on the subject selected at signup.

#### 3. Current Affairs Agent

- Reads the platform-managed daily newspaper input.
- Extracts UPSC-relevant developments and maps them to GS papers, essay themes, and subjects.
- Produces daily notes and a 10-MCQ current affairs set.

#### 4. Notes Agent

- Generates subject-wise notes by topic or syllabus segment.
- Highlights keywords, revision content, and probable Mains questions.
- Supports short notes, revision sheets, and fuller concept notes.

#### 5. PYQ Agent

- Indexes previous year questions by year, paper, subject, and topic.
- Detects recurring themes and pattern shifts across years.
- Recommends PYQ-led practice journeys and related generated questions.

#### 6. Revision Agent

- Maintains daily revision queues based on weak areas, wrong answers, and note recency.
- Generates daily quizzes, retry sets, and revision reminders.
- Tracks revision debt, streaks, and recovery plans.

#### 7. Mains Practice Agent

- Generates UPSC-style Mains questions by subject, topic, and paper.
- Adds answer framing hints when allowed by the mode.
- Prepares submissions for evaluation.

#### 8. Mains Evaluation Agent

- Scores answers using structured rubrics inspired by the last 10 years of UPSC Mains expectations.
- Evaluates relevance, structure, balance, examples, argument quality, and conclusion quality.
- Produces detailed feedback plus an improvement plan.

#### 9. Prelims Practice Agent

- Generates MCQs aligned to UPSC patterns.
- Supports topic-wise practice, mixed practice, and revision drills.
- Explains correct answers and common traps.

#### 10. Prelims Evaluation Agent

- Scores accuracy and consistency.
- Detects weak themes, conceptual gaps, and risky guessing behavior.
- Produces a concise performance report.

#### 11. Answer Processing Agent

- Accepts handwritten answer uploads.
- Runs OCR or vision-based extraction to prepare text for evaluation.
- Returns annotations and extraction confidence for review.

#### 12. Weekly Test Agent

- Creates weekly subject-level test assignments.
- Coordinates on-demand paper generation and submission windows.
- Sends results to analytics after evaluation.

#### 13. Analytics and Benchmarking Agent

- Builds strength and weakness profiles.
- Tracks improvement trends across subjects and formats.
- Produces dashboard summaries, percentile views, rank bands, and personalized recommendations.

#### 14. Workspace Agent

- Manages saved notes, bookmarks, archives, folders, and downloadable resources.
- Supports search, filtering, and quick retrieval across subjects and dates.

#### 15. Accountability Agent

- Powers study circles, streaks, target tracking, and lightweight peer accountability.
- Surfaces group progress summaries without introducing mentor dependencies.

#### 16. Report Agent

- Converts evaluation output into user-friendly reports.
- Generates downloadable PDF artifacts for daily current affairs, notes, and evaluation reports.

## How the Agents Work Together

```text
User
  ->
Web App
  ->
API Gateway
  ->
Orchestrator Agent
  -> Subject Buddy Agent
  -> Current Affairs Agent
  -> Notes Agent
  -> PYQ Agent
  -> Revision Agent
  -> Answer Processing Agent
  -> Mains Practice Agent -> Mains Evaluation Agent
  -> Prelims Practice Agent -> Prelims Evaluation Agent
  -> Weekly Test Agent
  -> Analytics and Benchmarking Agent
  -> Workspace Agent
  -> Accountability Agent
  -> Report Agent
  ->
Firestore / Cloud Storage / Scheduler / Tasks
```

## UPSC Evaluation Strategy

The system should not evaluate answers using generic LLM opinion alone. It should be grounded in a curated UPSC benchmark pack built from the last 10 years of patterns, question framing, and expected answer characteristics.

### Mains Evaluation Dimensions

- Relevance to the demand of the question.
- Structure and answer flow.
- Breadth and depth balance.
- Use of examples, facts, committees, judgments, and current context.
- Analytical quality instead of descriptive filler.
- Conclusion quality and answer completeness.
- Time-discipline approximation based on answer length and structure.

### Prelims Evaluation Dimensions

- Concept accuracy.
- Pattern similarity to UPSC-style traps.
- Elimination quality.
- Topic retention and confusion frequency.
- Confidence vs correctness behavior.

### Strictness Model

- Rubrics should be versioned and reviewable.
- Scores should come from structured dimensions before summary feedback is generated.
- The evaluator should return evidence-backed feedback, not vague praise.
- Reports should highlight what to fix next, not only what went wrong.

## Personalization Model

Customization begins during signup and drives prompt selection, study flow, and evaluation style.

### User Profile Inputs

- Exam stage preference: Prelims, Mains, or both.
- Track selection: GS, CSAT, Essay, Interview, and optional subjects.
- Selected subjects.
- Optional subject if applicable.
- Preferred study intensity.
- Language or answer style preferences.
- Daily schedule preference and revision cadence.
- Community participation preference for study circles and streak visibility.
- Weakness self-assessment during onboarding.

### Subject Modes

Each selected subject should map to a dedicated prompt pack containing:

- Tone and framing instructions.
- Subject-specific answer expectations.
- Question-generation rules.
- Evaluation heuristics.
- Recommended sources and revision styles.

Examples:

- Polity mode emphasizes constitutional grounding, judgments, governance relevance, and answer structure.
- History mode emphasizes chronology, causation, historiography, and linkage across periods.
- Geography mode emphasizes maps, locations, diagrams, processes, and interlinkages.
- Economy mode emphasizes concepts, examples, budget and survey language, and practical application.

### Language Support

- The system should support English and Hindi from onboarding through dashboard usage.
- Notes, explanations, quizzes, and reports should preserve medium-specific style and terminology.
- Evaluation should recognize that answer quality can remain strong even when the language medium changes.

## Content and Notes Generation

### Daily Current Affairs Pipeline

- The system reads the platform-stored or licensed copy of today's The Indian Express.
- Relevant articles are mapped to GS papers, subjects, and exam themes.
- Current affairs notes are created in concise UPSC-friendly language.
- The system generates 10 MCQs with explanations for the day's coverage.
- Report agent renders the daily digest as a downloadable PDF.

### Subject-Wise Notes Pipeline

- User requests notes by subject, topic, chapter, or syllabus keyword.
- Notes agent creates structured notes with key terms, definitions, interlinkages, and revision bullets.
- Each note pack includes probable Mains questions for answer-writing practice.
- Output can be generated in quick revision format, standard notes format, or exportable PDF format.

### PYQ and Pattern Pipeline

- Previous year questions are indexed with topic tags, paper mapping, and difficulty markers.
- Pattern summaries are generated from actual PYQs before synthetic questions are proposed.
- Users can move from PYQ review to practice mode in a single flow.

### Revision and Retention Pipeline

- Weak topics, wrong answers, and stale notes feed a revision queue.
- The queue generates daily revision cards, retry MCQs, and quick-answer prompts.
- Revision logic should follow spaced repetition principles adapted for UPSC prep.

### Curated Content Library

- The platform should maintain curated packs for NCERT-based foundations, standard books, current affairs archives, and internal revision sheets.
- Generated notes should link back to curated content references wherever possible.

### Handwritten Submission Pipeline

- Users can upload photographed or scanned handwritten answers.
- The answer-processing workflow extracts text, preserves answer structure, and passes the cleaned output to evaluation.
- Original uploaded files should be temporary unless explicit retention is required for a short-lived active session.

## Benchmarking and Workspace

### Benchmarking Model

- Users should see private benchmarking such as percentile bands, accuracy bands, and answer quality bands.
- Benchmarking should distinguish between PYQ performance, generated practice performance, and weekly test performance.
- Rankings should emphasize readiness and consistency, not only raw marks.

### Personal Workspace

- Users should be able to save notes, reports, bookmarks, tags, folders, and current affairs archives.
- Workspace search should support subject, topic, date, tag, and content type.
- Saved content should power revision and review flows across devices.

### Community Accountability

- Users can optionally join small study circles for shared streaks, targets, and progress visibility.
- The community layer should remain focused on accountability and peer motivation.
- Community discussion should never replace the core study workflow.

## Expanded Exam Coverage

- GS Prelims and GS Mains remain the core flows.
- CSAT should have dedicated comprehension, reasoning, and aptitude practice.
- Essay should support theme banks, outlines, introductions, conclusions, and scoring.
- Interview preparation should support DAF-based probable questions, mock prompts, and feedback summaries.
- Optional subjects should use separate prompt packs, rubrics, and content libraries.

## Content Rights and Compliance

- Daily newspaper ingestion must rely on licensed, permitted, or otherwise authorized source files.
- Curated content packs must be traceable to internal notes, licensed data, or public-domain material.
- Derived notes, quizzes, and reports may be stored as product artifacts, but source-material handling must remain compliant.

## Data Retention Policy

The platform must keep storage intentionally narrow.

### Persist

- User profile and authentication data.
- Selected subjects and personalization settings.
- Attempt metadata.
- PYQ progress and revision queue state.
- Scores and dimension-wise evaluation summaries.
- Strength and weakness tags.
- Benchmark snapshots and workspace metadata.
- Study-circle membership and streak metadata.
- Weekly progress snapshots.
- Generated reports, downloadable current affairs PDFs, and saved notes artifacts.

### Platform-Managed Content

- The UPSC benchmark pack, curated content library, PYQ metadata, and daily newspaper source files are system-managed knowledge assets.
- They are stored separately from user data and are not treated as user uploads.

### Do Not Persist

- Generated test papers.
- Raw question sets after the session ends.
- User-uploaded documents.
- Original handwritten answer images after temporary session processing.
- Temporary retrieval files.
- Long-lived raw evaluation context built from uploads.

### Temporary Processing Rules

- Uploaded documents are processed in memory or short-lived temp storage only.
- Handwritten answer images should be OCR-processed and then discarded unless a short-lived retry session requires temporary retention.
- Generated tests are assembled on demand and discarded after evaluation.
- If reproducibility is needed, store only metadata such as rubric version, generator version, and test seed, not the full paper.

## Low-Cost GCP Deployment

The system should be optimized for minimal fixed cost and low operational overhead.

### Recommended GCP Stack

- Cloud Run for web frontend and backend API.
- Cloud Run or Expo-based mobile companion with offline sync support.
- Cloud Run job or ingestion service for daily newspaper processing.
- Cloud Run worker service for async evaluation and report generation.
- OCR or vision-based extraction worker for handwritten answers.
- Cloud Scheduler for weekly test scheduling.
- Cloud Tasks or Pub/Sub for background job dispatch.
- Firestore for user data, scores, progress snapshots, and report metadata.
- Cloud Storage for report files and platform-managed daily newspaper source files.
- Firebase Cloud Messaging for reminders, streak nudges, and revision alerts.
- Secret Manager for API keys and app secrets.
- Cloud Logging and Monitoring for observability.

### Cost Optimization Choices

- Use serverless services that scale to zero.
- Avoid always-on VMs and Kubernetes for v1.
- Avoid a managed vector database in early versions.
- Bundle the UPSC benchmark pack as versioned app data or load it from low-cost storage.
- Generate weekly tests only when a user opens the scheduled assignment.
- Prefer PWA-first offline support before a fully separate native app if cost needs to stay minimal.
- Store reports, not full test content.

## Recommended Technical Stack

- Frontend: Next.js with TypeScript and PWA capabilities.
- Mobile: Expo or React Native client only if offline/mobile usage justifies a dedicated app.
- Backend API: FastAPI with Python.
- Agent orchestration: OpenAI API with structured tool calling and internal workflow routing.
- Authentication: Firebase Auth.
- Database: Firestore.
- Background jobs: Cloud Tasks plus Cloud Scheduler.
- OCR: OpenAI vision pipeline or GCP OCR worker for handwritten answers.
- Notifications: Firebase Cloud Messaging.
- Report output: JSON and PDF stored in Cloud Storage.

This stack keeps the system simple, serverless, and easy to iterate on.

## Proposed Repository Structure

```text
upsc-study-buddy/
|-- README.md
|-- apps/
|   |-- web/                         # Next.js web app with PWA support
|   `-- mobile/                      # Optional Expo app for deeper mobile/offline usage
|-- services/
|   |-- api/                         # FastAPI app, auth, routes, request validation
|   |-- content-ingestion/           # Daily newspaper ingestion and normalization
|   |-- ocr-worker/                  # Handwritten answer extraction and cleanup
|   |-- orchestrator/                # Multi-agent routing and session control
|   |-- evaluator-worker/            # Async scoring, analytics updates, report generation
|   `-- scheduler/                   # Weekly assignment creation and task triggers
|-- packages/
|   |-- agents/                      # Agent definitions, tools, workflows
|   |-- pyq/                         # Previous year question indexing and pattern analysis
|   |-- revision/                    # Revision queues, retry logic, and streak calculations
|   |-- current-affairs/             # Daily digest building, article tagging, MCQ generation
|   |-- notes/                       # Subject-wise notes, keywords, revision sheet builders
|   |-- workspace/                   # Bookmarks, archives, folders, and saved artifacts
|   |-- benchmarking/                # Percentiles, rank bands, and peer comparison logic
|   |-- community/                   # Study circles, streaks, and accountability features
|   |-- ocr/                         # OCR adapters and answer-cleaning utilities
|   |-- content-library/             # Curated content packs and source mappings
|   |-- prompts/
|   |   |-- common/                  # Shared system prompts and guardrails
|   |   |-- languages/               # English and Hindi medium variants
|   |   `-- subjects/                # Subject-wise prompt packs selected at signup
|   |-- rubrics/                     # UPSC evaluation rubrics and scoring schemas
|   |-- datasets/                    # Last 10 years benchmark metadata and patterns
|   |-- analytics/                   # Strength/weakness calculations and trend logic
|   |-- shared/                      # Shared types, DTOs, constants, utility functions
|   `-- reports/                     # Report builders and templates
|-- infra/
|   `-- gcp/
|       |-- cloud-run/               # Service deployment configs
|       |-- firestore/               # Indexes, security rules, local emulation setup
|       |-- storage/                 # Report bucket config
|       |-- tasks/                   # Cloud Tasks or Pub/Sub setup
|       |-- scheduler/               # Weekly cron definitions
|       `-- secrets/                 # Secret Manager references
|-- tests/
|   |-- unit/
|   |-- integration/
|   `-- evaluation/                  # Rubric and scoring regression tests
`-- docs/
    |-- product/                     # User flows, PRD notes, acceptance criteria
    |-- architecture/                # System diagrams and agent interaction docs
    `-- api/                         # Endpoint contracts and examples
```

## Suggested Service Responsibilities

### `apps/web`

- Signup and onboarding.
- Subject selection and custom mode setup.
- Study screen for content-based learning.
- Daily plan view with current affairs, quiz, and revision tasks.
- Daily current affairs view with PDF download.
- Subject-wise notes generation and export.
- PYQ browsing and practice.
- Workspace view for saved notes, bookmarks, archives, and reports.
- Benchmarking and percentile dashboard.
- Study-circle accountability features.
- Practice interfaces for Mains and Prelims.
- Essay, CSAT, and interview practice entry points.
- Weekly test dashboard.
- Strength and weakness dashboard.

### `apps/mobile`

- Delivers mobile-first study, revision, and alerts.
- Supports offline access to saved notes, revision items, and downloaded reports.
- Mirrors the core daily study loop with low-friction usage.

### `services/api`

- Authentication and user session handling.
- Exposes APIs for study, practice, PYQs, revision, workspace, community, tests, reports, and dashboard.
- Performs validation and passes requests to orchestrator or workers.

### `services/content-ingestion`

- Loads the daily newspaper source file.
- Extracts structured article blocks and metadata.
- Maintains curated content mappings and source metadata.
- Sends normalized content to the current affairs workflow.

### `services/ocr-worker`

- Processes handwritten answer uploads.
- Extracts and normalizes answer text for evaluation.
- Discards original uploaded files after temporary processing windows.

### `services/orchestrator`

- Chooses the correct agent workflow.
- Loads subject-specific prompt packs.
- Attaches user profile context, language preference, workspace state, and recent performance summary.

### `services/evaluator-worker`

- Runs async evaluation jobs.
- Computes analytics updates, benchmark snapshots, and revision updates.
- Builds report payloads and persists report artifacts.

### `services/scheduler`

- Creates weekly test due items for each subject.
- Triggers reminders, revision jobs, streak nudges, and background processing tasks.

## Suggested Domain Model

### Main Entities

- `User`
- `UserSubjectProfile`
- `StudySession`
- `CurrentAffairsDigest`
- `PyqAttempt`
- `PracticeAttempt`
- `RevisionQueueItem`
- `WeeklyTestAssignment`
- `EvaluationReport`
- `NoteArtifact`
- `HandwrittenSubmission`
- `WorkspaceItem`
- `BenchmarkSnapshot`
- `StudyCircle`
- `AnalyticsSnapshot`

### Minimal Storage Approach

- `PyqAttempt` stores question references, user performance, and pattern tags without duplicating source archives unnecessarily.
- `PracticeAttempt` stores scores, timing, topic tags, and report reference.
- `EvaluationReport` stores structured feedback and generated report output.
- `CurrentAffairsDigest` stores daily digest metadata and report reference.
- `NoteArtifact` stores saved note metadata and export reference.
- `RevisionQueueItem` stores review status, recurrence metadata, and next due date.
- `HandwrittenSubmission` stores extraction metadata and report reference, not the original long-term image file.
- `WorkspaceItem` stores bookmarks, folders, and saved artifact references.
- `BenchmarkSnapshot` stores percentile, rank-band, and readiness metrics.
- `StudyCircle` stores membership and streak-sharing metadata.
- `WeeklyTestAssignment` stores due date, subject, mode, and completion status.
- No entity stores the full generated test body permanently.

## Example API Surface

```text
POST /auth/signup
POST /users/subjects
POST /study/session
GET  /daily-plan
GET  /current-affairs/today
GET  /current-affairs/today/pdf
POST /notes/subject/generate
GET  /notes/{id}
GET  /pyq/search
POST /pyq/practice/start
POST /pyq/practice/submit
GET  /revision/queue
POST /revision/queue/{id}/complete
POST /answers/handwritten/upload
GET  /workspace/items
POST /workspace/items/{id}/bookmark
GET  /benchmarking/overview
GET  /community/circles
POST /community/circles/{id}/join
POST /practice/mains/generate
POST /practice/mains/submit
POST /practice/prelims/generate
POST /practice/prelims/submit
POST /practice/essay/generate
POST /practice/essay/submit
POST /practice/csat/generate
POST /practice/csat/submit
POST /practice/interview/generate
POST /practice/interview/submit
GET  /tests/weekly
POST /tests/weekly/{id}/start
POST /tests/weekly/{id}/submit
GET  /dashboard/overview
GET  /reports/{id}
```

## Dashboard Metrics

The dashboard should emphasize actionability over raw numbers.

- Daily streak and study-plan completion rate.
- Subject-wise accuracy and score trends.
- Daily current affairs completion rate.
- PYQ coverage and year-wise performance trends.
- Mains answer quality trend.
- Prelims concept retention and error clusters.
- Essay and CSAT progress by topic.
- High-confidence mistakes.
- Revision debt and recovery trend.
- Percentile bands and readiness score.
- Handwritten answer quality trend.
- Notes coverage by subject and topic.
- Strong topics and weak topics.
- Syllabus coverage progress.
- Weekly consistency score.
- Workspace reuse and saved-resource engagement.
- Recommended next 3 focus areas.

## MVP Scope

### Phase 1

- Signup and subject selection.
- Subject-wise study mode setup.
- English and Hindi support.
- Content-based study buddy.
- Daily current affairs analysis with notes, MCQs, and PDF export.
- Subject-wise notes generation with keywords, revision content, and probable Mains questions.
- PYQ browsing and topic-wise practice.
- Daily plan with quiz, short answer, and revision queue.
- Mains practice with evaluation.
- Prelims practice with evaluation.
- Personal workspace for saved notes and reports.
- Dashboard with basic analytics.

### Phase 2

- Weekly tests per subject.
- Handwritten answer upload with OCR pipeline.
- Benchmarking with percentile and rank-band analytics.
- CSAT and Essay dedicated practice tracks.
- Community study circles and streak accountability.
- Mobile and offline revision support.
- Better report generation.
- Personalized revision recommendations.
- Performance trend visualizations.

### Phase 3

- Interview prep and optional-subject depth expansion.
- More refined rubric tuning.
- Smarter streaks, reminders, and adaptive revision loops.
- Richer curated content library and archive experience.

## Success Criteria

- Users can study by subject with a personalized assistant.
- Users can practice PYQs, Mains, Prelims, Essay, and CSAT in UPSC-aligned formats.
- Users can prepare in English or Hindi without product degradation.
- Users receive a repeatable daily study loop with revision and current affairs built in.
- Users can upload handwritten answers and receive usable evaluation output.
- Users can save, search, and reuse notes and reports across devices.
- Users can see strengths, weaknesses, and benchmarked readiness clearly.
- Weekly subject tests run reliably with low operational cost.
- Community accountability improves engagement without requiring mentor intervention.
- Newspaper and curated-content handling stays compliant with licensing constraints.
- Dashboard clearly surfaces strengths and weaknesses.
- The system stores only user data and reports, not generated tests or uploaded documents.

## Implementation Note

For v1, keep the benchmark pack and rubrics explicit, versioned, and testable. The real differentiator is not just calling ChatGPT, but combining strong prompt design, structured rubrics, subject-specific modes, minimal data retention, and a disciplined multi-agent workflow.
