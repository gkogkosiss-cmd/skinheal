import { createContext, useContext, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import {
  useLatestAnalysis,
  setLatestAnalysisId,
  latestAnalysisQueryKey,
  allAnalysesQueryKey,
  type Analysis,
} from "./useAnalysis";

type CurrentAnalysisContextType = {
  currentAnalysis: Analysis | null;
  isLoading: boolean;
  refreshCurrentAnalysis: () => Promise<void>;
  setAsCurrentPlan: (analysisId: string) => Promise<void>;
};

const CurrentAnalysisContext = createContext<CurrentAnalysisContextType | null>(null);

export const CurrentAnalysisProvider = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading, refetch } = useLatestAnalysis();

  useEffect(() => {
    if (!user) return;
    refetch();
  }, [location.pathname, user?.id, refetch]);

  const refreshCurrentAnalysis = async () => {
    await refetch();
  };

  const setAsCurrentPlan = async (analysisId: string) => {
    if (!user) throw new Error("You need to be logged in.");

    const { error } = await setLatestAnalysisId(user.id, analysisId);
    if (error) throw error;

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: latestAnalysisQueryKey(user.id) }),
      queryClient.invalidateQueries({ queryKey: allAnalysesQueryKey(user.id) }),
    ]);

    await refetch();
  };

  const value = useMemo(
    () => ({
      currentAnalysis: data ?? null,
      isLoading,
      refreshCurrentAnalysis,
      setAsCurrentPlan,
    }),
    [data, isLoading],
  );

  return <CurrentAnalysisContext.Provider value={value}>{children}</CurrentAnalysisContext.Provider>;
};

export const useCurrentAnalysis = () => {
  const context = useContext(CurrentAnalysisContext);
  if (!context) {
    throw new Error("useCurrentAnalysis must be used within CurrentAnalysisProvider");
  }
  return context;
};
