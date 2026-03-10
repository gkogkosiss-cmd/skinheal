import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://wwkkujdrwkxqttsaikll.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3a2t1amRyd2t4cXR0c2Fpa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDU4MjUsImV4cCI6MjA4ODM4MTgyNX0.ZDJx8GsucKHCr-CZECCOWbIgPo-W9FlNuZWSxoAgOrw";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const SUPABASE_PROJECT_URL = SUPABASE_URL;
