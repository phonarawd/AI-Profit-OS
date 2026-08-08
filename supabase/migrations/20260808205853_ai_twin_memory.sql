-- Personal AI · Engine §47.9 · same PostgreSQL instance as ledger_*
-- Day-1 pgvector · Qdrant later only (no dual-write)
-- Twin MUST NOT store balanceUsdt / live quotes

CREATE TABLE public.ai_user_profile (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  preferred_capital_band text
    CHECK (preferred_capital_band IS NULL OR preferred_capital_band IN ('micro', 'small', 'mid', 'high', 'whale')),
  category_interest text[] NOT NULL DEFAULT '{}',
  tone_band text CHECK (tone_band IS NULL OR tone_band IN ('young', 'mid', 'senior')),
  objection_patterns text[] NOT NULL DEFAULT '{}',
  twin_snapshot_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_user_profile_no_money_cache_chk CHECK (
    NOT (payload ? 'balanceUsdt')
    AND NOT (payload ? 'expectedProfitUsdt')
    AND NOT (payload ? 'liveQuote')
  )
);

COMMENT ON TABLE public.ai_user_profile IS 'Twin slow prefs · schemas/user-twin.v1 · Fact numbers FORBIDDEN';

CREATE TABLE public.ai_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('session_summary', 'long_term', 'help_chunk', 'other')),
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_memory_user_id_idx ON public.ai_memory (user_id);

CREATE TABLE public.ai_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_events_user_id_idx ON public.ai_events (user_id);
CREATE INDEX ai_events_created_at_idx ON public.ai_events (created_at DESC);

CREATE TABLE public.ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  intent text NOT NULL,
  lane text NOT NULL CHECK (lane IN ('P', 'G', 'S')),
  twin_snapshot_id text,
  memory_ids uuid[] NOT NULL DEFAULT '{}',
  facts_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  tools_called text[] NOT NULL DEFAULT '{}',
  provider_id text NOT NULL
    CHECK (provider_id IN ('ollama', 'groq', 'gemini_free', 'openai', 'none')),
  answer_path text NOT NULL
    CHECK (answer_path IN ('template', 'fact', 'rag', 'llm_p', 'llm_g', 'refuse_s')),
  guard_result jsonb NOT NULL,
  answer_preview text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_logs_user_id_idx ON public.ai_logs (user_id);
CREATE INDEX ai_logs_lane_idx ON public.ai_logs (lane);
CREATE INDEX ai_logs_created_at_idx ON public.ai_logs (created_at DESC);

COMMENT ON TABLE public.ai_logs IS 'Answer traces · schemas/ai-answer-trace.v1 · Admin /admin/ai-logs';

CREATE TABLE public.ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_log_id uuid NOT NULL REFERENCES public.ai_logs (id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  label text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_feedback_ai_log_id_idx ON public.ai_feedback (ai_log_id);

-- pgvector L1 · Day-1 gemini embedding dim = 768
CREATE TABLE public.memory_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid NOT NULL REFERENCES public.ai_memory (id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users (id) ON DELETE CASCADE,
  embedding extensions.vector(768) NOT NULL,
  model_id text NOT NULL DEFAULT 'gemini-embedding-001',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memory_embeddings_memory_uq UNIQUE (memory_id)
);

CREATE INDEX memory_embeddings_user_id_idx ON public.memory_embeddings (user_id);

-- HNSW for cosine similarity search (Day-1)
CREATE INDEX memory_embeddings_hnsw_idx
  ON public.memory_embeddings
  USING hnsw (embedding extensions.vector_cosine_ops);
