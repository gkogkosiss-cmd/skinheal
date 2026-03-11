import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://wwkkujdrwkxqttsaikll.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3a2t1amRyd2t4cXR0c2Fpa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDU4MjUsImV4cCI6MjA4ODM4MTgyNX0.ZDJx8GsucKHCr-CZECCOWbIgPo-W9FlNuZWSxoAgOrw";

// Lovable Cloud project hosts the edge functions
const LOVABLE_CLOUD_URL = "https://obevadiyhuvipyzkcoit.supabase.co";
const LOVABLE_CLOUD_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iZXZhZGl5aHV2aXB5emtjb2l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDc3OTUsImV4cCI6MjA4ODI4Mzc5NX0.SSpIad0LF7nd4b3O1K_sAYYDvju7HOmdR48iP_bSx6k";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const SUPABASE_PROJECT_URL = SUPABASE_URL;

/** Base URL for edge functions hosted on Lovable Cloud */
export const EDGE_FUNCTIONS_URL = `${LOVABLE_CLOUD_URL}/functions/v1`;
export const EDGE_FUNCTIONS_KEY = LOVABLE_CLOUD_ANON_KEY;

/**
 * Invoke an edge function on Lovable Cloud.
 * Use this instead of supabase.functions.invoke() since functions
 * are deployed on Lovable Cloud, not on the custom project.
 */
export const invokeEdgeFunction = async (
  functionName: string,
  body?: Record<string, unknown>,
  authToken?: string
): Promise<{ data: any; error: any }> => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "apikey": EDGE_FUNCTIONS_KEY,
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    } else {
      headers["Authorization"] = `Bearer ${EDGE_FUNCTIONS_KEY}`;
    }

    const response = await fetch(`${EDGE_FUNCTIONS_URL}/${functionName}`, {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return { data: null, error: { message: data?.error || `Function returned ${response.status}`, status: response.status } };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err?.message || "Network error" } };
  }
};
