import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Check, X, Leaf, ArrowRight, AlertCircle, Droplets, Target, Utensils, FlaskConical, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { useCurrentAnalysis } from "@/hooks/useCurrentAnalysis";
import { type FoodItem, type MealPlanDay } from "@/hooks/useAnalysis";
import { PremiumGate } from "@/components/premium/PremiumGate";

const defaultGoodFoods: FoodItem[] = [
  { food: "Fatty Fish (salmon, sardines, mackerel)", reason: "Rich in omega-3s which often help reduce skin inflammation" },
  { food: "Berries (blueberries, strawberries)", reason: "Packed with antioxidants that may protect against oxidative skin damage" },
  { food: "Leafy Greens (spinach, kale)", reason: "High in vitamins A, C, K — commonly linked to skin cell repair" },
  { food: "Fermented Foods (kimchi, sauerkraut, kefir)", reason: "Provide beneficial bacteria that many people find supports gut-skin health" },
  { food: "Sweet Potatoes", reason: "Beta-carotene converts to vitamin A, which often supports skin cell renewal" },
  { food: "Avocado", reason: "Healthy fats and vitamin E that may help protect against oxidative damage" },
  { food: "Nuts and Seeds (walnuts, flax, chia)", reason: "Good source of omega-3s, zinc, and vitamin E" },
];

const defaultBadFoods: FoodItem[] = [
  { food: "Refined Sugar", reason: "Commonly linked to increased inflammation and sebum production in many people" },
  { food: "Ultra-Processed Foods", reason: "Often contain additives that may disrupt gut health and increase inflammation" },
  { food: "Excessive Dairy", reason: "Some people notice their skin reacts to dairy — worth testing if you suspect it" },
  { food: "High Glycemic Carbs (white bread, pastries)", reason: "May rapidly elevate blood sugar, which is often linked to inflammatory responses" },
  { food: "Alcohol", reason: "Can deplete zinc, disrupt sleep, and increase inflammation for many people" },
];

/** Splits a meal string like "Greek yogurt with berries and chia seeds" into bullet items */
const parseMealItems = (meal: string | undefined): string[] => {
  if (!meal) return [];
  // Split on common delimiters: commas, "and", "with", semicolons — but keep it readable
  const items = meal
    .split(/[,;]|\band\b/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
  // If we couldn't split meaningfully, return as single item
  return items.length > 0 ? items : [meal];
};

const skinBenefitMap: Record<string, string> = {
  Breakfast: "Morning nutrients prime your skin barrier and reduce overnight inflammation buildup.",
  Lunch: "Midday anti-inflammatory compounds help calm active skin flare-ups.",
  Dinner: "Evening nutrients support overnight skin repair and collagen synthesis.",
  Snack: "Antioxidant-rich snacks help neutralize free radicals that accelerate skin aging.",
};

const MealCard = ({ label, value, icon }: { label: string; value?: string; icon?: string }) => {
  if (!value) return null;
  const items = parseMealItems(value);
  return (
    <div className="p-3.5 rounded-xl bg-muted/40 space-y-2">
      <p className="text-[11px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
        {icon && <span>{icon}</span>}
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
            <span className="text-primary/60 mt-px shrink-0">•</span>
            <span className="break-words min-w-0">{item}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] leading-snug pl-1 flex items-start gap-1" style={{ color: "#528164" }}>
        <span className="shrink-0 mt-px">🌿</span>
        <span className="italic">Skin benefit: {skinBenefitMap[label] || "Supports overall skin healing through anti-inflammatory nutrition."}</span>
      </p>
    </div>
  );
};

const mealIcons: Record<string, string> = {
  Breakfast: "🌅",
  Lunch: "☀️",
  Dinner: "🌙",
  Snack: "🍎",
};

const Nutrition = () => {
  const { currentAnalysis: analysis } = useCurrentAnalysis();
  const protocol = analysis?.healing_protocol;
  const nutritionPlan = analysis?.nutrition_plan;
  const hasAnalysis = !!analysis;
  const [expandedDay, setExpandedDay] = useState<number | null>(0);

  const goodFoods = protocol?.foodsToEat?.length ? protocol.foodsToEat : defaultGoodFoods;
  const badFoods = protocol?.foodsToAvoid?.length ? protocol.foodsToAvoid : defaultBadFoods;
  const foodPriorities = protocol?.foodPriorities || [];
  const mealTemplate = protocol?.mealTemplate;
  const triggerFoods = protocol?.commonTriggerFoods || [];
  const hydration = protocol?.hydrationGuidance;
  const sevenDayMealPlan = nutritionPlan?.seven_day_meal_plan || protocol?.sevenDayMealPlan || [];
  const mealPlanPrinciples = nutritionPlan?.meal_plan_principles || protocol?.mealPlanPrinciples || [];

  return (
    <Layout>
      <PremiumGate featureName="Nutrition Plans">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-sm text-primary font-medium mb-1">Nutrition</p>
        <h1 className="font-serif text-3xl md:text-4xl mb-2">Food as Medicine</h1>
        <p className="text-muted-foreground mb-8">
          {hasAnalysis ? "Personalized dietary guidance based on your skin analysis." : "What you eat directly influences inflammation, hormones, and skin healing."}
        </p>

        {!hasAnalysis && (
          <div className="card-elevated gradient-sage mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl mb-1">Get personalized nutrition advice</h2>
                <p className="text-sm text-muted-foreground">Complete a skin analysis to receive foods tailored to your condition.</p>
              </div>
              <Link to="/analysis" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0">
                Start Analysis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Food Priorities */}
          {foodPriorities.length > 0 && (
            <div className="card-elevated gradient-sage">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-serif text-xl">Food Priorities for Your Case</h2>
              </div>
              <div className="space-y-3">
                {foodPriorities.map((rule: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-muted-foreground break-words min-w-0">{rule}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7-Day Meal Plan — Premium Card Layout */}
          {sevenDayMealPlan.length > 0 && (
            <div className="card-elevated">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-serif text-xl">7-Day Meal Plan</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Anti-inflammatory meals tailored to your skin</p>
                </div>
              </div>

              {/* Principles */}
              {mealPlanPrinciples.length > 0 && (
                <div className="p-3.5 rounded-xl bg-accent/40 mb-5 mt-4">
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-2">Key Principles</p>
                  <ul className="space-y-1.5">
                    {mealPlanPrinciples.map((p: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                        <span className="text-primary shrink-0 mt-px">•</span>
                        <span className="break-words min-w-0">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                {sevenDayMealPlan.map((day: MealPlanDay, i: number) => {
                  const isExpanded = expandedDay === i;
                  const dayLabel = day.day || `Day ${i + 1}`;
                  return (
                    <div key={i} className="rounded-xl border border-border overflow-hidden">
                      <button
                        onClick={() => setExpandedDay(isExpanded ? null : i)}
                        className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-medium text-sm">{dayLabel}</span>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="px-3.5 sm:px-4 pb-4"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {[
                              { label: "Breakfast", value: day.breakfast },
                              { label: "Lunch", value: day.lunch },
                              { label: "Dinner", value: day.dinner },
                              { label: "Snack", value: day.snack },
                            ].map((meal) => (
                              <MealCard key={meal.label} label={meal.label} value={meal.value} icon={mealIcons[meal.label]} />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Foods to Eat */}
          <div className="card-elevated">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Leaf className="w-5 h-5 text-accent-foreground" />
              </div>
              <h2 className="font-serif text-xl">Foods to Lean On</h2>
            </div>
            <div className="space-y-4">
              {goodFoods.map((f: FoodItem, i: number) => (
                <motion.div key={f.food} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm break-words">{f.food}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">{f.reason}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Foods to Avoid */}
          <div className="card-elevated">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <X className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="font-serif text-xl">Foods to Limit for Now</h2>
            </div>
            <div className="space-y-4">
              {badFoods.map((f: FoodItem, i: number) => (
                <motion.div key={f.food} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                    <X className="w-3.5 h-3.5 text-destructive" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm break-words">{f.food}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">{f.reason}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Meal Template (single day fallback) */}
          {mealTemplate && !sevenDayMealPlan.length && (
            <div className="card-elevated">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-accent-foreground" />
                </div>
                <h2 className="font-serif text-xl">Example Day of Eating</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Breakfast", value: mealTemplate.breakfast },
                  { label: "Lunch", value: mealTemplate.lunch },
                  { label: "Dinner", value: mealTemplate.dinner },
                  { label: "Snack", value: mealTemplate.snack },
                ].map((meal) => (
                  <MealCard key={meal.label} label={meal.label} value={meal.value} icon={mealIcons[meal.label]} />
                ))}
              </div>
            </div>
          )}

          {/* Hydration */}
          {hydration && (
            <div className="card-elevated gradient-warm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-secondary-foreground" />
                </div>
                <h2 className="font-serif text-xl">Hydration</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed break-words">{hydration}</p>
            </div>
          )}

          {/* Common Trigger Foods to Test */}
          {triggerFoods.length > 0 && (
            <div className="card-elevated">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-secondary-foreground" />
                </div>
                <h2 className="font-serif text-xl">Common Triggers to Test</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Remove one at a time for 2–3 weeks, then reintroduce slowly.</p>
              <div className="space-y-3">
                {triggerFoods.map((t: any, i: number) => (
                  <div key={i} className="p-3.5 rounded-xl bg-muted/40">
                    <p className="font-medium text-sm mb-1 break-words">{t.food}</p>
                    <p className="text-xs text-muted-foreground break-words">{t.approach}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>This is educational information, not medical advice. If symptoms are severe, spreading, painful, infected, or persistent, consult a dermatologist.</p>
          </div>
        </div>
      </motion.div>
      </PremiumGate>
    </Layout>
  );
};

export default Nutrition;
