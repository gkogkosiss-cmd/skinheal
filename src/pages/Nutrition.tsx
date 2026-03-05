import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Check, X, Flame, Leaf, ArrowRight, AlertCircle } from "lucide-react";
import { useLatestAnalysis, type FoodItem } from "@/hooks/useAnalysis";

const defaultGoodFoods: FoodItem[] = [
  { food: "Wild Salmon", reason: "Rich in omega-3 fatty acids that reduce inflammation and strengthen cell membranes" },
  { food: "Blueberries & Berries", reason: "Packed with antioxidants and polyphenols that protect against oxidative skin damage" },
  { food: "Leafy Greens", reason: "High in vitamins A, C, K and folate — essential for skin cell turnover and repair" },
  { food: "Fermented Foods", reason: "Kimchi, sauerkraut, kefir — provide beneficial bacteria to restore gut microbiome balance" },
  { food: "Bone Broth", reason: "Contains collagen, glycine, and glutamine that support gut lining and skin structure" },
  { food: "Sweet Potatoes", reason: "Beta-carotene converts to vitamin A, supporting skin cell renewal and barrier function" },
  { food: "Avocado", reason: "Healthy monounsaturated fats and vitamin E protect against oxidative damage" },
  { food: "Turmeric", reason: "Curcumin is a powerful anti-inflammatory compound that modulates immune response" },
];

const defaultBadFoods: FoodItem[] = [
  { food: "Refined Sugar", reason: "Spikes insulin and IGF-1, increasing sebum production and systemic inflammation" },
  { food: "Ultra-Processed Foods", reason: "Contain preservatives, emulsifiers, and artificial additives that damage gut lining" },
  { food: "High Glycemic Carbs", reason: "White bread, pasta, rice — rapidly elevate blood sugar and trigger inflammatory cascades" },
  { food: "Dairy (especially skim milk)", reason: "Contains hormones and growth factors that can exacerbate acne and inflammation" },
  { food: "Seed Oils (excess)", reason: "High omega-6 content promotes pro-inflammatory pathways when consumed in excess" },
  { food: "Alcohol", reason: "Depletes zinc, disrupts gut permeability, and triggers inflammation" },
];

const Nutrition = () => {
  const { data: analysis } = useLatestAnalysis();
  const protocol = analysis?.healing_protocol;
  const hasAnalysis = !!analysis;

  const goodFoods = protocol?.foodsToEat?.length ? protocol.foodsToEat : defaultGoodFoods;
  const badFoods = protocol?.foodsToAvoid?.length ? protocol.foodsToAvoid : defaultBadFoods;

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-sm text-primary font-medium mb-1">Nutrition</p>
        <h1 className="font-serif text-3xl md:text-4xl mb-2">Food as Medicine</h1>
        <p className="text-muted-foreground mb-8">
          {hasAnalysis ? "Personalized dietary guidance based on your skin analysis." : "What you eat directly affects inflammation, hormones, and skin healing."}
        </p>

        {!hasAnalysis && (
          <div className="card-elevated gradient-sage mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl mb-1">Get personalized nutrition advice</h2>
                <p className="text-sm text-muted-foreground">Complete a skin analysis to receive foods tailored to your condition.</p>
              </div>
              <Link to="/analysis" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0">
                Start Analysis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        <div className="space-y-8">
          <div className="card-elevated">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Leaf className="w-5 h-5 text-accent-foreground" />
              </div>
              <h2 className="font-serif text-xl">Best Foods for Your Skin</h2>
            </div>
            <div className="space-y-4">
              {goodFoods.map((f: FoodItem, i: number) => (
                <motion.div key={f.food} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{f.food}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.reason}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="card-elevated">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <X className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="font-serif text-xl">Foods to Avoid</h2>
            </div>
            <div className="space-y-4">
              {badFoods.map((f: FoodItem, i: number) => (
                <motion.div key={f.food} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                    <X className="w-3.5 h-3.5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{f.food}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.reason}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>This platform provides educational skin wellness insights and is not medical advice.</p>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
};

export default Nutrition;
