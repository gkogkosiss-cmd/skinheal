
-- Drop the broken RESTRICTIVE policies
DROP POLICY IF EXISTS "Users can insert own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can view own analyses" ON public.analyses;

-- Recreate as PERMISSIVE (the default)
CREATE POLICY "Users can insert own analyses"
ON public.analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own analyses"
ON public.analyses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add UPDATE policy so users can update their own analyses
CREATE POLICY "Users can update own analyses"
ON public.analyses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Storage policies for skin-photos bucket
CREATE POLICY "Users can upload own photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'skin-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'skin-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
