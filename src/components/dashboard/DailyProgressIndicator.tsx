import { CheckCircle2, Flame } from "lucide-react";
import { useDailyTasks } from "@/hooks/useDailyTasks";
import { useStreaks } from "@/hooks/useStreaks";
import { Progress } from "@/components/ui/progress";

export const DailyProgressIndicator = () => {
  const { completedCount, totalCount, progressPercent } = useDailyTasks();
  const { streak } = useStreaks();

  if (totalCount === 0) return null;

  return (
    <div className="card-elevated gradient-sage">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Daily Healing Progress</p>
          <p className="text-xs text-muted-foreground">
            {completedCount} / {totalCount} tasks completed today
          </p>
        </div>
        {streak >= 2 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10">
            <Flame className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">{streak}-day streak</span>
          </div>
        )}
      </div>
      <Progress value={progressPercent} className="h-2" />
    </div>
  );
};
