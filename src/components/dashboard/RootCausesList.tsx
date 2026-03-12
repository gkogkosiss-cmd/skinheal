import { motion } from "framer-motion";
import { Search } from "lucide-react";

interface RootCause {
  title: string;
  description: string;
}

const splitDescription = (desc: string): string[] => {
  if (desc.length < 200) return [desc];
  const sentences = desc.match(/[^.!?]+[.!?]+/g) || [desc];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    current += s;
    if (current.length > 150) {
      chunks.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
};

export const RootCausesList = ({ rootCauses }: { rootCauses: RootCause[] }) => {
  if (!rootCauses || rootCauses.length === 0) return null;

  return (
    <div className="card-elevated">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <Search className="w-5 h-5 text-secondary-foreground" />
        </div>
        <div>
          <h2 className="font-serif text-xl">Root Causes</h2>
          <p className="text-xs text-muted-foreground">What may be driving your skin symptoms</p>
        </div>
      </div>

      <div className="space-y-3">
        {rootCauses.map((cause, i) => (
          <motion.div
            key={cause.title}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            className="p-4 rounded-xl bg-muted/30 border border-border/50"
          >
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-medium text-sm mb-1.5">{cause.title}</h3>
                <div className="space-y-1.5">
                  {splitDescription(cause.description).map((chunk, j) => (
                    <p key={j} className="text-xs text-muted-foreground leading-relaxed">{chunk}</p>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
