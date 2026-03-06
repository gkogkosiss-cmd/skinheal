import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, Trash2 } from "lucide-react";
import { useProgressPhotos, type ProgressPhoto } from "@/hooks/useProgressPhotos";
import { getSignedImageUrl, type Analysis } from "@/hooks/useAnalysis";
import { useEffect } from "react";
import { toast } from "sonner";
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

interface TimelineItem {
  type: "analysis" | "progress";
  date: string;
  id: string;
  score?: number;
  label: string;
  photoPath?: string;
  summary?: string;
  scoreAdjustment?: number;
}

interface Props {
  analyses: Analysis[];
}

export const ProgressTimeline = ({ analyses }: Props) => {
  const { photos, deleteProgressPhoto } = useProgressPhotos();
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Build unified timeline
  const items: TimelineItem[] = [
    ...analyses.map((a, i) => ({
      type: "analysis" as const,
      date: a.created_at,
      id: a.id,
      score: a.skin_score?.overall || undefined,
      label: i === analyses.length - 1 ? "Initial Analysis" : "Updated Analysis",
      photoPath: a.image_url || undefined,
    })),
    ...photos.map((p) => ({
      type: "progress" as const,
      date: p.date_uploaded,
      id: p.id,
      score: p.score_estimate || undefined,
      label: "Progress Check",
      photoPath: p.photo_url || undefined,
      summary: p.progress_summary?.summary,
      scoreAdjustment: p.progress_summary?.scoreAdjustment,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  useEffect(() => {
    const loadImages = async () => {
      const urls: Record<string, string> = {};
      for (const item of items) {
        if (item.photoPath && !imageUrls[item.id]) {
          const url = await getSignedImageUrl(item.photoPath);
          if (url) urls[item.id] = url;
        }
      }
      if (Object.keys(urls).length > 0) {
        setImageUrls((prev) => ({ ...prev, ...urls }));
      }
    };
    loadImages();
  }, [items.length]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteProgressPhoto(deleteTarget);
      toast.success("Progress entry deleted.");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete.");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (items.length === 0) return null;

  return (
    <>
      <div className="card-elevated">
        <h2 className="font-serif text-xl mb-5">Your Timeline</h2>
        <div className="space-y-4">
          {items.map((item, i) => {
            const date = new Date(item.date);
            const isProgress = item.type === "progress";

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-4 items-start p-3 rounded-xl hover:bg-muted/50 transition-colors group"
              >
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {imageUrls[item.id] ? (
                    <img src={imageUrls[item.id]} alt="Photo" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        isProgress
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-accent text-accent-foreground"
                      }`}>
                        {item.label}
                      </span>
                      {item.score && item.score > 0 && (
                        <span className="text-xs font-bold text-primary">{item.score}/100</span>
                      )}
                      {isProgress && item.scoreAdjustment !== undefined && item.scoreAdjustment !== 0 && (
                        <span className={`text-[10px] font-semibold ${item.scoreAdjustment > 0 ? "text-primary" : "text-destructive"}`}>
                          ({item.scoreAdjustment > 0 ? "+" : ""}{item.scoreAdjustment})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{date.toLocaleDateString()}</span>
                      {isProgress && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {item.summary && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this progress check?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this progress photo and its comparison data. This action cannot be undone.
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
    </>
  );
};
