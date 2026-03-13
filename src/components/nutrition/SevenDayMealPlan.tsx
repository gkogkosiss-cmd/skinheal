import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { type MealPlanDay, type MealDetail } from "@/hooks/useAnalysis";

const mealIcons: Record<string, string> = {
  Breakfast: "🌅",
  Lunch: "☀️",
  Dinner: "🌙",
  Snack: "🍎",
};

/** Check if a meal value is the new structured format */
const isStructured = (meal: string | MealDetail | undefined): meal is MealDetail =>
  typeof meal === "object" && meal !== null && "name" in meal;

/** For legacy string meals, extract a name */
const legacyParseName = (meal: string): string => {
  const separators = [" with ", " — ", ": "];
  for (const sep of separators) {
    const idx = meal.toLowerCase().indexOf(sep.toLowerCase());
    if (idx > 0) return meal.slice(0, idx).trim();
  }
  return meal.length > 35 ? meal.slice(0, 35) + "…" : meal;
};

/** Generate preview text for collapsed day card */
const getDayPreview = (day: MealPlanDay): string => {
  const meals = [day.breakfast, day.lunch, day.dinner].filter(Boolean);
  return meals
    .map((m) => {
      if (isStructured(m)) return m.name;
      if (typeof m === "string") return legacyParseName(m);
      return "";
    })
    .filter(Boolean)
    .map((n) => (n.length > 22 ? n.slice(0, 22) + "…" : n))
    .join(" · ");
};

const IngredientRow = ({ name, amount, benefit }: { name: string; amount: string; benefit: string }) => (
  <div className="py-2.5 first:pt-0">
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="font-semibold text-sm text-foreground">{name}</span>
      {amount && (
        <span className="text-xs text-muted-foreground/70">· {amount}</span>
      )}
    </div>
    {benefit && (
      <p className="text-[11px] italic leading-relaxed mt-0.5" style={{ color: "#528164" }}>
        {benefit}
      </p>
    )}
  </div>
);

const MealSection = ({ type, value }: { type: string; value?: string | MealDetail }) => {
  if (!value) return null;
  const icon = mealIcons[type] || "🍽️";

  if (isStructured(value)) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{icon}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#528164" }}>
            {type}
          </span>
        </div>
        <div className="pl-7">
          <p className="font-semibold text-sm text-foreground">{value.name}</p>
          {value.description && (
            <p className="text-xs italic text-muted-foreground mt-0.5">{value.description}</p>
          )}
          {value.ingredients.length > 0 && (
            <div className="mt-3 divide-y divide-border/50">
              {value.ingredients.map((ing, i) => (
                <IngredientRow key={i} name={ing.name} amount={ing.amount} benefit={ing.benefit} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Legacy string format fallback
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#528164" }}>
          {type}
        </span>
      </div>
      <p className="text-sm text-foreground pl-7">{value}</p>
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
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(82, 129, 100, 0.1)" }}>
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
        <div className="p-4 rounded-xl border" style={{ backgroundColor: "rgba(82, 129, 100, 0.04)", borderColor: "rgba(82, 129, 100, 0.1)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#528164" }}>
            Key Principles
          </p>
          <ul className="space-y-1.5">
            {principles.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                <span className="shrink-0 mt-px" style={{ color: "#528164" }}>•</span>
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
              className={`rounded-2xl bg-card overflow-hidden transition-all duration-300 ${
                isExpanded
                  ? "border-t border-r border-b border-border"
                  : "border border-border"
              }`}
              style={{
                boxShadow: "0 1px 8px -2px hsl(30 10% 15% / 0.05)",
                borderLeftWidth: isExpanded ? "3px" : undefined,
                borderLeftColor: isExpanded ? "#528164" : undefined,
              }}
            >
              <button
                onClick={() => setExpandedDay(isExpanded ? null : i)}
                className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-muted/20 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: "rgba(82, 129, 100, 0.1)", color: "#528164" }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <span className="font-medium text-sm block">{dayLabel}</span>
                    {!isExpanded && preview && (
                      <span className="text-[11px] text-muted-foreground block truncate mt-0.5 max-w-[240px] sm:max-w-[400px]">
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
                    <div className="px-4 sm:px-5 pb-5 space-y-6">
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
