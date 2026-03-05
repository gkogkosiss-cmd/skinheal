import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Condition {
  condition: string;
  probability: number;
  explanation: string;
}

export interface FoodItem {
  food: string;
  reason: string;
}

export interface RootCause {
  title: string;
  description: string;
}

export interface TriggerFood {
  food: string;
  approach: string;
}

export interface MealTemplate {
  breakfast: string;
  lunch: string;
  dinner: string;
  snack: string;
}

export interface GutDayPlan {
  day: string;
  focus: string;
}

export interface HealingProtocolData {
  whatIsHappening?: string;
  morningRoutine: string[];
  eveningRoutine: string[];
  weeklyTreatments: string[];
  triggersToAvoid?: string[];
  safetyGuidance?: string;
  timeline: string;
  foodPriorities?: string[];
  foodsToEat: FoodItem[];
  foodsToAvoid: FoodItem[];
  mealTemplate?: MealTemplate;
  commonTriggerFoods?: TriggerFood[];
  hydrationGuidance?: string;
  gutExplanation?: string;
  sevenDayGutPlan?: GutDayPlan[];
  digestiveSupport?: string[];
  gutCautions?: string;
  sleepPlan?: string[];
  stressPlan?: string[];
  exerciseGuidance?: string[];
  sunlightGuidance?: string[];
  dailyChecklist?: string[];
  thisWeekFocus?: string;
  gutHealth: string[];
  lifestyle: string[];
}

export interface Analysis {
  id: string;
  user_id: string;
  image_url: string | null;
  visual_features: string[];
  diagnostic_answers: Record<string, string>;
  conditions: Condition[];
  root_causes: RootCause[];
  biological_explanation: string | null;
  healing_protocol: HealingProtocolData;
  created_at: string;
}

export const useLatestAnalysis = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["latest-analysis", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as Analysis | null;
    },
    enabled: !!user,
  });
};

export const useAllAnalyses = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["all-analyses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Analysis[];
    },
    enabled: !!user,
  });
};

export const getSignedImageUrl = async (path: string) => {
  const { data } = await supabase.storage
    .from("skin-photos")
    .createSignedUrl(path, 3600);
  return data?.signedUrl || null;
};
