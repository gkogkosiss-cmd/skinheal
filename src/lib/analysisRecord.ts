export const ANALYSIS_DISCLAIMER = "This is educational information, not medical advice. If symptoms are severe, spreading, painful, infected, or persistent, consult a dermatologist.";

export const RED_FLAG_ITEMS = [
  "fever",
  "pus or discharge",
  "severe swelling",
  "spreading rash",
  "eye involvement",
  "intense pain",
];

type Condition = {
  condition: string;
  probability: number;
  explanation: string;
};

type RootCause = {
  title: string;
  description: string;
};

type FoodItem = {
  food: string;
  reason: string;
};

type TriggerFood = {
  food: string;
  approach: string;
};

type SkinScoreFactor = {
  score: number;
  explanation: string;
};

type SkinScore = {
  overall: number;
  factors: {
    inflammation?: SkinScoreFactor;
    gut_health?: SkinScoreFactor;
    diet_quality?: SkinScoreFactor;
    lifestyle?: SkinScoreFactor;
    skin_barrier?: SkinScoreFactor;
  };
};

type AIHealingProtocol = {
  whatIsHappening?: string;
  morningRoutine?: string[];
  eveningRoutine?: string[];
  weeklyTreatments?: string[];
  triggersToAvoid?: string[];
  safetyGuidance?: string;
  timeline?: string;
  foodPriorities?: string[];
  foodsToEat?: FoodItem[];
  foodsToAvoid?: FoodItem[];
  mealTemplate?: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
    snack?: string;
  };
  sevenDayMealPlan?: Array<{ day: string; breakfast: string; lunch: string; dinner: string; snack: string }>;
  mealPlanPrinciples?: string[];
  commonTriggerFoods?: TriggerFood[];
  hydrationGuidance?: string;
  gutExplanation?: string;
  sevenDayGutPlan?: Array<{ day: string; focus: string }>;
  digestiveSupport?: string[];
  gutCautions?: string;
  sleepPlan?: string[];
  stressPlan?: string[];
  exerciseGuidance?: string[];
  sunlightGuidance?: string[];
  dailyChecklist?: string[];
  thisWeekFocus?: string;
};

export type AnalysisResultInput = {
  visualFeatures?: string[];
  conditions?: Condition[];
  rootCauses?: RootCause[];
  biologicalExplanation?: string;
  healingProtocol?: AIHealingProtocol;
  skinScore?: SkinScore;
};

const safeArray = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

const splitDailyPlan = (items: string[]) => {
  const morning: string[] = [];
  const midday: string[] = [];
  const evening: string[] = [];
  const weekly: string[] = [];

  items.forEach((item) => {
    const text = item.toLowerCase();
    if (text.includes("week") || text.includes("2-3") || text.includes("times")) {
      weekly.push(item);
    } else if (text.includes("evening") || text.includes("night") || text.includes("sleep") || text.includes("wind down")) {
      evening.push(item);
    } else if (text.includes("morning") || text.includes("spf") || text.includes("cleanse")) {
      morning.push(item);
    } else {
      midday.push(item);
    }
  });

  return { morning, midday, evening, weekly };
};

const toTimelineObject = (timeline?: string) => {
  const raw = timeline || "";
  if (!raw) {
    return {
      week1: "Many people notice early changes within 7-14 days.",
      weeks2to4: "Consistency often brings clearer improvements in 2-4 weeks.",
      weeks6to12: "Longer-term stability commonly takes 6-12 weeks.",
    };
  }
  return {
    week1: "Many people notice early changes within 7-14 days.",
    weeks2to4: "Steadier improvements often appear over weeks 2-4.",
    weeks6to12: "More durable recovery commonly takes 6-12 weeks of consistency.",
    raw,
  };
};

const normalizeSkinScore = (skinScore?: SkinScore) => {
  if (!skinScore || typeof skinScore.overall !== "number") {
    return { overall: 0, factors: {} };
  }
  return {
    overall: Math.max(0, Math.min(100, skinScore.overall)),
    factors: Object.fromEntries(
      Object.entries(skinScore.factors || {}).map(([key, val]) => [
        key,
        {
          score: Math.max(0, Math.min(100, val?.score || 0)),
          explanation: val?.explanation || "",
        },
      ])
    ),
  };
};

export const normalizeAnalysisRecordPayload = ({
  analysis,
  answers,
  visualFeatures,
}: {
  analysis: AnalysisResultInput;
  answers: Record<string, string>;
  visualFeatures: string[];
}) => {
  const protocol = analysis.healingProtocol || {};
  const imageObservations = safeArray(analysis.visualFeatures).length ? safeArray(analysis.visualFeatures) : safeArray(visualFeatures);

  const morningRoutine = safeArray(protocol.morningRoutine);
  const eveningRoutine = safeArray(protocol.eveningRoutine);
  const weeklyTreatments = safeArray(protocol.weeklyTreatments);
  const checklist = safeArray(protocol.dailyChecklist);
  const splitPlan = splitDailyPlan(checklist);

  return {
    image_observations: imageObservations,
    answers,
    results: Array.isArray(analysis.conditions) ? analysis.conditions : [],
    root_causes: Array.isArray(analysis.rootCauses) ? analysis.rootCauses : [],
    skin_score: normalizeSkinScore(analysis.skinScore),
    healing_protocol: {
      what_is_happening: protocol.whatIsHappening || analysis.biologicalExplanation || "",
      morning: [{ title: "Morning routine", steps: morningRoutine }],
      evening: [{ title: "Evening routine", steps: eveningRoutine }],
      weekly: [{ title: "Weekly support", steps: weeklyTreatments }],
      avoid: safeArray(protocol.triggersToAvoid),
      timeline: toTimelineObject(protocol.timeline),
      safety_guidance: protocol.safetyGuidance || "",
      this_week_focus: protocol.thisWeekFocus || "",
    },
    nutrition_plan: {
      priorities: safeArray(protocol.foodPriorities),
      foods_to_focus: Array.isArray(protocol.foodsToEat)
        ? protocol.foodsToEat.map((item) => ({ food: item.food, why: item.reason }))
        : [],
      foods_to_limit: Array.isArray(protocol.foodsToAvoid)
        ? protocol.foodsToAvoid.map((item) => ({ food: item.food, why: item.reason }))
        : [],
      one_day_template: {
        breakfast: protocol.mealTemplate?.breakfast || "",
        lunch: protocol.mealTemplate?.lunch || "",
        dinner: protocol.mealTemplate?.dinner || "",
        snack: protocol.mealTemplate?.snack || "",
      },
      seven_day_meal_plan: Array.isArray(protocol.sevenDayMealPlan) ? protocol.sevenDayMealPlan : [],
      meal_plan_principles: safeArray(protocol.mealPlanPrinciples),
      hydration: {
        target: protocol.hydrationGuidance || "",
        tips: [],
      },
      optional_triggers_to_test: Array.isArray(protocol.commonTriggerFoods)
        ? protocol.commonTriggerFoods.map((item) => ({ trigger: item.food, how_to_test_safely: item.approach }))
        : [],
    },
    gut_health_plan: {
      explanation_simple: protocol.gutExplanation || "",
      seven_day_plan: Array.isArray(protocol.sevenDayGutPlan)
        ? protocol.sevenDayGutPlan.map((item) => ({ day: item.day, actions: [item.focus] }))
        : [],
      digestion_basics: safeArray(protocol.digestiveSupport),
      cautions: protocol.gutCautions ? [protocol.gutCautions] : [],
    },
    lifestyle_plan: {
      sleep: safeArray(protocol.sleepPlan),
      stress: safeArray(protocol.stressPlan),
      exercise: safeArray(protocol.exerciseGuidance),
      habits: safeArray(protocol.sunlightGuidance),
    },
    daily_plan: {
      morning: splitPlan.morning.length ? splitPlan.morning : morningRoutine.slice(0, 4),
      midday: splitPlan.midday,
      evening: splitPlan.evening.length ? splitPlan.evening : eveningRoutine.slice(0, 4),
      weekly: splitPlan.weekly.length ? splitPlan.weekly : weeklyTreatments.slice(0, 4),
    },
    safety_flags: {
      disclaimer: ANALYSIS_DISCLAIMER,
      red_flags: RED_FLAG_ITEMS,
      if_this_gets_worse: protocol.safetyGuidance || "",
    },
  };
};
