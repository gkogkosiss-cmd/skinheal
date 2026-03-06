import { CheckCircle2 } from "lucide-react";
import { useDailyTasks } from "@/hooks/useDailyTasks";
import { Progress } from "@/components/ui/progress";

export const DailyProgressIndicator = () => {
  const { completedCount, totalCount, progressPercent } = useDailyTasks();

  if (totalCount === 0) return null;

  return (
    <div className="card-elevated gradient-sage">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">Daily Healing Progress</p>
          <p className="text-xs text-muted-foreground">
            {completedCount} / {totalCount} tasks completed today
          </p>
        </div>
      </div>
      <Progress value={progressPercent} className="h-2" />
    </div>
  );
};
