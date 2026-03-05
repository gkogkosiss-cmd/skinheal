
-- Storage bucket for skin photos
INSERT INTO storage.buckets (id, name, public) VALUES ('skin-photos', 'skin-photos', false);

-- Analyses table
CREATE TABLE public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT,
  visual_features JSONB DEFAULT '[]'::jsonb,
  diagnostic_answers JSONB DEFAULT '{}'::jsonb,
  conditions JSONB DEFAULT '[]'::jsonb,
  root_causes JSONB DEFAULT '[]'::jsonb,
  biological_explanation TEXT,
  healing_protocol JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- Users can only see their own analyses
CREATE POLICY "Users can view own analyses" ON public.analyses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses" ON public.analyses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Storage RLS: users can upload to their own folder
CREATE POLICY "Users can upload own skin photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'skin-photos' AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own skin photos" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'skin-photos' AND (storage.foldername(name))[1] = auth.uid()::text
  );
