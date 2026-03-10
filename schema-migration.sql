-- ============================================================
-- SkinHeal Full Schema Migration
-- Run this in your Supabase SQL Editor at wwkkujdrwkxqttsaikll
-- ============================================================

-- ========================
-- 1. TABLES
-- ========================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  provider text DEFAULT 'email',
  profile_photo_url text,
  age_range text,
  skin_concern text,
  welcome_email_sent boolean NOT NULL DEFAULT false,
  premium_email_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analysis_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body_area text DEFAULT 'face',
  photo_url text,
  photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_observations jsonb NOT NULL DEFAULT '[]'::jsonb,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  root_causes jsonb NOT NULL DEFAULT '[]'::jsonb,
  healing_protocol jsonb NOT NULL DEFAULT '{}'::jsonb,
  nutrition_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  gut_health_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  lifestyle_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  daily_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  skin_score jsonb NOT NULL DEFAULT '{}'::jsonb,
  safety_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text,
  conditions jsonb DEFAULT '[]'::jsonb,
  visual_features jsonb DEFAULT '[]'::jsonb,
  root_causes jsonb DEFAULT '[]'::jsonb,
  biological_explanation text,
  healing_protocol jsonb DEFAULT '{}'::jsonb,
  diagnostic_answers jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analysis_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.analysis_records(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  image_type text NOT NULL DEFAULT 'upload',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.analysis_records(id) ON DELETE SET NULL,
  role text NOT NULL,
  message_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.analysis_records(id) ON DELETE SET NULL,
  task_name text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.analysis_records(id) ON DELETE SET NULL,
  photo_url text NOT NULL,
  body_area text DEFAULT 'face',
  score_estimate integer,
  progress_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  date_uploaded timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.skin_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.analysis_records(id) ON DELETE SET NULL,
  overall_score integer NOT NULL,
  inflammation_score integer,
  redness_score integer,
  breakout_score integer,
  barrier_score integer,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.analysis_records(id) ON DELETE SET NULL,
  helpful boolean,
  feedback_text text,
  context text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_notifications (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_plan_reminder boolean NOT NULL DEFAULT true,
  meal_reminder boolean NOT NULL DEFAULT true,
  weekly_check_reminder boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  latest_analysis_id uuid REFERENCES public.analysis_records(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ========================
-- 2. FUNCTIONS & TRIGGERS
-- ========================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, provider)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    provider = EXCLUDED.provider;
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_user_state_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER set_user_state_updated_at
  BEFORE UPDATE ON public.user_state
  FOR EACH ROW EXECUTE FUNCTION public.set_user_state_updated_at();

-- ========================
-- 3. ENABLE RLS
-- ========================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skin_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_state ENABLE ROW LEVEL SECURITY;

-- ========================
-- 4. RLS POLICIES
-- ========================

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- analysis_records
CREATE POLICY "Users can view own analysis records" ON public.analysis_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analysis records" ON public.analysis_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analysis records" ON public.analysis_records FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own analysis records" ON public.analysis_records FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- analyses
CREATE POLICY "Users can view own analyses" ON public.analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analyses" ON public.analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analyses" ON public.analyses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- analysis_images
CREATE POLICY "Users can view own analysis images" ON public.analysis_images FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analysis images" ON public.analysis_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own analysis images" ON public.analysis_images FOR DELETE USING (auth.uid() = user_id);

-- ai_coach_messages
CREATE POLICY "Users can view own messages" ON public.ai_coach_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.ai_coach_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.ai_coach_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- daily_tasks
CREATE POLICY "Users can view own tasks" ON public.daily_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.daily_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.daily_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.daily_tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- progress_photos
CREATE POLICY "Users can view own progress photos" ON public.progress_photos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress photos" ON public.progress_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress photos" ON public.progress_photos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- skin_health_scores
CREATE POLICY "Users can view own scores" ON public.skin_health_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scores" ON public.skin_health_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scores" ON public.skin_health_scores FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- subscriptions
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_feedback
CREATE POLICY "Users can view own feedback" ON public.user_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feedback" ON public.user_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- user_notifications
CREATE POLICY "Users can view own notifications" ON public.user_notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.user_notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.user_notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_state
CREATE POLICY "Users can view own state" ON public.user_state FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own state" ON public.user_state FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own state" ON public.user_state FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========================
-- 5. STORAGE BUCKET
-- ========================

INSERT INTO storage.buckets (id, name, public) VALUES ('skin-photos', 'skin-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload/read/delete their own files
CREATE POLICY "Users can upload own photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'skin-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own photos" ON storage.objects FOR SELECT USING (bucket_id = 'skin-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE USING (bucket_id = 'skin-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
