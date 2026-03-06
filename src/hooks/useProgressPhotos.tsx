import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCurrentAnalysis } from "./useCurrentAnalysis";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface ProgressChange {
  area: string;
  status: "improved" | "similar" | "worsened";
  note: string;
}

export interface ProgressPhoto {
  id: string;
  user_id: string;
  analysis_id: string | null;
  photo_url: string;
  date_uploaded: string;
  progress_summary: {
    changes?: ProgressChange[];
    summary?: string;
    scoreAdjustment?: number;
    encouragement?: string;
    confidence?: string;
    progressAnswers?: Record<string, string>;
  };
  score_estimate: number | null;
  created_at: string;
}

export const progressPhotosQueryKey = (userId?: string) => ["progress-photos", userId];

export const useProgressPhotos = () => {
  const { user } = useAuth();
  const { currentAnalysis } = useCurrentAnalysis();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const query = useQuery({
    queryKey: progressPhotosQueryKey(user?.id),
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("progress_photos" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("date_uploaded", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ProgressPhoto[];
    },
    enabled: !!user,
  });

  const uploadProgressPhoto = useCallback(async (files: File | File[], progressAnswers?: Record<string, string>, bodyArea?: string) => {
    if (!user) throw new Error("Must be logged in");
    setUploading(true);
    const detectedBodyArea = bodyArea || "face";

    try {
      const fileArray = Array.isArray(files) ? files : [files];

      // Upload all photos to storage
      const uploadedPaths: string[] = [];
      for (const file of fileArray) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/progress/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("skin-photos")
          .upload(path, file);
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
      }

      // Convert all files to base64 for AI comparison
      const base64Images: string[] = [];
      for (const file of fileArray) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      base64Images.push(base64);
      }

      // Get previous score — from latest progress photo or from current analysis
      const photos = query.data || [];
      const latestProgressScore = photos.length > 0 ? photos[0].score_estimate : null;
      const baselineScore = currentAnalysis?.skin_score?.overall || 50;
      const previousScore = latestProgressScore ?? baselineScore;

      // Fetch previous photo for visual comparison
      let previousImageBase64: string | null = null;
      const previousPhotoUrl = photos.length > 0 ? photos[0].photo_url : currentAnalysis?.photo_url;
      if (previousPhotoUrl) {
        try {
          const { data: prevData } = await supabase.storage
            .from("skin-photos")
            .download(previousPhotoUrl);
          if (prevData) {
            const arrayBuf = await prevData.arrayBuffer();
            const bytes = new Uint8Array(arrayBuf);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            previousImageBase64 = btoa(binary);
          }
        } catch (e) {
          console.warn("Could not fetch previous photo for comparison:", e);
        }
      }

      // Build baseline context from current analysis
      let baselineContext = "";
      if (currentAnalysis) {
        const conditions = Array.isArray(currentAnalysis.conditions) ? currentAnalysis.conditions : [];
        const features = Array.isArray(currentAnalysis.visual_features) ? currentAnalysis.visual_features : [];
        baselineContext = `
Conditions: ${conditions.map((c: any) => `${c.condition} (${c.probability}%)`).join(", ") || "None"}
Visual features observed: ${features.join(", ") || "None"}
Skin score: ${previousScore}/100
Root causes: ${Array.isArray(currentAnalysis.root_causes) ? currentAnalysis.root_causes.map((r: any) => r.title).join(", ") : "None"}`;
      }

      // Call comparison edge function — send all images + previous image
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/compare-progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({
          newImageBase64: base64Images.length === 1 ? base64Images[0] : base64Images,
          previousImageBase64,
          baselineContext,
          previousScore,
          progressAnswers: progressAnswers || {},
        }),
      });

      let progressSummary: any = {
        changes: [],
        summary: "Progress photo saved. Your skin appears similar to your previous check.",
        scoreAdjustment: 0,
        encouragement: "Keep going with your healing plan!",
        confidence: "medium",
      };

      if (response.ok) {
        const data = await response.json();
        if (data && !data.error) {
          progressSummary = data;
        }
      }

      // Store answers in the summary for history
      if (progressAnswers) {
        progressSummary.progressAnswers = progressAnswers;
      }

      // Calculate new score with hard cap enforcement
      let adj = typeof progressSummary.scoreAdjustment === "number" ? progressSummary.scoreAdjustment : 0;
      adj = Math.max(-6, Math.min(6, adj));
      const scoreEstimate = Math.max(0, Math.min(100, previousScore + adj));

      // Save to DB (use first photo path as main, store all paths in summary)
      progressSummary.photoUrls = uploadedPaths;

      const { error: insertError } = await supabase
        .from("progress_photos" as any)
        .insert({
          user_id: user.id,
          analysis_id: currentAnalysis?.id || null,
          photo_url: uploadedPaths[0],
          progress_summary: progressSummary,
          score_estimate: scoreEstimate,
        } as any);

      if (insertError) throw insertError;

      await queryClient.invalidateQueries({ queryKey: progressPhotosQueryKey(user.id) });

      return progressSummary;
    } finally {
      setUploading(false);
    }
  }, [user, currentAnalysis, queryClient, query.data]);

  const deleteProgressPhoto = useCallback(async (photoId: string) => {
    if (!user?.id) throw new Error("Must be logged in");

    const { data: photo } = await supabase
      .from("progress_photos" as any)
      .select("photo_url")
      .eq("id", photoId)
      .eq("user_id", user.id)
      .single();

    const photoUrl = (photo as any)?.photo_url;
    if (photoUrl) {
      await supabase.storage.from("skin-photos").remove([photoUrl]);
    }

    const { error } = await supabase
      .from("progress_photos" as any)
      .delete()
      .eq("id", photoId)
      .eq("user_id", user.id);

    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: progressPhotosQueryKey(user.id) });
  }, [user, queryClient]);

  return {
    photos: query.data || [],
    isLoading: query.isLoading,
    uploading,
    uploadProgressPhoto,
    deleteProgressPhoto,
    refetch: query.refetch,
  };
};
