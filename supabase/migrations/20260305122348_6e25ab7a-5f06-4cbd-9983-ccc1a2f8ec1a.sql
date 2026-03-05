-- Persistent analysis records
CREATE TABLE IF NOT EXISTS public.analysis_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  photo_url TEXT,
  image_observations JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  root_causes JSONB NOT NULL DEFAULT '[]'::jsonb,
  healing_protocol JSONB NOT NULL DEFAULT '{}'::jsonb,
  nutrition_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  gut_health_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  lifestyle_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  daily_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  safety_flags JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_analysis_records_user_created_at ON public.analysis_records (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_records_created_at ON public.analysis_records (created_at DESC);

ALTER TABLE public.analysis_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own analysis records" ON public.analysis_records;
DROP POLICY IF EXISTS "Users can insert own analysis records" ON public.analysis_records;
DROP POLICY IF EXISTS "Users can update own analysis records" ON public.analysis_records;
DROP POLICY IF EXISTS "Users can delete own analysis records" ON public.analysis_records;

CREATE POLICY "Users can view own analysis records"
ON public.analysis_records
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis records"
ON public.analysis_records
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis records"
ON public.analysis_records
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analysis records"
ON public.analysis_records
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Track per-user current analysis selection
CREATE TABLE IF NOT EXISTS public.user_state (
  user_id UUID PRIMARY KEY,
  latest_analysis_id UUID REFERENCES public.analysis_records(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_state_latest_analysis_id ON public.user_state (latest_analysis_id);

ALTER TABLE public.user_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own state" ON public.user_state;
DROP POLICY IF EXISTS "Users can insert own state" ON public.user_state;
DROP POLICY IF EXISTS "Users can update own state" ON public.user_state;

CREATE POLICY "Users can view own state"
ON public.user_state
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own state"
ON public.user_state
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own state"
ON public.user_state
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_user_state_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_state_updated_at ON public.user_state;
CREATE TRIGGER trg_user_state_updated_at
BEFORE UPDATE ON public.user_state
FOR EACH ROW
EXECUTE FUNCTION public.set_user_state_updated_at();