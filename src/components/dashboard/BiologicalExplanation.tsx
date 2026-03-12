import { Sparkles } from "lucide-react";

const HIGHLIGHT_TERMS = [
  "NF-kB", "NF-κB", "IGF-1", "mTORC1", "mTOR", "zonulin", "cortisol",
  "insulin", "sebum", "keratinocyte", "melanocyte", "collagen", "elastin",
  "histamine", "prostaglandin", "cytokine", "interleukin", "TNF-alpha",
  "lipid barrier", "skin barrier", "microbiome", "dysbiosis", "leaky gut",
  "inflammation", "oxidative stress", "free radicals", "antioxidant",
  "omega-3", "omega-6", "vitamin D", "vitamin A", "zinc", "niacinamide",
  "ceramide", "hyaluronic acid", "retinol", "sebaceous gland",
  "gut-skin axis", "hypothalamic-pituitary", "HPA axis",
  "androgen", "estrogen", "testosterone", "DHT", "dihydrotestosterone",
];

const highlightText = (text: string): (string | JSX.Element)[] => {
  const escaped = HIGHLIGHT_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    if (HIGHLIGHT_TERMS.some((t) => t.toLowerCase() === part.toLowerCase())) {
      return (
        <span key={i} className="font-semibold text-primary bg-accent/60 px-1 py-0.5 rounded">
          {part}
        </span>
      );
    }
    return part;
  });
};

const splitIntoParagraphs = (text: string): string[] => {
  // Split on double newlines, periods followed by spaces where sentence is long, etc.
  const raw = text.split(/\n{2,}/);
  if (raw.length > 1) return raw.filter(Boolean);

  // If single block, split into ~2-3 sentence chunks
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    current += sentence;
    if (current.length > 180) {
      chunks.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.length > 0 ? chunks : [text];
};

export const BiologicalExplanation = ({ text }: { text: string }) => {
  if (!text) return null;

  const paragraphs = splitIntoParagraphs(text);

  return (
    <div className="card-elevated gradient-sage">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-serif text-xl">What's Happening In Your Skin</h2>
          <p className="text-xs text-muted-foreground">The biology behind your symptoms</p>
        </div>
      </div>

      <div className="space-y-3">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed">
            {highlightText(para)}
          </p>
        ))}
      </div>
    </div>
  );
};
