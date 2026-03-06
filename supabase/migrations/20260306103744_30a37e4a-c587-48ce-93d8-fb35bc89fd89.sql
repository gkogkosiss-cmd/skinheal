
-- Create progress_photos table for weekly check-ins (separate from full analyses)
CREATE TABLE public.progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  analysis_id uuid REFERENCES public.analysis_records(id) ON DELETE SET NULL,
  photo_url text NOT NULL,
  date_uploaded timestamptz NOT NULL DEFAULT now(),
  progress_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_estimate integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress photos" ON public.progress_photos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress photos" ON public.progress_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress photos" ON public.progress_photos FOR DELETE TO authenticated USING (auth.uid() = user_id);
