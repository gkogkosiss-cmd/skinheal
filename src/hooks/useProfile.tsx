import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  profile_photo_url: string | null;
  age_range: string | null;
  skin_concern: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPrefs {
  user_id: string;
  weekly_check_reminder: boolean;
  daily_plan_reminder: boolean;
  meal_reminder: boolean;
}

export const useProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Create profile if missing (for existing users)
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles" as any)
          .insert({ user_id: user!.id, name: user!.email?.split("@")[0] } as any)
          .select()
          .single();
        if (insertError) throw insertError;
        return newProfile as unknown as Profile;
      }
      return data as unknown as Profile;
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Pick<Profile, "name" | "age_range" | "skin_concern" | "profile_photo_url">>) => {
      const { error } = await supabase
        .from("profiles" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile", user?.id] }),
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_notifications" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        const { data: newPrefs, error: insertError } = await supabase
          .from("user_notifications" as any)
          .insert({ user_id: user!.id } as any)
          .select()
          .single();
        if (insertError) throw insertError;
        return newPrefs as unknown as NotificationPrefs;
      }
      return data as unknown as NotificationPrefs;
    },
  });

  const updateNotifications = useMutation({
    mutationFn: async (updates: Partial<Pick<NotificationPrefs, "weekly_check_reminder" | "daily_plan_reminder" | "meal_reminder">>) => {
      const { error } = await supabase
        .from("user_notifications" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const deleteAccount = async () => {
    if (!user) return;
    // Delete all user data in order
    const tables = ["ai_coach_messages", "daily_tasks", "progress_photos", "user_feedback", "user_state", "analysis_records", "analyses", "user_notifications", "profiles"] as const;
    for (const table of tables) {
      await supabase.from(table as any).delete().eq("user_id", user.id);
    }
    // Sign out (actual auth user deletion requires admin API, user is informed)
    await supabase.auth.signOut();
  };

  return {
    profile: profileQuery.data ?? null,
    isLoadingProfile: profileQuery.isLoading,
    updateProfile,
    notifications: notificationsQuery.data ?? null,
    isLoadingNotifications: notificationsQuery.isLoading,
    updateNotifications,
    deleteAccount,
  };
};
