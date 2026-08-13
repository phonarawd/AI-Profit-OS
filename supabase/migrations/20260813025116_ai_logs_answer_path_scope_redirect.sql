-- Engine §47.16.4 — persist answer_path=scope_redirect (no LLM, tools=[])
-- Previous CHECK omitted scope_redirect so HTTP persist raised 23514 / 500.

ALTER TABLE public.ai_logs DROP CONSTRAINT IF EXISTS ai_logs_answer_path_check;

ALTER TABLE public.ai_logs ADD CONSTRAINT ai_logs_answer_path_check
  CHECK (answer_path = ANY (ARRAY[
    'template'::text,
    'fact'::text,
    'rag'::text,
    'llm_p'::text,
    'llm_g'::text,
    'refuse_s'::text,
    'scope_redirect'::text
  ]));
