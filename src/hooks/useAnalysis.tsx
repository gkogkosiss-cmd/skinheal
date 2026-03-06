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

export interface NutritionPlan {
  priorities: string[];
  foods_to_focus: Array<{ food: string; why: string }>;
  foods_to_limit: Array<{ food: string; why: string }>;
  one_day_template: MealTemplate;
  hydration: { target: string; tips: string[] };
  optional_triggers_to_test: Array<{ trigger: string; how_to_test_safely: string }>;
}

export interface GutHealthPlan {
  explanation_simple: string;
  seven_day_plan: Array<{ day: string; actions: string[] }>;
  digestion_basics: string[];
  cautions: string[];
}

export interface LifestylePlan {
  sleep: string[];
  stress: string[];
  exercise: string[];
  habits: string[];
}

export interface DailyPlan {
  morning: string[];
  midday: string[];
  evening: string[];
  weekly: string[];
}

export interface SafetyFlags {
  disclaimer: string;
  red_flags: string[];
  if_this_gets_worse: string;
}

export interface SkinScoreFactor {
  score: number;
  explanation: string;
}

export interface SkinScore {
  overall: number;
  factors: Record<string, SkinScoreFactor>;
}

export interface Analysis {
  id: string;
  user_id: string;
  created_at: string;
  image_url: string | null;
  photo_url: string | null;
  visual_features: string[];
  image_observations: string[];
  diagnostic_answers: Record<string, string>;
  answers: Record<string, string>;
  conditions: Condition[];
  results: Condition[];
  root_causes: RootCause[];
  biological_explanation: string | null;
  healing_protocol: HealingProtocolData;
  nutrition_plan: NutritionPlan;
  gut_health_plan: GutHealthPlan;
  lifestyle_plan: LifestylePlan;
  daily_plan: DailyPlan;
  safety_flags: SafetyFlags;
  skin_score: SkinScore;
}

const safeStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const flattenStepSections = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  if (value.every((item) => typeof item === "string")) {
    return value as string[];
  }

  const flattened: string[] = [];
  for (const section of value) {
    if (typeof section === "string") {
      flattened.push(section);
      continue;
    }

    const steps = safeStringArray((section as any)?.steps);
    flattened.push(...steps);
  }

  return flattened;
};

const mapRecordToAnalysis = (record: any): Analysis => {
  const healingRaw = (record?.healing_protocol ?? {}) as any;
  const nutritionRaw = (record?.nutrition_plan ?? {}) as any;
  const gutRaw = (record?.gut_health_plan ?? {}) as any;
  const lifestyleRaw = (record?.lifestyle_plan ?? {}) as any;
  const dailyRaw = (record?.daily_plan ?? {}) as any;
  const safetyRaw = (record?.safety_flags ?? {}) as any;

  const morningRoutine = flattenStepSections(healingRaw.morning).length
    ? flattenStepSections(healingRaw.morning)
    : safeStringArray(healingRaw.morningRoutine);

  const eveningRoutine = flattenStepSections(healingRaw.evening).length
    ? flattenStepSections(healingRaw.evening)
    : safeStringArray(healingRaw.eveningRoutine);

  const weeklyTreatments = flattenStepSections(healingRaw.weekly).length
    ? flattenStepSections(healingRaw.weekly)
    : safeStringArray(healingRaw.weeklyTreatments);

  const timelineObject = (healingRaw.timeline ?? {}) as any;
  const timeline = typeof timelineObject?.raw === "string"
    ? timelineObject.raw
    : [timelineObject?.week1, timelineObject?.weeks2to4, timelineObject?.weeks6to12]
        .filter((item) => typeof item === "string" && item.length > 0)
        .join(" ") ||
      "Many people notice initial changes within 7-14 days. More significant improvement often takes 4-8 weeks of consistent daily care.";

  const foodsToEat = Array.isArray(nutritionRaw.foods_to_focus)
    ? nutritionRaw.foods_to_focus.map((item: any) => ({
        food: item?.food || "",
        reason: item?.why || "",
      }))
    : [];

  const foodsToAvoid = Array.isArray(nutritionRaw.foods_to_limit)
    ? nutritionRaw.foods_to_limit.map((item: any) => ({
        food: item?.food || "",
        reason: item?.why || "",
      }))
    : [];

  const sevenDayGutPlan = Array.isArray(gutRaw.seven_day_plan)
    ? gutRaw.seven_day_plan.map((item: any) => ({
        day: item?.day || "",
        focus: Array.isArray(item?.actions) ? item.actions.join(" ") : "",
      }))
    : [];

  const dailyPlan: DailyPlan = {
    morning: safeStringArray(dailyRaw.morning),
    midday: safeStringArray(dailyRaw.midday),
    evening: safeStringArray(dailyRaw.evening),
    weekly: safeStringArray(dailyRaw.weekly),
  };

  const combinedLifestyle = [
    ...safeStringArray(lifestyleRaw.sleep),
    ...safeStringArray(lifestyleRaw.stress),
    ...safeStringArray(lifestyleRaw.exercise),
    ...safeStringArray(lifestyleRaw.habits),
  ];

  const combinedDailyChecklist = [
    ...dailyPlan.morning,
    ...dailyPlan.midday,
    ...dailyPlan.evening,
    ...dailyPlan.weekly,
  ];

  const hydrationTarget = nutritionRaw?.hydration?.target || "";
  const hydrationTips = safeStringArray(nutritionRaw?.hydration?.tips);
  const hydrationGuidance = [hydrationTarget, ...hydrationTips].filter(Boolean).join(" ");

  return {
    id: record.id,
    user_id: record.user_id,
    created_at: record.created_at,
    image_url: record.photo_url ?? null,
    photo_url: record.photo_url ?? null,
    visual_features: safeStringArray(record.image_observations),
    image_observations: safeStringArray(record.image_observations),
    diagnostic_answers: (record.answers ?? {}) as Record<string, string>,
    answers: (record.answers ?? {}) as Record<string, string>,
    conditions: Array.isArray(record.results) ? record.results : [],
    results: Array.isArray(record.results) ? record.results : [],
    root_causes: Array.isArray(record.root_causes) ? record.root_causes : [],
    biological_explanation:
      healingRaw.what_is_happening || gutRaw.explanation_simple || null,
    healing_protocol: {
      whatIsHappening: healingRaw.what_is_happening || undefined,
      morningRoutine,
      eveningRoutine,
      weeklyTreatments,
      triggersToAvoid: safeStringArray(healingRaw.avoid),
      safetyGuidance: healingRaw.safety_guidance || safetyRaw.if_this_gets_worse || undefined,
      timeline,
      foodPriorities: safeStringArray(nutritionRaw.priorities),
      foodsToEat,
      foodsToAvoid,
      mealTemplate: {
        breakfast: nutritionRaw?.one_day_template?.breakfast || "",
        lunch: nutritionRaw?.one_day_template?.lunch || "",
        dinner: nutritionRaw?.one_day_template?.dinner || "",
        snack: nutritionRaw?.one_day_template?.snack || "",
      },
      commonTriggerFoods: Array.isArray(nutritionRaw.optional_triggers_to_test)
        ? nutritionRaw.optional_triggers_to_test.map((item: any) => ({
            food: item?.trigger || "",
            approach: item?.how_to_test_safely || "",
          }))
        : [],
      hydrationGuidance,
      gutExplanation: gutRaw.explanation_simple || undefined,
      sevenDayGutPlan,
      digestiveSupport: safeStringArray(gutRaw.digestion_basics),
      gutCautions: safeStringArray(gutRaw.cautions).join(" ") || undefined,
      sleepPlan: safeStringArray(lifestyleRaw.sleep),
      stressPlan: safeStringArray(lifestyleRaw.stress),
      exerciseGuidance: safeStringArray(lifestyleRaw.exercise),
      sunlightGuidance: safeStringArray(lifestyleRaw.habits),
      dailyChecklist: combinedDailyChecklist,
      thisWeekFocus: healingRaw.this_week_focus || undefined,
      gutHealth: safeStringArray(gutRaw.digestion_basics),
      lifestyle: combinedLifestyle,
    },
    nutrition_plan: {
      priorities: safeStringArray(nutritionRaw.priorities),
      foods_to_focus: Array.isArray(nutritionRaw.foods_to_focus) ? nutritionRaw.foods_to_focus : [],
      foods_to_limit: Array.isArray(nutritionRaw.foods_to_limit) ? nutritionRaw.foods_to_limit : [],
      one_day_template: {
        breakfast: nutritionRaw?.one_day_template?.breakfast || "",
        lunch: nutritionRaw?.one_day_template?.lunch || "",
        dinner: nutritionRaw?.one_day_template?.dinner || "",
        snack: nutritionRaw?.one_day_template?.snack || "",
      },
      hydration: {
        target: nutritionRaw?.hydration?.target || "",
        tips: safeStringArray(nutritionRaw?.hydration?.tips),
      },
      optional_triggers_to_test: Array.isArray(nutritionRaw.optional_triggers_to_test)
        ? nutritionRaw.optional_triggers_to_test
        : [],
    },
    gut_health_plan: {
      explanation_simple: gutRaw.explanation_simple || "",
      seven_day_plan: Array.isArray(gutRaw.seven_day_plan) ? gutRaw.seven_day_plan : [],
      digestion_basics: safeStringArray(gutRaw.digestion_basics),
      cautions: safeStringArray(gutRaw.cautions),
    },
    lifestyle_plan: {
      sleep: safeStringArray(lifestyleRaw.sleep),
      stress: safeStringArray(lifestyleRaw.stress),
      exercise: safeStringArray(lifestyleRaw.exercise),
      habits: safeStringArray(lifestyleRaw.habits),
    },
    daily_plan: dailyPlan,
    safety_flags: {
      disclaimer: safetyRaw.disclaimer || "",
      red_flags: safeStringArray(safetyRaw.red_flags),
      if_this_gets_worse: safetyRaw.if_this_gets_worse || "",
    },
    skin_score: {
      overall: (record.skin_score as any)?.overall || 0,
      factors: (record.skin_score as any)?.factors || {},
    },
  };
};

export const latestAnalysisQueryKey = (userId?: string) => ["latest-analysis", userId];
export const allAnalysesQueryKey = (userId?: string) => ["all-analyses", userId];

const fetchLatestAnalysisForUser = async (userId: string): Promise<Analysis | null> => {
  const stateResult = await supabase
    .from("user_state" as any)
    .select("latest_analysis_id")
    .eq("user_id", userId)
    .maybeSingle();

  const stateData = stateResult.data as unknown as { latest_analysis_id: string | null } | null;

  let record: any = null;

  if (stateData?.latest_analysis_id) {
    const { data } = await supabase
      .from("analysis_records" as any)
      .select("*")
      .eq("id", stateData.latest_analysis_id)
      .eq("user_id", userId)
      .maybeSingle();

    record = data || null;
  }

  if (!record) {
    const { data, error } = await supabase
      .from("analysis_records" as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    record = data || null;

    if (record?.id) {
      await supabase
        .from("user_state" as any)
        .upsert({ user_id: userId, latest_analysis_id: record.id }, { onConflict: "user_id" });
    }
  }

  return record ? mapRecordToAnalysis(record) : null;
};

const fetchAllAnalysesForUser = async (userId: string): Promise<Analysis[]> => {
  const { data, error } = await supabase
    .from("analysis_records" as any)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRecordToAnalysis);
};

export const setLatestAnalysisId = async (userId: string, analysisId: string) => {
  return await supabase
    .from("user_state" as any)
    .upsert({ user_id: userId, latest_analysis_id: analysisId }, { onConflict: "user_id" });
};

export const useLatestAnalysis = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: latestAnalysisQueryKey(user?.id),
    queryFn: async () => {
      if (!user?.id) return null;
      return await fetchLatestAnalysisForUser(user.id);
    },
    enabled: !!user,
  });
};

export const useAllAnalyses = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: allAnalysesQueryKey(user?.id),
    queryFn: async () => {
      if (!user?.id) return [];
      return await fetchAllAnalysesForUser(user.id);
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
