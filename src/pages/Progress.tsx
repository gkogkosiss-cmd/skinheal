import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Camera, Calendar, Plus, ArrowRight, AlertCircle, Target, Eye, X, ArrowLeftRight, Share2, Trash2 } from "lucide-react";
import { useAllAnalyses, getSignedImageUrl, deleteAnalysisRecord, type Analysis } from "@/hooks/useAnalysis";
import { useCurrentAnalysis } from "@/hooks/useCurrentAnalysis";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { allAnalysesQueryKey, latestAnalysisQueryKey } from "@/hooks/useAnalysis";
import { useToast } from "@/hooks/use-toast";
import { SkinScoreCard } from "@/components/dashboard/SkinScoreCard";
import { ShareableProgressCard } from "@/components/progress/ShareableProgressCard";
import { ScoreHistoryChart } from "@/components/progress/ScoreHistoryChart";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Progress = () => {
  const { data: analyses, isLoading } = useAllAnalyses();
  const { currentAnalysis: latestAnalysis, setAsCurrentPlan } = useCurrentAnalysis();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [selectedReport, setSelectedReport] = useState<Analysis | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showShareCard, setShowShareCard] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Analysis | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const hasAnalyses = analyses && analyses.length > 0;

  useEffect(() => {
    if (!analyses) return;
    const loadImages = async () => {
      const urls: Record<string, string> = {};
      for (const a of analyses) {
        if (a.image_url) {
          const url = await getSignedImageUrl(a.image_url);
          if (url) urls[a.id] = url;
        }
      }
      setImageUrls(urls);
    };
    loadImages();
  }, [analyses]);

  const getWeekLabel = (index: number, total: number) => {
    if (index === total - 1) return "Week 0 — First scan";
    return `Week ${total - 1 - index} — Updated scan`;
  };

  const toggleCompareId = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget || !user) return;
    setIsDeleting(true);
    try {
      await deleteAnalysisRecord(deleteTarget.id, user.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: allAnalysesQueryKey(user.id) }),
        queryClient.invalidateQueries({ queryKey: latestAnalysisQueryKey(user.id) }),
      ]);
      if (selectedReport?.id === deleteTarget.id) setSelectedReport(null);
      toast({ title: "Deleted", description: "Analysis removed successfully." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const compareAnalyses = compareIds.length === 2
    ? analyses?.filter((a) => compareIds.includes(a.id))
    : null;

  const protocol = latestAnalysis?.healing_protocol;
  const currentAnalysisId = latestAnalysis?.id;

  const canShare = analyses && analyses.length >= 2 &&
    analyses[0]?.skin_score?.overall > 0 &&
    analyses[analyses.length - 1]?.skin_score?.overall > 0;

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-sm text-primary font-medium mb-1">Progress Tracker</p>
        <h1 className="font-serif text-3xl md:text-4xl mb-2">Track Your Healing</h1>
        <p className="text-muted-foreground mb-8">Upload weekly photos to visualize your improvement over time.</p>

        <div className="space-y-8">
          {/* Upload New */}
          <Link to="/analysis" className="card-elevated border-dashed border-2 cursor-pointer hover:border-primary/30 transition-colors group block">
            <div className="flex flex-col items-center py-10 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Plus className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium mb-1">Add this week's photo</p>
                <p className="text-xs text-muted-foreground">Take a clear photo in the same lighting as previous weeks</p>
              </div>
            </div>
          </Link>

          {/* Score Overview */}
          {latestAnalysis?.skin_score?.overall > 0 && (
            <SkinScoreCard score={latestAnalysis.skin_score} />
          )}

          {/* Score History Graph */}
          {analyses && analyses.length >= 2 && (
            <ScoreHistoryChart analyses={analyses} />
          )}

          {/* Share Progress */}
          {canShare && (
            <button
              onClick={() => setShowShareCard(true)}
              className="w-full card-elevated gradient-sage flex items-center justify-center gap-3 py-4 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <Share2 className="w-5 h-5 text-primary" />
              <span className="font-medium text-sm">Share Your Progress</span>
            </button>
          )}

          {/* This Week Focus */}
          {protocol?.thisWeekFocus && (
            <div className="card-elevated gradient-warm">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="font-serif text-xl">This Week's Focus</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{protocol.thisWeekFocus}</p>
            </div>
          )}

          {!hasAnalyses && !isLoading && (
            <div className="card-elevated gradient-sage">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-xl mb-1">No analyses yet</h2>
                  <p className="text-sm text-muted-foreground">Complete your first skin analysis to start tracking progress.</p>
                </div>
                <Link to="/analysis" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0">
                  Start Analysis <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Timeline */}
          {hasAnalyses && (
            <div className="card-elevated">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <h2 className="font-serif text-xl">Analysis History</h2>
                </div>
                {analyses!.length >= 2 && (
                  <button
                    onClick={() => { setCompareMode(!compareMode); setCompareIds([]); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                      compareMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    {compareMode ? "Cancel Compare" : "Compare"}
                  </button>
                )}
              </div>

              {compareMode && (
                <p className="text-xs text-muted-foreground mb-4">Select two analyses to compare side by side.</p>
              )}

              <div className="space-y-6">
                {analyses!.map((a, i) => {
                  const topCondition = a.conditions?.[0];
                  const date = new Date(a.created_at);
                  const isSelected = compareIds.includes(a.id);
                  const score = a.skin_score?.overall;
                  // Show score delta vs previous (next in array since sorted desc)
                  const prevAnalysis = analyses![i + 1];
                  const prevScore = prevAnalysis?.skin_score?.overall;
                  const scoreDelta = score > 0 && prevScore > 0 ? score - prevScore : null;

                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className={`flex gap-4 items-start p-3 rounded-xl transition-colors cursor-pointer ${
                        compareMode && isSelected ? "bg-primary/5 ring-1 ring-primary/30" : "hover:bg-muted/50"
                      }`}
                      onClick={() => {
                        if (compareMode) toggleCompareId(a.id);
                        else setSelectedReport(a);
                      }}
                    >
                      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {imageUrls[a.id] ? (
                          <img src={imageUrls[a.id]} alt="Skin photo" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-3">
                          <p className="font-medium text-sm">{getWeekLabel(i, analyses!.length)}</p>
                          <div className="flex items-center gap-2">
                            {score > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                {score}/100
                                {scoreDelta !== null && (
                                  <span className={`ml-1 ${scoreDelta > 0 ? "text-primary" : scoreDelta < 0 ? "text-destructive" : ""}`}>
                                    ({scoreDelta > 0 ? "+" : ""}{scoreDelta})
                                  </span>
                                )}
                              </span>
                            )}
                            {currentAnalysisId === a.id && (
                              <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-medium">
                                Current
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">{date.toLocaleDateString()}</span>
                          </div>
                        </div>
                        {topCondition && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {topCondition.condition} — {topCondition.probability}% likelihood
                          </p>
                        )}
                        {(a.visual_features as string[])?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(a.visual_features as string[]).slice(0, 4).map((f: string) => (
                              <span key={f} className="px-2 py-0.5 rounded-full bg-accent text-[10px] font-medium text-accent-foreground capitalize">{f}</span>
                            ))}
                          </div>
                        )}
                        {!compareMode && (
                          <button className="flex items-center gap-1 text-xs text-primary font-medium mt-2 hover:underline">
                            <Eye className="w-3 h-3" /> View full report
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compare View */}
          {compareMode && compareAnalyses && compareAnalyses.length === 2 && (
            <div className="card-elevated">
              <h3 className="font-serif text-xl mb-5">Side-by-Side Comparison</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {compareAnalyses.map((a) => (
                  <div key={a.id} className="text-center">
                    <div className="w-full aspect-square rounded-xl bg-muted overflow-hidden mb-2">
                      {imageUrls[a.id] ? (
                        <img src={imageUrls[a.id]} alt="Skin photo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium">{new Date(a.created_at).toLocaleDateString()}</p>
                    {a.skin_score?.overall > 0 && (
                      <p className="text-xs text-primary font-bold">Score: {a.skin_score.overall}/100</p>
                    )}
                    <p className="text-xs text-muted-foreground">{a.conditions?.[0]?.condition}</p>
                  </div>
                ))}
              </div>

              {/* Score comparison */}
              {compareAnalyses[0]?.skin_score?.overall > 0 && compareAnalyses[1]?.skin_score?.overall > 0 && (() => {
                const [older, newer] = compareAnalyses[0].created_at > compareAnalyses[1].created_at
                  ? [compareAnalyses[1], compareAnalyses[0]]
                  : [compareAnalyses[0], compareAnalyses[1]];
                const diff = newer.skin_score.overall - older.skin_score.overall;
                return (
                  <div className="p-4 rounded-xl bg-muted/50 mb-4">
                    <p className="text-sm font-medium mb-2">Score Change</p>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">{older.skin_score.overall}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="text-lg font-bold">{newer.skin_score.overall}</span>
                      <span className={`text-sm font-semibold ${diff > 0 ? "text-primary" : diff < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {diff > 0 ? "Your skin appears to be improving based on the analysis comparison." : diff < 0 ? "Your skin may be showing some changes that need attention." : "Little visible change between these two analyses."}
                    </p>
                  </div>
                );
              })()}

              <div className="space-y-3">
                <h4 className="font-medium text-sm">Key Differences</h4>
                {(() => {
                  const [older, newer] = compareAnalyses[0].created_at > compareAnalyses[1].created_at
                    ? [compareAnalyses[1], compareAnalyses[0]]
                    : [compareAnalyses[0], compareAnalyses[1]];
                  const olderFeatures = new Set(older.visual_features as string[]);
                  const newerFeatures = new Set(newer.visual_features as string[]);
                  const resolved = [...olderFeatures].filter((f) => !newerFeatures.has(f));
                  const newIssues = [...newerFeatures].filter((f) => !olderFeatures.has(f));
                  return (
                    <>
                      {resolved.length > 0 && (
                        <p className="text-sm text-primary">Possibly improved: {resolved.join(", ")}</p>
                      )}
                      {newIssues.length > 0 && (
                        <p className="text-sm text-destructive">New observations: {newIssues.join(", ")}</p>
                      )}
                      {resolved.length === 0 && newIssues.length === 0 && (
                        <p className="text-sm text-muted-foreground">Visual features are similar between both scans.</p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Reminder */}
          {hasAnalyses && (
            <div className="card-elevated">
              <div className="flex items-center gap-3 mb-3">
                <Camera className="w-5 h-5 text-primary" />
                <h3 className="font-medium text-sm">Weekly reminder</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                For best results, upload a new photo every week in similar lighting and angle. This helps track changes accurately over time.
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>This platform provides educational skin wellness insights and is not medical advice.</p>
          </div>
        </div>
      </motion.div>

      {/* Full Report Modal */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4"
            onClick={() => setSelectedReport(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-lg my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="card-elevated">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-2xl">Full Report</h2>
                  <button onClick={() => setSelectedReport(null)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-muted-foreground mb-4">
                  {new Date(selectedReport.created_at).toLocaleDateString()} at {new Date(selectedReport.created_at).toLocaleTimeString()}
                </p>

                {/* Score */}
                {selectedReport.skin_score?.overall > 0 && (
                  <div className="mb-6">
                    <SkinScoreCard score={selectedReport.skin_score} />
                  </div>
                )}

                {imageUrls[selectedReport.id] && (
                  <div className="w-full aspect-video rounded-xl overflow-hidden bg-muted mb-6">
                    <img src={imageUrls[selectedReport.id]} alt="Skin photo" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Conditions */}
                <h3 className="font-serif text-lg mb-3">Suspected Conditions</h3>
                <div className="space-y-3 mb-6">
                  {selectedReport.conditions?.map((c: any, i: number) => (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{c.condition}</span>
                        <span className="text-muted-foreground">{c.probability}% likelihood</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${c.probability}%` }} />
                      </div>
                      {c.explanation && (
                        <p className="text-xs text-muted-foreground mt-1">{c.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Biological explanation */}
                {selectedReport.biological_explanation && (
                  <>
                    <h3 className="font-serif text-lg mb-2">What We Think Is Happening</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">{selectedReport.biological_explanation}</p>
                  </>
                )}

                {/* Root Causes */}
                {selectedReport.root_causes?.length > 0 && (
                  <>
                    <h3 className="font-serif text-lg mb-3">Possible Triggers</h3>
                    <div className="space-y-2 mb-6">
                      {selectedReport.root_causes.map((rc: any, i: number) => (
                        <div key={i} className="p-3 rounded-xl bg-muted/50">
                          <p className="font-medium text-sm">{rc.title}</p>
                          <p className="text-xs text-muted-foreground">{rc.description}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Visual Features */}
                {(selectedReport.visual_features as string[])?.length > 0 && (
                  <>
                    <h3 className="font-serif text-lg mb-3">Observed Features</h3>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {(selectedReport.visual_features as string[]).map((f: string) => (
                        <span key={f} className="px-3 py-1 rounded-full bg-accent text-xs font-medium text-accent-foreground capitalize">{f}</span>
                      ))}
                    </div>
                  </>
                )}

                {/* Action buttons */}
                <div className="space-y-3 mt-4">
                  {currentAnalysisId !== selectedReport.id && (
                    <button
                      onClick={async () => {
                        try {
                          await setAsCurrentPlan(selectedReport.id);
                          toast({ title: "Updated", description: "This analysis is now your active plan." });
                          setSelectedReport(null);
                        } catch (e: any) {
                          toast({ title: "Error", description: e.message, variant: "destructive" });
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      Set as Current Plan
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(selectedReport);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Analysis
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this analysis?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the photos and generated plan. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shareable Progress Card */}
      {showShareCard && analyses && analyses.length >= 2 && (
        <ShareableProgressCard
          oldScore={analyses[analyses.length - 1].skin_score}
          newScore={analyses[0].skin_score}
          oldDate={analyses[analyses.length - 1].created_at}
          newDate={analyses[0].created_at}
          weekStart={0}
          weekEnd={analyses.length - 1}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </Layout>
  );
};

export default Progress;
