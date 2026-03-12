import { Sun, Cloud, Moon, Calendar, CheckCircle2, Circle, Sparkles } from "lucide-react";
import { useDailyTasks, type DailyTask } from "@/hooks/useDailyTasks";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

const blockConfig = {
  morning: { icon: Sun, label: "Morning", colorClass: "bg-accent text-accent-foreground" },
  midday: { icon: Cloud, label: "Daytime", colorClass: "bg-secondary text-secondary-foreground" },
  evening: { icon: Moon, label: "Evening", colorClass: "bg-muted text-muted-foreground" },
  weekly: { icon: Calendar, label: "Weekly", colorClass: "bg-accent text-accent-foreground" },
} as const;

// Extract a "why it works" explanation from the task text
const parseTaskParts = (taskName: string): { action: string; why: string } => {
  // Try splitting on common explanation patterns
  const separators = [" — ", " - because ", " – ", " - this ", " - helps ", " because "];
  for (const sep of separators) {
    const idx = taskName.indexOf(sep);
    if (idx > 0) {
      return {
        action: taskName.slice(0, idx).trim(),
        why: taskName.slice(idx + sep.length).trim(),
      };
    }
  }

  // Try splitting on parenthetical explanation
  const parenMatch = taskName.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (parenMatch) {
    return { action: parenMatch[1].trim(), why: parenMatch[2].trim() };
  }

  // If task is long enough, try to generate a contextual "why"
  const lowerTask = taskName.toLowerCase();
  if (lowerTask.includes("water") || lowerTask.includes("hydrat")) {
    return { action: taskName, why: "Supports skin barrier hydration and toxin elimination" };
  }
  if (lowerTask.includes("sleep") || lowerTask.includes("bed")) {
    return { action: taskName, why: "Sleep is when skin repair and collagen synthesis peak" };
  }
  if (lowerTask.includes("spf") || lowerTask.includes("sunscreen")) {
    return { action: taskName, why: "UV exposure drives inflammation and post-inflammatory pigmentation" };
  }
  if (lowerTask.includes("probiotic") || lowerTask.includes("ferment") || lowerTask.includes("gut")) {
    return { action: taskName, why: "Restoring gut microbiome diversity reduces systemic skin inflammation" };
  }
  if (lowerTask.includes("zinc") || lowerTask.includes("supplement")) {
    return { action: taskName, why: "Targeted nutrient support accelerates skin barrier recovery" };
  }
  if (lowerTask.includes("cleanse") || lowerTask.includes("wash")) {
    return { action: taskName, why: "Gentle cleansing preserves the acid mantle and skin microbiome" };
  }
  if (lowerTask.includes("stress") || lowerTask.includes("breathe") || lowerTask.includes("meditat")) {
    return { action: taskName, why: "Lowering cortisol reduces androgen-driven sebum production" };
  }
  if (lowerTask.includes("sugar") || lowerTask.includes("dairy") || lowerTask.includes("avoid")) {
    return { action: taskName, why: "Reduces IGF-1 and mTORC1 pathway activation" };
  }
  if (lowerTask.includes("vegetable") || lowerTask.includes("fruit") || lowerTask.includes("salad")) {
    return { action: taskName, why: "Antioxidants neutralize free radicals that damage skin cells" };
  }

  return { action: taskName, why: "Part of your personalized healing protocol" };
};

const TaskItem = ({
  task,
  onToggle,
  priority,
}: {
  task: DailyTask;
  onToggle: () => void;
  priority: number;
}) => {
  const { action, why } = parseTaskParts(task.task_name);

  return (
    <button
      onClick={onToggle}
      className={`flex items-start gap-3 w-full text-left group py-2.5 px-3 rounded-xl transition-all duration-200
        ${task.completed ? "bg-primary/5 border border-primary/10" : "hover:bg-muted/50 border border-transparent"}`}
    >
      <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
        <span className={`text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center
          ${task.completed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          {priority}
        </span>
        <div className="relative">
          <Checkbox
            checked={task.completed}
            className={`h-5 w-5 rounded-md transition-all
              ${task.completed ? "border-primary" : "border-border group-hover:border-primary/50"}`}
            tabIndex={-1}
          />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm leading-snug block ${
            task.completed ? "line-through text-muted-foreground" : "text-foreground font-medium"
          }`}
        >
          {action}
        </span>
        <span className="text-xs text-muted-foreground/70 leading-tight block mt-0.5">
          {why}
        </span>
      </div>
      {task.completed && (
        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      )}
    </button>
  );
};

export const DailyHealingChecklist = () => {
  const { tasks, toggleTask, completedCount, totalCount, progressPercent } = useDailyTasks();

  if (totalCount === 0) return null;

  const grouped = tasks.reduce<Record<string, Array<DailyTask & { globalIndex: number }>>>((acc, t, i) => {
    (acc[t.time_block] = acc[t.time_block] || []).push({ ...t, globalIndex: i + 1 });
    return acc;
  }, {});

  return (
    <div className="card-elevated">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-serif text-xl">Your Daily Prescription</h3>
        </div>
        <span className="text-sm font-semibold text-primary">
          {completedCount}/{totalCount}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Ordered by highest impact. Complete as many as you can today.</p>

      <Progress value={progressPercent} className="h-2 mb-5" />

      <div className="space-y-5">
        {(["morning", "midday", "evening", "weekly"] as const).map((block) => {
          const items = grouped[block];
          if (!items?.length) return null;
          const config = blockConfig[block];
          const Icon = config.icon;

          return (
            <div key={block}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg ${config.colorClass} flex items-center justify-center`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {config.label}
                </span>
              </div>
              <div className="space-y-1 pl-2">
                {items.map((task) => (
                  <TaskItem
                    key={task.task_name}
                    task={task}
                    onToggle={() => toggleTask(task.task_name)}
                    priority={task.globalIndex}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
