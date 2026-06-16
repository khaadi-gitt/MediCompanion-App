# MediCompanion — Complete Project Documentation

> A medical education assistant powered by Retrieval-Augmented Generation (RAG), local and cloud AI models, and an OpenAI fine-tuning pipeline. Available as a mobile app (iOS/Android), desktop app (Electron/Windows/Mac), and web app.

---

## Table of Contents

1. [Project Purpose](#1-project-purpose)
2. [Architecture Overview](#2-architecture-overview)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Database Design](#5-database-design)
6. [RAG Pipeline — Complete Explanation](#6-rag-pipeline--complete-explanation)
7. [Fine-Tuning Pipeline — Complete Explanation](#7-fine-tuning-pipeline--complete-explanation)
8. [Confidence & Quality Scoring](#8-confidence--quality-scoring)
9. [AI Provider System](#9-ai-provider-system)
10. [Backend API Reference](#10-backend-api-reference)
11. [Frontend Screens](#11-frontend-screens)
12. [Admin Panel](#12-admin-panel)
13. [Environment Variables](#13-environment-variables)
14. [How to Run the Project](#14-how-to-run-the-project)
15. [SQL Setup — Step by Step](#15-sql-setup--step-by-step)
16. [Key Functions Reference](#16-key-functions-reference)
17. [Security Notes](#17-security-notes)

---

## 1. Project Purpose

MediCompanion is a **medical education assistant** — not a diagnostic tool. It helps patients, students, and healthcare learners:

- Understand medical conditions (migraine, diabetes, gastroenterology)
- Get evidence-based explanations from uploaded medical PDFs
- Learn about treatments, symptoms, and care pathways
- Access information in a safe, disclaim-first manner

**What it explicitly does NOT do:**
- Diagnose conditions
- Prescribe or recommend specific drug doses
- Replace consultation with a qualified healthcare professional

The system uses **RAG (Retrieval-Augmented Generation)** to ground every answer in actual medical documents uploaded by the administrator — preventing hallucination and ensuring answers are traceable to real sources.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│                                                                  │
│   React Native / Expo App          Electron Desktop App          │
│   (iOS · Android · Web)            (Windows · macOS)            │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTP (port 5050)
┌───────────────────────▼─────────────────────────────────────────┐
│                     BACKEND LAYER                                │
│                                                                  │
│   Node.js  ·  raw http.createServer  ·  No framework            │
│   backend/server.js  (2,963 lines)                               │
│                                                                  │
│   ┌─────────────┐  ┌─────────────┐  ┌────────────────────────┐ │
│   │  Auth APIs  │  │  Chat APIs  │  │     Admin APIs         │ │
│   │  /auth/*    │  │  /api/chat  │  │     /admin/*           │ │
│   └─────────────┘  └──────┬──────┘  └────────────────────────┘ │
└──────────────────────────-┼─────────────────────────────────────┘
                            │
          ┌─────────────────┼──────────────────────┐
          │                 │                       │
┌─────────▼──────┐  ┌───────▼────────┐  ┌─────────▼──────────┐
│    MySQL DB     │  │   Supabase     │  │   AI Providers     │
│                 │  │  (PostgreSQL   │  │                    │
│  · users        │  │  + pgvector)   │  │  OpenAI API        │
│  · otp_codes    │  │                │  │  (GPT-4o-mini,     │
│  · app_config   │  │  · medical_    │  │   fine-tuned       │
│  · chat_        │  │    documents   │  │   models)          │
│    messages     │  │    (vectors)   │  │                    │
│  · training_    │  │  · chat_       │  │  Ollama (local)    │
│    examples     │  │    history     │  │  (llama3, mistral, │
│                 │  │    (analytics) │  │   nomic-embed)     │
└─────────────────┘  └────────────────┘  └────────────────────┘
```

**Data flow for a chat message:**
```
User types question
      ↓
Backend receives POST /api/chat
      ↓
Query rewrite → embed query → vector search in Supabase (RAG)
      ↓
Top-K medical document chunks retrieved
      ↓
Chunks injected into LLM prompt
      ↓
LLM generates answer (OpenAI or Ollama)
      ↓
Self-verify: score faithfulness → repair if low
      ↓
Confidence band computed (faithfulness + hallucination + relevance)
      ↓
Answer + badges returned to frontend
      ↓
Saved to MySQL (chat_messages) + Supabase (chat_history analytics)
```

---

## 3. Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.81.5 | Mobile UI framework |
| Expo | ~54.0.35 | Build toolchain, cross-platform |
| React | 19.1.0 | UI rendering |
| TypeScript | ~5.9.2 | Type safety |
| Expo Vector Icons | ^15.1.1 | Icon set (MaterialCommunityIcons) |
| React Native Safe Area Context | ~5.6.0 | Safe area handling |
| React Native Web | ^0.21.0 | Web rendering |
| Expo Image Picker | ~17.0.8 | Profile photo upload |
| Expo Print / Sharing | ~15.0.8 / ~14.0.8 | Export features |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | LTS | Runtime (no Express — raw http) |
| mysql2 | ^3.22.5 | MySQL connection pool |
| busboy | ^1.6.0 | Multipart file upload parsing |
| pdf-parse | ^2.4.5 | PDF text extraction |
| nodemailer | ^8.0.10 | OTP email delivery |

### Desktop
| Technology | Version | Purpose |
|---|---|---|
| Electron | ^37.0.0 | Desktop app wrapper |
| Electron Builder | ^26.0.12 | Packaging for Windows/Mac |
| concurrently | ^9.2.1 | Run Expo + Electron together |

### Databases
| Database | Purpose |
|---|---|
| MySQL | Users, auth OTPs, chat messages, app config, training examples |
| Supabase (PostgreSQL + pgvector) | Medical document vectors, RAG similarity search, chat analytics |

### AI / ML
| Technology | Purpose |
|---|---|
| OpenAI API (GPT-4o-mini) | Primary LLM for chat generation |
| OpenAI Fine-Tuning API | Train custom model on MediCompanion examples |
| OpenAI text-embedding-3-small (768d) | Embed medical document chunks |
| Ollama | Local LLM inference (privacy, offline, zero API cost) |
| nomic-embed-text (Ollama) | Local embedding fallback |
| pgvector | Vector similarity search in PostgreSQL |

### Cloud / Infrastructure
| Service | Purpose |
|---|---|
| Supabase | Hosted PostgreSQL + pgvector + Edge Functions |
| Supabase Edge Functions (Deno) | Medical intent validation layer |
| OpenAI API | Cloud inference + fine-tuning |
| SMTP (Gmail/Hostinger) | OTP email delivery |

---

## 4. Project Structure

```
MediCompanionApp-main/
│
├── App.tsx                        # Root app — navigation, session state, chat logic
├── index.ts                       # Expo entry point
├── app.json                       # Expo config (bundle IDs, app name)
├── tsconfig.json                  # TypeScript config
├── package.json                   # Dependencies
│
├── src/
│   ├── screens/                   # 18 screen components
│   │   ├── SplashScreen.tsx       # Loading animation (1.1s)
│   │   ├── LoginScreen.tsx        # Email + password login
│   │   ├── SignUpScreen.tsx       # Registration with OTP email verification
│   │   ├── ForgotPasswordScreen.tsx  # OTP-based password reset
│   │   ├── HomeScreen.tsx         # Dashboard / landing
│   │   ├── ChatScreen.tsx         # Main chat interface with RAG badges
│   │   ├── HistoryScreen.tsx      # Session list with RAG meta badges
│   │   ├── ProfileScreen.tsx      # View profile
│   │   ├── EditProfileScreen.tsx  # Edit name, photo
│   │   ├── SettingsScreen.tsx     # App settings
│   │   ├── HelpScreen.tsx         # Help content
│   │   ├── AboutScreen.tsx        # App info
│   │   ├── DisclaimerScreen.tsx   # Medical disclaimer
│   │   ├── PrivacyPolicyScreen.tsx  # Privacy policy
│   │   ├── ManageDataScreen.tsx   # Account data management
│   │   ├── LanguageScreen.tsx     # Language preference
│   │   ├── TextSizeScreen.tsx     # Accessibility text size
│   │   └── UpgradeScreen.tsx      # Pro upgrade screen
│   │
│   └── components/                # 5 reusable components
│       ├── NavItem.tsx            # Bottom nav bar item
│       ├── Field.tsx              # Styled text input
│       ├── Chip.tsx               # Tag/badge chip
│       ├── LogoMark.tsx           # App logo mark
│       └── BackgroundDecor.tsx    # Decorative background shapes
│
├── backend/
│   ├── server.js                  # Complete backend (2,963 lines)
│   ├── .env                       # Environment variables (never commit)
│   ├── .env.example               # Template for new developers
│   ├── public/
│   │   └── admin.html             # Admin dashboard (served at /admin)
│   ├── sql/                       # Database schema files
│   │   ├── mysql_auth.sql         # users + otp_codes tables
│   │   ├── mysql_runtime.sql      # app_config + chat_messages + training_examples
│   │   ├── mysql_rag_migration.sql  # RAG columns in app_config
│   │   ├── app_config.sql         # Supabase app_config (legacy)
│   │   ├── supabase_rag.sql       # medical_documents table + pgvector setup
│   │   ├── chat_history.sql       # Supabase chat_history base schema
│   │   └── chat_history_v2_migration.sql  # RAG analytics columns
│   └── uploads/
│       └── profiles/              # User profile photos
│
├── electron/
│   └── main.js                    # Electron desktop entry point
│
├── supabase/
│   └── functions/
│       └── medical-chat/
│           └── index.ts           # Deno edge function (intent validation)
│
├── scripts/
│   ├── seed_training_examples.js  # Bulk-insert 94 training examples to MySQL
│   ├── prepare_migraine_data.py   # Python script for migraine data prep
│   ├── prepare_diabetes_data.py   # Python script for diabetes data prep
│   └── prepare_gastro_data.py     # Python script for gastro data prep
│
└── research/                      # Research papers / PDFs for RAG ingestion
```

---

## 5. Database Design

### MySQL — Operational Data

#### `users` table
Stores registered user accounts.

```sql
CREATE TABLE users (
  id            CHAR(36)     PRIMARY KEY,      -- UUID generated on signup
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,          -- scrypt hash, never plaintext
  photo_url     TEXT         NULL,              -- path to uploaded profile photo
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    ON UPDATE CURRENT_TIMESTAMP
);
```

#### `otp_codes` table
Short-lived OTP codes for signup email verification and password reset.

```sql
CREATE TABLE otp_codes (
  id           BIGINT       AUTO_INCREMENT PRIMARY KEY,
  email        VARCHAR(190) NOT NULL,
  purpose      ENUM('signup','reset') NOT NULL,
  otp_hash     CHAR(64)     NOT NULL,           -- SHA-256 hash of the OTP
  payload_json TEXT         NULL,               -- signup payload stored until verified
  used         TINYINT(1)   DEFAULT 0,
  expires_at   DATETIME     NOT NULL,           -- 10 minutes from creation
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
```

#### `app_config` table
Single-row runtime configuration for the backend. Updated live via admin panel.

```sql
CREATE TABLE app_config (
  id             INT          PRIMARY KEY DEFAULT 1,
  openai_enabled TINYINT(1)   DEFAULT 1,
  openai_model   VARCHAR(200) DEFAULT 'gpt-4o-mini',  -- or fine-tuned model ID
  openai_api_key TEXT         NULL,
  ai_provider    VARCHAR(20)  DEFAULT 'openai',        -- 'openai' | 'local'
  local_api_url  VARCHAR(255) DEFAULT 'http://127.0.0.1:11434',
  local_api_key  TEXT         NULL,
  rag_enabled    TINYINT(1)   DEFAULT 0,
  rag_top_k      INT          DEFAULT 5,               -- chunks to retrieve
  supabase_url   VARCHAR(255) NULL,
  supabase_key   TEXT         NULL,
  ftjob_id       VARCHAR(100) NULL,                    -- active fine-tune job ID
  ft_model       VARCHAR(200) NULL,                    -- completed fine-tuned model ID
  updated_at     TIMESTAMP    ON UPDATE CURRENT_TIMESTAMP
);
```

#### `chat_messages` table
Stores every user and assistant message with full RAG metadata.

```sql
CREATE TABLE chat_messages (
  id                BIGINT       AUTO_INCREMENT PRIMARY KEY,
  session_id        CHAR(36)     NOT NULL,
  user_id           CHAR(36)     NULL,
  role              ENUM('user','assistant') NOT NULL,
  content           TEXT         NOT NULL,
  -- RAG metadata (assistant messages only)
  rag_used          TINYINT(1)   DEFAULT 0,
  confidence_label  VARCHAR(20)  NULL,          -- 'high'|'medium'|'low'|'very_low'
  faithfulness_score FLOAT       NULL,          -- 0.0–1.0
  hallu_score       FLOAT        NULL,          -- 0.0–1.0 (lower is better)
  llm_used          VARCHAR(50)  NULL,          -- 'openai'|'ollama'
  sources           TEXT         NULL,          -- JSON array of document titles
  total_latency_ms  INT          NULL,          -- end-to-end response time
  created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
```

#### `training_examples` table
Fine-tuning dataset managed via the admin panel.

```sql
CREATE TABLE training_examples (
  id               BIGINT  AUTO_INCREMENT PRIMARY KEY,
  enabled          TINYINT(1) DEFAULT 1,        -- 0 = excluded from training jobs
  system_prompt    TEXT    NULL,                -- overrides default system prompt
  user_input       TEXT    NOT NULL,
  assistant_output TEXT    NOT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### Supabase (PostgreSQL + pgvector) — Vector Data

#### `medical_documents` table
Stores chunked PDF content with 768-dimensional embedding vectors.

```sql
CREATE TABLE medical_documents (
  id        BIGSERIAL PRIMARY KEY,
  source    TEXT    DEFAULT 'admin_upload',
  title     TEXT    NOT NULL,            -- PDF filename (without .pdf)
  chunk_id  INT     NOT NULL,            -- chunk index within document
  content   TEXT    NOT NULL,            -- raw text chunk (~500 tokens)
  embedding VECTOR(768) NOT NULL,        -- nomic-embed or text-embedding-3-small
  metadata  JSONB   NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (title, chunk_id)
);

-- IVFFlat index for fast approximate nearest-neighbour search
CREATE INDEX idx_medical_docs_embedding
  ON medical_documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

#### `chat_history` table (Supabase analytics)
RAG quality analytics — one row per assistant message.

```sql
CREATE TABLE chat_history (
  id                  BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id          UUID         NOT NULL,
  user_id             UUID         NULL,
  question            TEXT,
  answer              TEXT,
  rewritten_query     TEXT,                    -- expanded query sent to vector DB
  faithfulness_score  FLOAT,                   -- token overlap ratio
  hallucination_score FLOAT,                   -- LLM-judge score
  sources             JSONB,                   -- retrieved document titles
  embed_via           TEXT,                    -- 'openai'|'ollama:nomic-embed-text'
  confidence          TEXT,                    -- 'high'|'medium'|'low'|'very_low'
  similarity          FLOAT,                   -- top chunk cosine similarity
  llm_used            TEXT,                    -- 'openai'|'ollama'
  created_at          TIMESTAMPTZ  DEFAULT NOW()
);
```

---

## 6. RAG Pipeline — Complete Explanation

RAG (Retrieval-Augmented Generation) is the core of MediCompanion's medical knowledge system. Instead of relying on the LLM's general training (which may be outdated, hallucinated, or too generic), RAG retrieves relevant text directly from trusted medical PDFs that you upload.

### Why RAG?

| Problem without RAG | Solution with RAG |
|---|---|
| LLM may hallucinate medical facts | Answer grounded in your uploaded PDFs |
| LLM knowledge has a training cutoff | PDFs can be updated anytime |
| No audit trail for answers | Every answer traces to source document + chunk |
| Generic answers, not your protocols | Answers reflect your specific medical content |

---

### Phase 1 — Document Ingestion (Admin uploads PDF)

```
Admin uploads PDF via admin panel
           ↓
backend/server.js  →  POST /admin/documents/upload
           ↓
1. busboy parses multipart form data → extracts PDF buffer
2. pdf-parse extracts all text from PDF
3. PII masking: removes patterns matching phone numbers,
   NHS numbers, dates of birth, email addresses
4. Text is split into chunks of ~500 tokens with 50-token overlap
   (overlap ensures context isn't lost at chunk boundaries)
5. Each chunk is embedded:
   - If OpenAI key present: text-embedding-3-small (768 dimensions)
   - Otherwise: Ollama nomic-embed-text:latest (768 dimensions)
6. Chunks + embeddings upserted to Supabase medical_documents table
   (UNIQUE constraint on title+chunk_id prevents duplicates on re-upload)
7. Admin panel shows: document title, chunk count, timestamp
```

**Key function:** `ingestPdfBuffer(cfg, apiKey, pdfBuffer, title)`

**Benefit:** Medical knowledge is completely under your control. Upload a new NICE guideline today and the next question benefits from it immediately.

---

### Phase 2 — Query Processing (User asks a question)

```
User message: "What is the premonitory phase of migraine?"
           ↓
1. Topic detection
   - Keyword matching against migraine/gastro/diabetes term lists
   - Only medical topics proceed to RAG
   - Non-medical → polite refusal
           ↓
2. Typo normalisation
   - "migrain" → "migraine"
   - "diabet" → "diabetes"
           ↓
3. Query rewriting / expansion
   - Synonyms and related terms added to improve recall
   - e.g., "premonitory" also searches "prodrome", "prodromal"
           ↓
4. Query embedding
   - Same model as ingestion (OpenAI or Ollama)
   - Produces 768-dimensional query vector
```

---

### Phase 3 — Vector Retrieval

```
Query vector → Supabase RPC: match_medical_documents()
           ↓
pgvector performs cosine similarity search
against all medical_documents embeddings
           ↓
Returns top-K chunks (default K=5, configurable in admin)
sorted by cosine similarity score (0.0–1.0)
           ↓
Chunks filtered by minimum similarity threshold
(prevents injecting irrelevant content)
```

**Cosine similarity measures the angle between two vectors:**
- Score 1.0 = identical meaning
- Score 0.8+ = highly relevant
- Score below 0.5 = likely irrelevant

**Benefit:** Semantic search — finds relevant content even when the exact words differ. "Prodrome" matches "premonitory phase" because they have similar vector representations.

---

### Phase 4 — Context Injection & Generation

```
Retrieved chunks assembled into context block:

"[MEDICAL REFERENCE EXCERPTS]
Source: Migraine Review for General Practice
---
The premonitory phase occurs 2–48 hours before headache onset.
Symptoms include fatigue, mood changes, food cravings...
---
Source: Migraine Review for General Practice
...more chunks..."

           ↓
Context injected into LLM prompt alongside user question
           ↓
LLM (OpenAI or Ollama) generates answer
constrained to use only the provided context
```

---

### Phase 5 — Self-Verify Generate Loop

```
Generate answer (iteration 1)
           ↓
faithfulnessScore() — token overlap between answer and context
           ↓
If faithfulness < 0.4 AND iteration < maxIter (2):
  Add repair instruction to prompt:
  "Your previous answer may have gone beyond the source material.
   Focus on synonyms and concepts from the provided excerpts."
  → Regenerate (iteration 2)
           ↓
Return the best answer across iterations
```

**Purpose:** Catches low-quality first attempts and forces a more grounded retry, without the user seeing the intermediate steps.

---

### Phase 6 — Quality Scoring

Three independent quality signals are computed:

#### a) Faithfulness Score
```javascript
function faithfulnessScore(answer, context) {
  // Tokenise both texts, remove stopwords
  // Faithfulness = answer_tokens ∩ context_tokens / answer_tokens
}
// Returns 0.0–1.0
// 1.0 = every content word in the answer came from the context
// 0.0 = answer shares no words with the retrieved context
```

#### b) Hallucination Score (LLM-as-judge)
```
If faithfulness >= 0.75:
  Skip LLM judge (faith_override)
  halluScore = 0  ← answer is provably grounded, no need to judge

Else:
  Ask the LLM itself:
  "Does this answer contain information NOT present in the context?"
  → Returns hallucination probability 0.0–1.0
```

**Why skip the judge at high faithfulness?** Local Ollama models give unreliable hallucination judgements. If faithfulness is already ≥ 75 %, the token-overlap proof is stronger than the judge's opinion.

#### c) Confidence Band
```javascript
function confidenceBand(faithfulness, hallucination, relevance) {
  const score = faithfulness  * 0.45   // most important signal
              + (1-hallucination) * 0.35  // second
              + relevance      * 0.20;  // cosine similarity of top chunk

  // high     ≥ 0.75
  // medium   ≥ 0.55
  // low      ≥ 0.35
  // very_low  < 0.35
}
```

**Benefit:** Users see exactly how trustworthy each answer is. A doctor can immediately see whether an answer is "High / Faithful 92%" or "Low / Unverified" and adjust their reliance accordingly.

---

### RAG Output Shown to Users

Every RAG-assisted answer displays:

```
Confidence: HIGH          ← confidenceBand label
Sources: Migraine Review  ← document titles retrieved
Faithful: 87%             ← faithfulnessScore × 100
OpenAI · 12.3s            ← LLM provider + total latency
```

---

## 7. Fine-Tuning Pipeline — Complete Explanation

### What Fine-Tuning Does vs. RAG

| | Fine-Tuning | RAG |
|---|---|---|
| Teaches | Tone, style, format, refusals | Medical facts from PDFs |
| Data | Q&A pairs you write | PDF documents you upload |
| Effect | How the model responds | What the model knows |
| Persistent | Baked into model weights | Retrieved at query time |
| Updates | Requires re-training run | Upload new PDF anytime |

**Fine-tuning teaches MediCompanion HOW to answer. RAG gives it the facts TO answer with.**

---

### Step 1 — Collect Training Examples

Training examples are managed in the admin panel → Training tab.

Each example has three fields:
- **System Prompt** — optional override (defaults to MediCompanion system prompt)
- **User Message** — a realistic patient/student question
- **Assistant Reply** — the ideal response that demonstrates correct tone and format

94 pre-built examples covering migraine, gastroenterology, and diabetes are included and can be seeded with:

```bash
node scripts/seed_training_examples.js
```

Example of a good training pair:
```
User:    Can you diagnose me with migraine?
Reply:   I can share educational information about migraine, but I'm not
         able to provide a diagnosis. Please see a neurologist or GP —
         they can evaluate your full history and run any needed tests.
```

This teaches the model to: refuse politely, redirect to professionals, stay warm in tone.

---

### Step 2 — Start a Fine-Tuning Job

Admin panel → Training tab → "Start New Fine-Tune Job"

```
Admin clicks "Start Training Job"
           ↓
POST /admin/training/start
           ↓
1. Load all enabled training_examples from MySQL
2. Validate minimum count (10 required by OpenAI)
3. buildJsonl() converts rows to OpenAI JSONL format:

   {"messages": [
     {"role": "system",    "content": "You are MediCompanion..."},
     {"role": "user",      "content": "What is migraine?"},
     {"role": "assistant", "content": "A migraine is a neurological..."}
   ]}
   (one JSON object per line)

4. uploadTrainingFile() — POST to https://api.openai.com/v1/files
   → Returns file ID (file-abc123)

5. createFineTuningJob() — POST to https://api.openai.com/v1/fine_tuning/jobs
   → Base model: current openai_model from app_config (e.g. gpt-4o-mini-2024-07-18)
   → Suffix: your label (e.g. "medicompanion")
   → n_epochs: 3 (configurable)
   → Returns job ID (ftjob-abc123)

6. ftjob_id saved to app_config in MySQL
```

---

### Step 3 — Monitor Job Status

```
Admin clicks "Poll Status"
           ↓
GET /admin/training/status
           ↓
GET https://api.openai.com/v1/fine_tuning/jobs/{ftjob_id}
           ↓
Status options:
  validating_files → queued → running → succeeded | failed | cancelled
           ↓
If succeeded:
  ft_model (e.g. ft:gpt-4o-mini:medicompanion:abc123) saved to app_config
  "Apply Fine-Tuned Model" button appears in admin panel
```

Job typically takes **15–60 minutes** depending on dataset size. OpenAI sends an email when complete.

---

### Step 4 — Apply the Fine-Tuned Model

```
Admin clicks "Apply Fine-Tuned Model"
           ↓
POST /admin/training/apply  { model_id: "ft:gpt-4o-mini:medicompanion:abc123" }
           ↓
UPDATE app_config SET openai_model = 'ft:gpt-4o-mini:medicompanion:abc123'
           ↓
Every subsequent chat request uses the fine-tuned model
(no restart required — config is read fresh per request)
```

---

### Step 5 — Switch Back to Normal Model

Admin panel → Config tab → OpenAI Model field → type `gpt-4o-mini` → Save Config.

Instant. No restart. The fine-tuned model ID is preserved in `ft_model` column in case you want to re-apply it.

---

### Fine-Tuning Benefits for MediCompanion

1. **Consistent refusals** — model reliably refuses diagnosis/dosing requests in the correct tone
2. **Format consistency** — always uses bullet lists for symptoms, numbered lists for steps
3. **Disclaimer style** — "consult your doctor" phrasing is always present and consistent
4. **Terminology** — uses correct medical terminology (premonitory phase, not "the warning bit")
5. **Length calibration** — responses neither too brief nor padded with unnecessary filler
6. **Less prompt engineering** — the system prompt can be shorter because the model already "knows" the persona

---

## 8. Confidence & Quality Scoring

Every RAG response produces three independent quality metrics:

### Faithfulness Score (0.0–1.0)
**Formula:** Token overlap between answer and retrieved context (excluding stopwords)

```
faithfulness = |answer_tokens ∩ context_tokens| / |answer_tokens|
```

- **1.0** = every content word in the answer came from the retrieved context
- **0.0** = answer shares no content words with context (pure hallucination risk)
- **Threshold:** ≥ 0.75 triggers faith_override (skip LLM judge)

### Hallucination Score (0.0–1.0)
**Method:** LLM-as-judge (self-evaluation)
- LLM rates whether its own answer contains information beyond the provided context
- **0.0** = fully grounded
- **1.0** = likely hallucinated
- Skipped when faithfulness ≥ 0.75 (faith_override)

### Confidence Band
**Formula:** Weighted combination of all three signals

```
score = faithfulness × 0.45
      + (1 − hallucination) × 0.35
      + relevance × 0.20

high      score ≥ 0.75
medium    score ≥ 0.55
low       score ≥ 0.35
very_low  score < 0.35
```

Displayed to user as colour-coded badges in the chat and history screens.

---

## 9. AI Provider System

The app supports two AI providers, switchable from the admin panel without restart.

### OpenAI (Cloud)
- **Chat:** GPT-4o-mini (or any OpenAI model, including fine-tuned)
- **Embedding:** text-embedding-3-small (768 dimensions)
- **Pros:** Highest quality, consistent, fast
- **Cons:** API costs, data sent to OpenAI servers, requires internet

### Ollama (Local)
- **Chat:** Any model installed locally (llama3.1, mistral, phi3, etc.)
- **Embedding:** nomic-embed-text:latest (768 dimensions)
- **Pros:** Free, private, works offline, no API key needed
- **Cons:** Requires capable hardware (8GB+ RAM), slower, lower quality

### Automatic Fallback Logic
```javascript
const hasOpenAIKey = runtimeCfg.openai_api_key.startsWith('sk-');
const provider = (configuredProvider === 'openai' && !hasOpenAIKey)
  ? 'local'   // fall back silently if key missing
  : configuredProvider;
```

### Embedding Provider Detection
```javascript
const hasOpenAIKey = apiKey.startsWith('sk-');
// Embed with OpenAI if key present, Ollama otherwise
// Both produce 768-dimensional vectors (compatible with the same Supabase index)
```

---

## 10. Backend API Reference

Base URL: `http://localhost:5050`

### Authentication Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/auth/signup/send-otp` | Send OTP to email for new account |
| POST | `/auth/signup/verify-otp` | Verify OTP → create account → return user |
| POST | `/auth/login` | Login with email + password → return user |
| POST | `/auth/password/send-otp` | Send OTP for password reset |
| POST | `/auth/password/reset` | Verify OTP → update password |

**OTP flow:**
1. Send OTP → 6-digit code emailed, SHA-256 hash stored in `otp_codes`, expires in 10 minutes
2. Verify OTP → hash compared, if match → user created/password updated, OTP marked used

### Chat Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/chat` | Send message, get RAG-enhanced response |
| GET | `/api/chat/history` | List all sessions for a user |
| GET | `/api/chat/messages` | Get all messages for a session (with RAG meta) |

**POST /api/chat request body:**
```json
{
  "message": "What is the premonitory phase of migraine?",
  "sessionId": "uuid",
  "userId": "uuid",
  "history": [{ "role": "user", "content": "..." }, ...]
}
```

**POST /api/chat response:**
```json
{
  "reply": "The premonitory phase...",
  "ragUsed": true,
  "confidenceLabel": "high",
  "faithfulnessScore": 0.87,
  "halluScore": 0.0,
  "halluMethod": "faith_override",
  "sources": ["Migraine Review for General Practice"],
  "llm_used": "openai",
  "latency_ms": { "embed": 120, "retrieval": 80, "generation": 4200, "total": 4400 }
}
```

### Profile Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/profile/update` | Update full_name and/or photo_url |
| POST | `/account/delete` | Permanently delete account and all messages |

### Admin Endpoints

All admin endpoints require `X-Admin-Secret` header (obtained via `/admin/login`).

| Method | Path | Description |
|---|---|---|
| POST | `/admin/login` | Exchange email+password → session token |
| GET | `/admin/config` | Get current runtime configuration |
| POST | `/admin/config` | Update configuration fields |
| POST | `/admin/documents/upload` | Upload and ingest a PDF |
| GET | `/admin/documents` | List all ingested documents |
| DELETE | `/admin/documents` | Delete all documents |
| DELETE | `/admin/documents/:title` | Delete one document by title |
| GET | `/admin/training/examples` | List all training examples |
| POST | `/admin/training/examples` | Add new training example |
| PUT | `/admin/training/examples/:id` | Update training example |
| PATCH | `/admin/training/examples/:id/toggle` | Enable/disable example |
| DELETE | `/admin/training/examples/:id` | Delete training example |
| POST | `/admin/training/start` | Start OpenAI fine-tuning job |
| GET | `/admin/training/status` | Poll fine-tuning job status |
| POST | `/admin/training/apply` | Apply fine-tuned model as active model |
| POST | `/admin/training/cancel` | Cancel active training job |

---

## 11. Frontend Screens

### Authentication Flow
```
SplashScreen (1.1s)
     ↓
LoginScreen ──────── forgot password ──→ ForgotPasswordScreen
     ↓                                          ↓ (OTP verified)
SignUpScreen ──── OTP email sent ──→ verify ──→ LoginScreen
     ↓
HomeScreen
```

### Main App Flow
```
HomeScreen
├── → ChatScreen       (new chat or continue session)
├── → HistoryScreen    (past sessions with RAG badges)
│        └── → ChatScreen (resume session)
├── → ProfileScreen
│        └── → EditProfileScreen
├── → UpgradeScreen
└── → Settings
         ├── → HelpScreen
         ├── → AboutScreen
         ├── → DisclaimerScreen
         ├── → PrivacyPolicyScreen
         ├── → ManageDataScreen
         ├── → LanguageScreen
         └── → TextSizeScreen
```

### Key Screen Details

#### ChatScreen.tsx
- Displays conversation with typing indicator (3 stages: Thinking → Searching documents → Generating)
- Each assistant message shows RAG quality badges: Confidence, Faithful %, LLM provider, latency, source documents
- Sends message history (last N turns) to backend for context
- Detects topic keywords to trigger RAG on medical queries

#### HistoryScreen.tsx
- Lists up to 30 recent sessions
- Each row shows the session title + last RAG answer's quality badges
- Tap any session to resume the conversation in ChatScreen

#### ChatScreen — Message Type
```typescript
type ChatMsg = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  confidenceLabel?: 'low' | 'medium' | 'high' | 'very_low';
  sources?: string[];
  ragUsed?: boolean;
  faithfulnessScore?: number;   // 0–1
  halluScore?: number;          // 0–1 (lower = better)
  llmUsed?: string;             // 'ollama' | 'openai'
  totalLatencyMs?: number;
}
```

---

## 12. Admin Panel

Access: `http://localhost:5050/admin` in any browser.

**Login credentials** (configured in `.env`):
- Email: `ADMIN_EMAIL`
- Password: `ADMIN_PASSWORD`

The login endpoint returns the internal `ADMIN_SECRET` token which is sent as `X-Admin-Secret` header on all subsequent requests.

### Tab 1 — Documents
| Feature | Description |
|---|---|
| PDF Upload | Drag-and-drop or click to select — ingests PDF into Supabase vector DB |
| Progress bar | Shows upload + ingestion progress |
| Document list | Title, chunk count, ingestion timestamp |
| Delete document | Removes all chunks for that document from Supabase |
| Delete all | Wipes entire medical knowledge base |

### Tab 2 — Config
| Section | Field | Purpose |
|---|---|---|
| AI Provider | Provider dropdown | Switch between OpenAI and Local (Ollama) |
| AI Provider | OpenAI Model | Model name — normal (`gpt-4o-mini`) or fine-tuned (`ft:gpt-4o-mini:...`) |
| AI Provider | OpenAI API Key | Secret key — stored encrypted in MySQL |
| AI Provider | Local API URL | Ollama endpoint (default: http://127.0.0.1:11434) |
| AI Provider | Enable AI Chat | Master switch for chat functionality |
| RAG Settings | Enable RAG | Toggle retrieval-augmented generation on/off |
| RAG Settings | Top-K Chunks | How many document chunks to retrieve per query (1–20) |
| RAG Settings | Supabase URL | Your Supabase project URL |
| RAG Settings | Supabase Key | Service role key for vector DB access |

### Tab 3 — Training
| Section | Feature | Description |
|---|---|---|
| Job Status | Job ID | Active fine-tuning job ID (ftjob_xxx) |
| Job Status | Fine-tuned Model | Model ID once training succeeds |
| Job Status | Active Model | Currently used model (shows ✓ Applied if fine-tuned is active) |
| Job Status | Poll Status | Fetch latest job status from OpenAI |
| Job Status | Apply Model | One-click switch to use fine-tuned model for all chats |
| Start Job | Suffix | Label for your fine-tuned model (e.g. "medicompanion-v1") |
| Start Job | Epochs | Training passes over data (default 3, range 1–10) |
| Start Job | Start | Uploads examples to OpenAI, creates job, saves ftjob_id |
| Examples | Table | Shows all examples with enabled/disabled status |
| Examples | Add/Edit | Modal form with system prompt, user message, assistant reply |
| Examples | Toggle | Enable or disable individual examples for next training run |
| Examples | Delete | Remove example permanently |

---

## 13. Environment Variables

File: `backend/.env`

```env
# ── Server ──────────────────────────────────────────────────────
PORT=5050

# ── Admin Panel ─────────────────────────────────────────────────
ADMIN_SECRET=your-strong-random-secret    # internal API token
ADMIN_EMAIL=admin@gmail.com               # admin login email
ADMIN_PASSWORD=admin                      # admin login password (change in production!)

# ── MySQL ───────────────────────────────────────────────────────
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=medicompanion

# ── Email (SMTP for OTP delivery) ───────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password              # Gmail App Password (not your login password)
SMTP_FROM=your-email@gmail.com

# ── Supabase (RAG vector store) ─────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...              # Service role key (not anon key)

# ── Ollama (local AI — optional) ────────────────────────────────
OLLAMA_EMBED_MODEL=nomic-embed-text:latest
```

> **Security:** Never commit `.env` to version control. The `.gitignore` already excludes it.

---

## 14. How to Run the Project

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ LTS | https://nodejs.org |
| MySQL | 8.0+ | https://dev.mysql.com/downloads/ |
| Expo CLI | Latest | `npm install -g expo-cli` |
| Ollama | Latest (optional) | https://ollama.com |
| Git | Any | https://git-scm.com |

---

### Step 1 — Clone and Install

```bash
git clone <your-repo-url>
cd MediCompanionApp-main

# Install all dependencies (frontend + backend + Electron)
npm install
```

---

### Step 2 — Configure Environment

```bash
# Copy the template
cp backend/.env.example backend/.env

# Edit with your values
notepad backend/.env   # Windows
nano backend/.env      # Mac/Linux
```

Minimum required values to fill in:
- `MYSQL_PASSWORD` — your MySQL root/user password
- `SMTP_USER` + `SMTP_PASS` — for OTP emails
- `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` — for RAG (from Supabase dashboard)

---

### Step 3 — Set Up MySQL Database

Connect to MySQL and run the SQL files in order:

```sql
-- 1. Create database
CREATE DATABASE medicompanion CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medicompanion;

-- 2. Run schema files (in this exact order)
SOURCE backend/sql/mysql_auth.sql;
SOURCE backend/sql/mysql_runtime.sql;
SOURCE backend/sql/mysql_rag_migration.sql;

-- 3. Insert default config row
INSERT INTO app_config (id, openai_enabled, openai_model, ai_provider, rag_enabled, rag_top_k)
VALUES (1, 1, 'gpt-4o-mini', 'openai', 0, 5)
ON DUPLICATE KEY UPDATE id=1;

-- 4. Add fine-tuning columns (if not present)
ALTER TABLE app_config
  ADD COLUMN IF NOT EXISTS ftjob_id VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS ft_model VARCHAR(200) NULL;

-- 5. Add RAG meta columns to chat_messages
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS rag_used TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confidence_label VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS faithfulness_score FLOAT NULL,
  ADD COLUMN IF NOT EXISTS hallu_score FLOAT NULL,
  ADD COLUMN IF NOT EXISTS llm_used VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS sources TEXT NULL,
  ADD COLUMN IF NOT EXISTS total_latency_ms INT NULL;
```

---

### Step 4 — Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Run the RAG schema
-- (copy contents of backend/sql/supabase_rag.sql and execute)

-- Run the analytics migration
-- (copy contents of backend/sql/chat_history_v2_migration.sql and execute)
```

3. Copy your project URL and service role key (Settings → API) into `backend/.env`

---

### Step 5 — Set Up Ollama (Optional — for local AI)

```bash
# Install Ollama from https://ollama.com

# Pull a chat model
ollama pull llama3.1

# Pull the embedding model (required for local RAG)
ollama pull nomic-embed-text

# Verify Ollama is running
curl http://localhost:11434/api/tags
```

---

### Step 6 — Configure AI Provider via Admin Panel

1. Start the backend: `npm run server` (or see below)
2. Open `http://localhost:5050/admin`
3. Login with your `ADMIN_EMAIL` and `ADMIN_PASSWORD`
4. Go to **Config tab**:
   - Set Provider to **OpenAI** and paste your API key, OR
   - Set Provider to **Local (Ollama)** and set URL to `http://127.0.0.1:11434`
5. Enable RAG → paste Supabase URL and key → Save
6. Go to **Documents tab** → Upload your medical PDFs

---

### Step 7 — Seed Training Examples (Optional)

```bash
node scripts/seed_training_examples.js
# Inserts 94 pre-built examples (migraine, gastro, diabetes)
# Safe to run multiple times — skips existing rows
```

---

### Step 8 — Run the App

#### Mobile / Web (Expo)
```bash
# Start backend
npm run server          # or: node backend/server.js

# Start Expo (separate terminal)
npx expo start

# Then press:
# a  → Android emulator
# i  → iOS simulator
# w  → Web browser
```

#### Desktop (Electron)
```bash
# Development (runs Expo web + Electron together)
npm run electron-dev

# Production build
npm run electron-build
# Output: dist/ folder with installers
```

#### Backend only (for API testing)
```bash
node backend/server.js
# Server starts at http://localhost:5050
# Admin panel: http://localhost:5050/admin
```

---

### Available npm Scripts

| Script | Command | What it does |
|---|---|---|
| `npm run server` | `node backend/server.js` | Start backend |
| `npm run electron-dev` | `concurrently ...` | Expo web + Electron in dev mode |
| `npm run electron-build` | `expo export + electron-builder` | Build desktop installers |
| `node scripts/seed_training_examples.js` | — | Seed 94 training examples |

---

## 15. SQL Setup — Step by Step

For first-time setup, run in this exact order:

### MySQL (run in MySQL client)
```
1. mysql_auth.sql         → users, otp_codes
2. mysql_runtime.sql      → app_config, chat_messages, training_examples
3. mysql_rag_migration.sql → adds RAG columns to app_config
4. manual ALTER statements → adds fine-tuning and RAG meta columns
```

### Supabase (run in SQL Editor)
```
1. supabase_rag.sql                → medical_documents table, pgvector, RPC function
2. chat_history.sql                → base chat_history table
3. chat_history_v2_migration.sql   → adds RAG analytics columns
```

---

## 16. Key Functions Reference

### `ingestPdfBuffer(cfg, apiKey, pdfBuffer, title)`
**File:** `backend/server.js`
**Purpose:** Ingests a PDF into the RAG knowledge base.
**Process:** Extract text → mask PII → chunk (~500 tokens, 50 overlap) → embed → upsert to Supabase
**Returns:** `{ title, chunks_total, chunks_new }`

### `faithfulnessScore(answer, context)`
**File:** `backend/server.js`
**Purpose:** Measures how grounded an answer is in the retrieved context.
**Formula:** Token overlap ratio (answer ∩ context) / answer, excluding stopwords
**Returns:** Float 0.0–1.0

### `confidenceBand(faithfulness, hallucination, relevance)`
**File:** `backend/server.js`
**Purpose:** Combines three quality signals into a single confidence label.
**Formula:** faith×0.45 + (1-hallu)×0.35 + relevance×0.20
**Returns:** `{ label: 'high'|'medium'|'low'|'very_low', score: float }`

### `selfVerifyGenerate(runtimeCfg, provider, messages, ragContextText, maxIter)`
**File:** `backend/server.js`
**Purpose:** Generates answer, checks faithfulness, repairs if too low.
**Returns:** `{ reply: string, faithfulness: float }`

### `buildJsonl(examples)`
**File:** `backend/server.js`
**Purpose:** Converts training examples array to OpenAI fine-tuning JSONL format.
**Returns:** String (JSONL content, one JSON object per line)

### `getRuntimeConfig()`
**File:** `backend/server.js`
**Purpose:** Reads current config from MySQL `app_config`. Called on every chat request — no restart needed after admin config changes.
**Returns:** Full config object including `openai_model`, `ft_model`, `ftjob_id`

### `isAdmin(req)`
**File:** `backend/server.js`
**Purpose:** Validates admin requests by checking `X-Admin-Secret` header.
**Returns:** Boolean

---

## 17. Security Notes

### What is secured
- Passwords hashed with `crypto.scryptSync` (bcrypt-equivalent, never stored plaintext)
- OTPs stored as SHA-256 hashes with 10-minute expiry and single-use enforcement
- All SQL queries use parameterised statements (no string interpolation — SQL injection prevented)
- Admin endpoints require `X-Admin-Secret` header on every request
- Admin login requires email + password (credentials in `.env`, never in code)
- Profile uploads stored server-side, not embedded in responses

### What should be improved before production
- Add **rate limiting** on `/api/chat` and `/admin/login` (prevent brute force and API cost abuse)
- Replace **stateless admin token** with short-lived JWT (24-hour expiry)
- Set **CORS to specific origins** instead of `Access-Control-Allow-Origin: *`
- Add **HTTPS** (TLS termination via nginx or Caddy in front of the Node server)
- Change `ADMIN_PASSWORD=admin` to a strong random password
- Move `ADMIN_SECRET` to a cryptographically random 32-byte value

---

## Quick Reference Card

```
Start backend:     node backend/server.js
Start mobile app:  npx expo start
Admin panel:       http://localhost:5050/admin
Admin login:       ADMIN_EMAIL / ADMIN_PASSWORD from backend/.env

Upload PDFs:       Admin → Documents → drag and drop
Configure AI:      Admin → Config → set provider + API key
Start fine-tuning: Admin → Training → add examples → Start Job
Apply fine-tuned:  Admin → Training → Poll Status → Apply Fine-Tuned Model
Seed 94 examples:  node scripts/seed_training_examples.js

MySQL DB:          medicompanion
MySQL tables:      users, otp_codes, app_config, chat_messages, training_examples
Supabase tables:   medical_documents (vectors), chat_history (analytics)
Backend port:      5050
```

---

*MediCompanion is a medical education tool. It does not provide medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for personal medical decisions.*
