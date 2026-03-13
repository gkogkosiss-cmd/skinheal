import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { type MealPlanDay } from "@/hooks/useAnalysis";

const mealIcons: Record<string, string> = {
  Breakfast: "🌅",
  Lunch: "☀️",
  Dinner: "🌙",
  Snack: "🍎",
};

/** Extract a short meal name and ingredient tags from a meal string */
const parseMeal = (meal: string | undefined): { name: string; ingredients: string[] } => {
  if (!meal) return { name: "", ingredients: [] };

  // Try to split on " with " or " — " or ": " to get name vs ingredients
  const separators = [" with ", " — ", ": ", " - topped with ", " topped with "];
  let name = meal;
  let rest = "";

  for (const sep of separators) {
    const idx = meal.toLowerCase().indexOf(sep.toLowerCase());
    if (idx > 0) {
      name = meal.slice(0, idx).trim();
      rest = meal.slice(idx + sep.length).trim();
      break;
    }
  }

  // Parse ingredients from the rest, or from the full string if no separator found
  const ingredientSource = rest || meal;
  const ingredients = ingredientSource
    .split(/[,;]|\band\b/gi)
    .map((s) => s.trim().replace(/^(with|on|in|over|served)\s+/i, ""))
    .filter((s) => s.length > 1 && s.length < 40)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));

  // If name equals the full meal and we got ingredients, use first ingredient-ish as name
  if (name === meal && ingredients.length > 1) {
    name = ingredients[0];
    return { name, ingredients: ingredients.slice(1) };
  }

  return { name, ingredients: rest ? ingredients : [] };
};

/** Generate a short preview string from a day's meals */
const getDayPreview = (day: MealPlanDay): string => {
  const meals = [day.breakfast, day.lunch, day.dinner].filter(Boolean);
  const names = meals.map((m) => {
    const { name } = parseMeal(m);
    // Truncate long names
    return name.length > 20 ? name.slice(0, 20) + "…" : name;
  });
  return names.join(" · ");
};

const IngredientPill = ({ label }: { label: string }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#528164]/10 text-[#528164] whitespace-nowrap">
    {label}
  </span>
);

const MealSection = ({ type, value }: { type: string; value?: string }) => {
  if (!value) return null;
  const { name, ingredients } = parseMeal(value);
  const icon = mealIcons[type] || "🍽️";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#528164]">
          {type}
        </span>
      </div>
      <p className="font-medium text-sm text-foreground pl-7">{name}</p>
      {ingredients.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-7">
          {ingredients.map((ing, i) => (
            <IngredientPill key={i} label={ing} />
          ))}
        </div>
      )}
    </div>
  );
};

interface Props {
  mealPlan: MealPlanDay[];
  principles?: string[];
}

export const SevenDayMealPlan = ({ mealPlan, principles }: Props) => {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  if (!mealPlan.length) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#528164]/10 flex items-center justify-center">
          <span className="text-lg">📅</span>
        </div>
        <div>
          <h2 className="font-serif text-xl">7-Day Meal Plan</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Anti-inflammatory meals tailored to your skin
          </p>
        </div>
      </div>

      {/* Principles */}
      {principles && principles.length > 0 && (
        <div className="p-4 rounded-xl bg-[#528164]/5 border border-[#528164]/10">
          <p className="text-[11px] font-semibold text-[#528164] uppercase tracking-wider mb-2">
            Key Principles
          </p>
          <ul className="space-y-1.5">
            {principles.map((p, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed"
              >
                <span className="text-[#528164] shrink-0 mt-px">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Day Cards */}
      <div className="space-y-2.5">
        {mealPlan.map((day, i) => {
          const isExpanded = expandedDay === i;
          const dayLabel = day.day || `Day ${i + 1}`;
          const preview = getDayPreview(day);

          return (
            <div
              key={i}
              className={`rounded-2xl bg-card shadow-[0_1px_8px_-2px_hsl(30_10%_15%/0.06)] overflow-hidden transition-all duration-300 ${
                isExpanded
                  ? "border-l-[3px] border-l-[#528164] border-t border-r border-b border-border"
                  : "border border-border"
              }`}
            >
              <button
                onClick={() => setExpandedDay(isExpanded ? null : i)}
                className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-muted/20 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-[#528164]/10 flex items-center justify-center text-xs font-bold text-[#528164] shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <span className="font-medium text-sm block">{dayLabel}</span>
                    {!isExpanded && preview && (
                      <span className="text-[11px] text-muted-foreground block truncate mt-0.5 max-w-[260px] sm:max-w-[400px]">
                        {preview}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-300 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 sm:px-5 pb-5 space-y-5">
                      <div className="h-px bg-border" />
                      <MealSection type="Breakfast" value={day.breakfast} />
                      <MealSection type="Lunch" value={day.lunch} />
                      <MealSection type="Dinner" value={day.dinner} />
                      <MealSection type="Snack" value={day.snack} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
