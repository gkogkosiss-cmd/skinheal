import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ChevronDown } from "lucide-react";

interface RootCause {
  title: string;
  description: string;
}

const RootCauseCard = ({ cause, index }: { cause: RootCause; index: number }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = cause.description.length > 120;
  const preview = isLong ? cause.description.slice(0, 120).replace(/\s+\S*$/, "") + "…" : cause.description;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06 }}
      className="p-4 rounded-xl bg-muted/30 border border-border/50"
    >
      <div className="flex items-start gap-3">
        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
          {index + 1}
        </span>
        <div className="min-w-0">
          <h3 className="font-medium text-sm mb-1.5">{cause.title}</h3>
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ maxHeight: expanded || !isLong ? "1000px" : "3.6em" }}
          >
            <p className="text-xs text-muted-foreground leading-relaxed">
              {expanded ? cause.description : preview}
            </p>
          </div>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              {expanded ? "Show less" : "Show more"}
              <ChevronDown
                className="w-3.5 h-3.5 transition-transform duration-300"
                style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
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
          <RootCauseCard key={cause.title} cause={cause} index={i} />
        ))}
      </div>
    </div>
  );
};