import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useStreaks = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }

    const calculateStreak = async () => {
      // Get distinct dates where user completed at least one task, ordered desc
      const { data, error } = await supabase
        .from("daily_tasks" as any)
        .select("date, completed")
        .eq("user_id", user.id)
        .eq("completed", true)
        .order("date", { ascending: false });

      if (error || !data) { setLoading(false); return; }

      // Get unique dates
      const uniqueDates = [...new Set((data as any[]).map((d) => d.date))].sort().reverse();

      if (uniqueDates.length === 0) { setStreak(0); setLoading(false); return; }

      // Count consecutive days ending today or yesterday
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const firstDate = new Date(uniqueDates[0] + "T00:00:00");
      // Streak must include today or yesterday
      if (firstDate < yesterday) { setStreak(0); setLoading(false); return; }

      let count = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const current = new Date(uniqueDates[i - 1] + "T00:00:00");
        const prev = new Date(uniqueDates[i] + "T00:00:00");
        const diffDays = (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays === 1) {
          count++;
        } else {
          break;
        }
      }

      setStreak(count);
      setLoading(false);
    };

    calculateStreak();
  }, [user?.id]);

  return { streak, loading };
};
