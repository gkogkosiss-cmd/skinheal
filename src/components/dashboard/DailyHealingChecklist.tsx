import { Sun, Cloud, Moon, Calendar, CheckCircle2, Circle } from "lucide-react";
import { useDailyTasks, type DailyTask } from "@/hooks/useDailyTasks";
import { Progress } from "@/components/ui/progress";

const blockConfig = {
  morning: { icon: Sun, label: "Morning", colorClass: "bg-accent text-accent-foreground" },
  midday: { icon: Cloud, label: "Daytime", colorClass: "bg-secondary text-secondary-foreground" },
  evening: { icon: Moon, label: "Evening", colorClass: "bg-muted text-muted-foreground" },
  weekly: { icon: Calendar, label: "Weekly", colorClass: "bg-accent text-accent-foreground" },
} as const;

const TaskItem = ({ task, onToggle }: { task: DailyTask; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className="flex items-center gap-3 w-full text-left group py-1"
  >
    {task.completed ? (
      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
    ) : (
      <Circle className="w-5 h-5 text-border group-hover:text-primary/50 transition-colors shrink-0" />
    )}
    <span className={`text-sm ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
      {task.task_name}
    </span>
  </button>
);

export const DailyHealingChecklist = () => {
  const { tasks, toggleTask, completedCount, totalCount, progressPercent } = useDailyTasks();

  if (totalCount === 0) return null;

  const grouped = tasks.reduce<Record<string, DailyTask[]>>((acc, t) => {
    (acc[t.time_block] = acc[t.time_block] || []).push(t);
    return acc;
  }, {});

  return (
    <div className="card-elevated">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-serif text-xl">Daily Healing Checklist</h3>
        <span className="text-sm font-medium text-primary">
          {completedCount} / {totalCount}
        </span>
      </div>

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
              <div className="space-y-1 pl-9">
                {items.map((task) => (
                  <TaskItem
                    key={task.task_name}
                    task={task}
                    onToggle={() => toggleTask(task.task_name)}
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
