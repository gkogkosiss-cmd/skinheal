import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Check, X, Flame, Leaf } from "lucide-react";

const goodFoods = [
  { food: "Wild Salmon", why: "Rich in omega-3 fatty acids that reduce inflammation and strengthen cell membranes" },
  { food: "Blueberries & Berries", why: "Packed with antioxidants and polyphenols that protect against oxidative skin damage" },
  { food: "Leafy Greens", why: "High in vitamins A, C, K and folate — essential for skin cell turnover and repair" },
  { food: "Fermented Foods", why: "Kimchi, sauerkraut, kefir — provide beneficial bacteria to restore gut microbiome balance" },
  { food: "Bone Broth", why: "Contains collagen, glycine, and glutamine that support gut lining and skin structure" },
  { food: "Sweet Potatoes", why: "Beta-carotene converts to vitamin A, supporting skin cell renewal and barrier function" },
  { food: "Avocado", why: "Healthy monounsaturated fats and vitamin E protect against oxidative damage" },
  { food: "Turmeric", why: "Curcumin is a powerful anti-inflammatory compound that modulates immune response" },
];

const badFoods = [
  { food: "Refined Sugar", why: "Spikes insulin and IGF-1, increasing sebum production and systemic inflammation" },
  { food: "Ultra-Processed Foods", why: "Contain preservatives, emulsifiers, and artificial additives that damage gut lining" },
  { food: "High Glycemic Carbs", why: "White bread, pasta, rice — rapidly elevate blood sugar and trigger inflammatory cascades" },
  { food: "Dairy (especially skim milk)", why: "Contains hormones and growth factors that can exacerbate acne and inflammation" },
  { food: "Seed Oils (excess)", why: "High omega-6 content promotes pro-inflammatory pathways when consumed in excess" },
  { food: "Alcohol", why: "Depletes zinc, disrupts gut permeability, and triggers inflammation" },
];

const antiInflammatoryPrinciples = [
  "Eat whole, unprocessed foods as your foundation",
  "Prioritize omega-3 rich foods over omega-6",
  "Include polyphenol-rich foods daily (berries, green tea, dark chocolate)",
  "Eat 30+ different plant foods per week for microbiome diversity",
  "Remove refined sugar for at least 21 days to assess impact",
  "Cook with anti-inflammatory spices: turmeric, ginger, cinnamon",
];

const Nutrition = () => (
  <Layout>
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <p className="text-sm text-primary font-medium mb-1">Nutrition</p>
      <h1 className="font-serif text-3xl md:text-4xl mb-2">Food as Medicine</h1>
      <p className="text-muted-foreground mb-8">What you eat directly affects inflammation, hormones, and skin healing.</p>

      <div className="space-y-8">
        {/* Best Foods */}
        <div className="card-elevated">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <Leaf className="w-5 h-5 text-accent-foreground" />
            </div>
            <h2 className="font-serif text-xl">Best Foods for Your Skin</h2>
          </div>
          <div className="space-y-4">
            {goodFoods.map((f, i) => (
              <motion.div
                key={f.food}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{f.food}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.why}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Foods to Avoid */}
        <div className="card-elevated">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <X className="w-5 h-5 text-destructive" />
            </div>
            <h2 className="font-serif text-xl">Foods to Avoid</h2>
          </div>
          <div className="space-y-4">
            {badFoods.map((f, i) => (
              <motion.div
                key={f.food}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                  <X className="w-3.5 h-3.5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-sm">{f.food}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.why}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Anti-inflammatory Diet */}
        <div className="card-elevated gradient-sage">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-serif text-xl">Anti-Inflammatory Principles</h2>
          </div>
          <ul className="space-y-3">
            {antiInflammatoryPrinciples.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  </Layout>
);

export default Nutrition;
