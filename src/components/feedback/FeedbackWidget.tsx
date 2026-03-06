import { useState } from "react";
import { ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentAnalysis } from "@/hooks/useCurrentAnalysis";

interface FeedbackWidgetProps {
  context: string;
}

export const FeedbackWidget = ({ context }: FeedbackWidgetProps) => {
  const { user } = useAuth();
  const { currentAnalysis } = useCurrentAnalysis();
  const [state, setState] = useState<"idle" | "negative" | "submitted">("idle");
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const submit = async (helpful: boolean, text?: string) => {
    setSubmitting(true);
    await supabase.from("user_feedback" as any).insert({
      user_id: user.id,
      analysis_id: currentAnalysis?.id || null,
      context,
      helpful,
      feedback_text: text || null,
    } as any);
    setSubmitting(false);
    setState("submitted");
  };

  if (state === "submitted") {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">
        Thanks for your feedback!
      </p>
    );
  }

  if (state === "negative") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">What would you like us to improve?</p>
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="Optional feedback..."
          className="w-full text-sm p-3 rounded-xl border border-border bg-card resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={() => submit(false, feedbackText)}
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <Send className="w-3 h-3" />
          {submitting ? "Sending..." : "Send Feedback"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground">Was this helpful?</span>
      <button
        onClick={() => submit(true)}
        disabled={submitting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:bg-primary/10 transition-colors"
      >
        <ThumbsUp className="w-3 h-3" /> Yes
      </button>
      <button
        onClick={() => setState("negative")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:bg-destructive/10 transition-colors"
      >
        <ThumbsDown className="w-3 h-3" /> Not really
      </button>
    </div>
  );
};
