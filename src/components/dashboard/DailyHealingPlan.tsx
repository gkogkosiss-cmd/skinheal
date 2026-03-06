import { Sun, Cloud, Moon } from "lucide-react";
import type { DailyPlan } from "@/hooks/useAnalysis";

const defaultPlan: DailyPlan = {
  morning: ["Gentle cleanser", "Apply moisturizer", "SPF 30+ sunscreen", "Drink a glass of water"],
  midday: ["Stay hydrated", "Eat vegetables at lunch", "Manage stress — take a short walk"],
  evening: ["Evening cleanse", "Apply any treatment", "Wind down 30 min before sleep"],
  weekly: [],
};

const TimeBlock = ({
  icon: Icon,
  label,
  items,
  colorClass,
}: {
  icon: React.ElementType;
  label: string;
  items: string[];
  colorClass: string;
}) => {
  if (!items.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${colorClass} flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <div className="space-y-1.5 pl-9">
        {items.map((item, i) => (
          <p key={i} className="text-sm text-foreground">{item}</p>
        ))}
      </div>
    </div>
  );
};

export const DailyHealingPlan = ({ plan }: { plan?: DailyPlan }) => {
  const p = plan && (plan.morning.length || plan.midday.length || plan.evening.length) ? plan : defaultPlan;

  return (
    <div className="card-elevated">
      <h3 className="font-serif text-xl mb-5">Today's Healing Plan</h3>
      <div className="space-y-5">
        <TimeBlock icon={Sun} label="Morning" items={p.morning} colorClass="bg-accent text-accent-foreground" />
        <TimeBlock icon={Cloud} label="Daytime" items={p.midday} colorClass="bg-secondary text-secondary-foreground" />
        <TimeBlock icon={Moon} label="Evening" items={p.evening} colorClass="bg-muted text-muted-foreground" />
      </div>
    </div>
  );
};
