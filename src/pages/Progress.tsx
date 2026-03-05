import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Camera, TrendingUp, Calendar, Plus, ArrowRight, AlertCircle } from "lucide-react";
import { useAllAnalyses, getSignedImageUrl, type Analysis } from "@/hooks/useAnalysis";

const Progress = () => {
  const { data: analyses, isLoading } = useAllAnalyses();
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
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
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-secondary-foreground" />
                </div>
                <h2 className="font-serif text-xl">Analysis History</h2>
              </div>
              <div className="space-y-6">
                {analyses!.map((a, i) => {
                  const topCondition = (a.conditions as any[])?.[0];
                  const date = new Date(a.created_at);
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex gap-4 items-start"
                    >
                      {/* Photo thumbnail */}
                      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {imageUrls[a.id] ? (
                          <img src={imageUrls[a.id]} alt="Skin photo" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">{getWeekLabel(i, analyses!.length)}</p>
                          <span className="text-xs text-muted-foreground">{date.toLocaleDateString()}</span>
                        </div>
                        {topCondition && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {topCondition.condition} — {topCondition.probability}% likelihood
                          </p>
                        )}
                        {/* Visual features */}
                        {(a.visual_features as string[])?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(a.visual_features as string[]).slice(0, 4).map((f: string) => (
                              <span key={f} className="px-2 py-0.5 rounded-full bg-accent text-[10px] font-medium text-accent-foreground capitalize">{f}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>This platform provides educational skin wellness insights and is not medical advice.</p>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
};

export default Progress;
