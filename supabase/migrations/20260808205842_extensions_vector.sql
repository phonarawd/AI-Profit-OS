-- Day-1 extensions · BOOTSTRAP §3.2 step 1
-- Auth SoT = Nest JWT (ADR-006). System auth schema ≠ app SoT.

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;

COMMENT ON EXTENSION "vector" IS 'pgvector L1 for ai memory_embeddings · Day-1 · Qdrant later only (no dual-write)';
