import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const SUPABASE_PROJECT_URL = SUPABASE_URL;
export const EDGE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
export const EDGE_FUNCTIONS_KEY = SUPABASE_ANON_KEY;

/**
 * Invoke a backend function on Lovable Cloud.
 */
export const invokeEdgeFunction = async (
  functionName: string,
  body?: Record<string, unknown>,
  authToken?: string
): Promise<{ data: any; error: any }> => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: EDGE_FUNCTIONS_KEY,
      Authorization: authToken ? `Bearer ${authToken}` : `Bearer ${EDGE_FUNCTIONS_KEY}`,
    };

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
