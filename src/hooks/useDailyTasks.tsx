import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCurrentAnalysis } from "./useCurrentAnalysis";

export interface DailyTask {
  task_name: string;
  completed: boolean;
  time_block: "morning" | "midday" | "evening" | "weekly";
}

const todayStr = () => new Date().toISOString().split("T")[0];

export const useDailyTasks = () => {
  const { user } = useAuth();
  const { currentAnalysis } = useCurrentAnalysis();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);

  const analysisId = currentAnalysis?.id;
  const dailyPlan = currentAnalysis?.daily_plan;

  // Build task list from daily plan
  const buildTaskList = useCallback((): DailyTask[] => {
    if (!dailyPlan) return [];
    const list: DailyTask[] = [];
    const blocks: Array<{ key: keyof typeof dailyPlan; label: DailyTask["time_block"] }> = [
      { key: "morning", label: "morning" },
      { key: "midday", label: "midday" },
      { key: "evening", label: "evening" },
      { key: "weekly", label: "weekly" },
    ];
    for (const block of blocks) {
      const items = dailyPlan[block.key];
      if (Array.isArray(items)) {
        for (const item of items) {
          if (typeof item === "string" && item.trim()) {
            list.push({ task_name: item, completed: false, time_block: block.label });
          }
        }
      }
    }
    return list;
  }, [dailyPlan]);

  // Fetch today's completion status
  const fetchTasks = useCallback(async () => {
    if (!user?.id || !analysisId) {
      setTasks(buildTaskList());
      setLoading(false);
      return;
    }

    const planTasks = buildTaskList();
    const today = todayStr();

    const { data } = await supabase
      .from("daily_tasks" as any)
      .select("task_name, completed")
      .eq("user_id", user.id)
      .eq("analysis_id", analysisId)
      .eq("date", today);

    const completedMap = new Map<string, boolean>();
    if (data) {
      for (const row of data as any[]) {
        completedMap.set(row.task_name, row.completed);
      }
    }

    setTasks(
      planTasks.map((t) => ({
        ...t,
        completed: completedMap.get(t.task_name) ?? false,
      }))
    );
    setLoading(false);
  }, [user?.id, analysisId, buildTaskList]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const toggleTask = async (taskName: string) => {
    if (!user?.id || !analysisId) return;

    const today = todayStr();
    const current = tasks.find((t) => t.task_name === taskName);
    const newCompleted = !(current?.completed ?? false);

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.task_name === taskName ? { ...t, completed: newCompleted } : t))
    );

    await supabase
      .from("daily_tasks" as any)
      .upsert(
        {
          user_id: user.id,
          analysis_id: analysisId,
          task_name: taskName,
          completed: newCompleted,
          date: today,
        } as any,
        { onConflict: "user_id,analysis_id,task_name,date" }
      );
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return { tasks, loading, toggleTask, completedCount, totalCount, progressPercent };
};
