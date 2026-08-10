-- UI PART9g · Admin §35.4 pointer
-- Singleton growth ticker/counter mode store (≠ growth_control simulation switch)

CREATE TABLE IF NOT EXISTS public.growth_ticker_config (
  id smallint PRIMARY KEY CHECK (id = 1),
  ticker_mode text NOT NULL DEFAULT 'off'
    CHECK (ticker_mode IN ('off', 'live', 'demo', 'hybrid')),
  counter_mode text NOT NULL DEFAULT 'off'
    CHECK (counter_mode IN ('off', 'ledger', 'demo', 'blended')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_admin_id uuid NULL
);

INSERT INTO public.growth_ticker_config (id, ticker_mode, counter_mode)
VALUES (1, 'off', 'off')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.growth_ticker_config IS
  'UI PART9g · Admin §35.4 G4 ticker_mode/counter_mode singleton · default off · PATCH Owns=Admin';

ALTER TABLE public.growth_ticker_config ENABLE ROW LEVEL SECURITY;

-- Nest service_role / bypass RLS · no anon policies (read via Nest only)
