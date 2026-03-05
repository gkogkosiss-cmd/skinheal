import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Sun, Moon, Calendar, AlertTriangle, Clock, Droplets, Shield, Sparkles } from "lucide-react";

const morningRoutine = [
  { step: 1, action: "Rinse face with lukewarm water only", note: "No cleanser in the morning to preserve natural oils" },
  { step: 2, action: "Apply a gentle ceramide moisturizer", note: "Look for ceramides, niacinamide, and hyaluronic acid" },
  { step: 3, action: "Apply SPF 30+ mineral sunscreen", note: "Zinc oxide based — least irritating for compromised skin" },
];

const eveningRoutine = [
  { step: 1, action: "Double cleanse with oil-based cleanser", note: "Removes sunscreen and sebum gently" },
  { step: 2, action: "Follow with a gentle, pH-balanced cleanser", note: "pH 5.0–5.5 to support the acid mantle" },
  { step: 3, action: "Apply targeted treatment (if prescribed)", note: "Antifungal cream or calming serum" },
  { step: 4, action: "Seal with ceramide moisturizer", note: "Rebuilds the skin barrier overnight" },
];

const weeklyTreatments = [
  "Zinc pyrithione or ketoconazole wash — leave on 5 min (2–3x/week)",
  "Colloidal oat mask for soothing (1x/week)",
  "Raw honey mask — antimicrobial and humectant (1x/week)",
];

const avoidList = [
  { item: "Heavy oils (coconut, olive)", reason: "Feed Malassezia yeast" },
  { item: "Harsh exfoliants & scrubs", reason: "Damage compromised barrier" },
  { item: "Fragrance & essential oils", reason: "Common irritants that worsen inflammation" },
  { item: "Alcohol-based toners", reason: "Strip the moisture barrier" },
  { item: "Over-cleansing (3+ times/day)", reason: "Disrupts natural sebum regulation" },
];

const timeline = [
  { week: "Week 1–2", progress: "Reduced redness and itching" },
  { week: "Week 3–4", progress: "Flaking decreases significantly" },
  { week: "Week 5–8", progress: "Skin barrier begins to strengthen" },
  { week: "Week 8–12", progress: "Visible clarity and texture improvement" },
];

const HealingProtocol = () => (
  <Layout>
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <p className="text-sm text-primary font-medium mb-1">Healing Protocol</p>
      <h1 className="font-serif text-3xl md:text-4xl mb-2">Your Complete Healing Plan</h1>
      <p className="text-muted-foreground mb-8">A structured approach to skin healing — routines, treatments, and timelines.</p>

      <div className="space-y-8">
        {/* Morning Routine */}
        <div className="card-elevated">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <Sun className="w-5 h-5 text-accent-foreground" />
            </div>
            <h2 className="font-serif text-xl">Morning Routine</h2>
          </div>
          <div className="space-y-4">
            {morningRoutine.map((s) => (
              <div key={s.step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center text-xs font-semibold text-primary shrink-0 mt-0.5">
                  {s.step}
                </div>
                <div>
                  <p className="font-medium text-sm">{s.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Evening Routine */}
        <div className="card-elevated">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Moon className="w-5 h-5 text-secondary-foreground" />
            </div>
            <h2 className="font-serif text-xl">Evening Routine</h2>
          </div>
          <div className="space-y-4">
            {eveningRoutine.map((s) => (
              <div key={s.step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground shrink-0 mt-0.5">
                  {s.step}
                </div>
                <div>
                  <p className="font-medium text-sm">{s.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly */}
        <div className="card-elevated">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <Calendar className="w-5 h-5 text-accent-foreground" />
            </div>
            <h2 className="font-serif text-xl">Weekly Treatments</h2>
          </div>
          <ul className="space-y-3">
            {weeklyTreatments.map((t) => (
              <li key={t} className="flex items-start gap-3 text-sm">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Avoid */}
        <div className="card-elevated">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <h2 className="font-serif text-xl">What to Avoid</h2>
          </div>
          <div className="space-y-3">
            {avoidList.map((a) => (
              <div key={a.item} className="flex items-start gap-3 text-sm">
                <Shield className="w-4 h-4 text-destructive/60 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">{a.item}</span>
                  <span className="text-muted-foreground"> — {a.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="card-elevated gradient-warm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Clock className="w-5 h-5 text-secondary-foreground" />
            </div>
            <h2 className="font-serif text-xl">Expected Timeline</h2>
          </div>
          <div className="space-y-4">
            {timeline.map((t, i) => (
              <motion.div
                key={t.week}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4"
              >
                <span className="text-xs font-semibold text-primary w-20 shrink-0">{t.week}</span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm text-foreground">{t.progress}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  </Layout>
);

export default HealingProtocol;
