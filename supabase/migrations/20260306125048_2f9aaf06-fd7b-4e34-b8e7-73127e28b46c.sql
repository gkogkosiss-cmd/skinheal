
ALTER TABLE public.analysis_records ADD COLUMN IF NOT EXISTS body_area text DEFAULT 'face';
ALTER TABLE public.progress_photos ADD COLUMN IF NOT EXISTS body_area text DEFAULT 'face';
