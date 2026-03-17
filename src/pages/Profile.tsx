import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, CreditCard, Heart, Shield, LogOut, ChevronRight,
  Save, X, Trash2, MessageSquare, Sparkles, FileText, RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useCurrentAnalysis } from "@/hooks/useCurrentAnalysis";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

import { supabase } from "@/lib/supabase";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const { profile, updateProfile, deleteAccount } = useProfile();
  const { currentAnalysis } = useCurrentAnalysis();
  const { isPremium, subscribed, subscriptionEnd, cancelAtPeriodEnd, startCheckout, openPricingModal, isCheckingOut, refreshSubscription, cancelSubscription, isCancelling, isLoading: isSubLoading } = useSubscription();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editConcern, setEditConcern] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle checkout success redirect — poll until subscription is active
  useEffect(() => {
    if (searchParams.get("checkout") !== "success") return;

    let attempts = 0;
    const maxAttempts = 15;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      await refreshSubscription();
      attempts++;
      if (attempts < maxAttempts && !cancelled) {
        setTimeout(poll, 3000);
      }
    };

    poll();

    return () => { cancelled = true; };
  }, [searchParams]);

  if (!user) {
    navigate("/auth");
    return null;
  }

  const startEditing = () => {
    setEditName(profile?.name || "");
    setEditAge(profile?.age_range || "");
    setEditConcern(profile?.skin_concern || "");
    setEditing(true);
  };

  const saveProfile = async () => {
    try {
      await updateProfile.mutateAsync({ name: editName, age_range: editAge || null, skin_concern: editConcern || null });
      setEditing(false);
    } catch {
      // silent fail
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      navigate("/");
    } catch {
      // silent fail
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    setSendingFeedback(true);
    await supabase.from("user_feedback").insert({
      user_id: user.id,
      context: "profile_feedback",
      feedback_text: feedbackText,
      helpful: null,
    });
    setSendingFeedback(false);
    setFeedbackText("");
  };

  const handleRefreshSubscription = async () => {
    setIsRefreshing(true);
    await refreshSubscription();
    setIsRefreshing(false);
    toast({
      title: "Subscription status refreshed",
      description: isPremium ? "Your premium subscription is active." : "No active premium subscription found.",
    });
  };

  const skinScore = currentAnalysis?.skin_score as any;
  const scoreValue = skinScore?.overall ?? skinScore?.score ?? null;

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );

  return (
    <Layout>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 min-w-0">
        {/* Header */}
        <motion.div variants={fadeUp}>
          <h1 className="text-3xl font-serif text-foreground">Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your account, subscription, and data.</p>
        </motion.div>

        {/* Section 1: User Information */}
        <motion.div variants={fadeUp}>
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                  <User className="w-5 h-5 text-accent-foreground" />
                </div>
                <CardTitle className="text-lg">Account Information</CardTitle>
              </div>
              {!editing && (
                <Button variant="ghost" size="sm" onClick={startEditing}>Edit</Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Name</label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <Input value={user.email || ""} disabled className="opacity-60" />
                    <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Age Range</label>
                    <Select value={editAge} onValueChange={setEditAge}>
                      <SelectTrigger><SelectValue placeholder="Select age range" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-18">Under 18</SelectItem>
                        <SelectItem value="18-24">18–24</SelectItem>
                        <SelectItem value="25-34">25–34</SelectItem>
                        <SelectItem value="35-44">35–44</SelectItem>
                        <SelectItem value="45-54">45–54</SelectItem>
                        <SelectItem value="55+">55+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Skin Concern Focus</label>
                    <Input value={editConcern} onChange={(e) => setEditConcern(e.target.value)} placeholder="e.g. Acne, Eczema, Rosacea..." />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={saveProfile} disabled={updateProfile.isPending}>
                      <Save className="w-4 h-4 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                      <X className="w-4 h-4 mr-1" /> Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <InfoRow label="Name" value={profile?.name || "—"} />
                  <InfoRow label="Email" value={user.email || "—"} />
                  <InfoRow label="Age Range" value={profile?.age_range || "Not set"} />
                  <InfoRow label="Skin Concern" value={profile?.skin_concern || "Not set"} />
                  <InfoRow label="Member Since" value={new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })} />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 2: Billing & Subscription */}
        <motion.div variants={fadeUp}>
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-accent-foreground" />
              </div>
              <CardTitle className="text-lg">Billing & Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-muted/50 min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground text-sm">
                    {isPremium ? "Premium Plan" : "Free Plan"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {isPremium && cancelAtPeriodEnd
                      ? `Cancelled — Access until ${subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}`
                      : isPremium
                        ? `Renews ${subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}`
                        : "Basic skin analysis and score"}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                  isPremium && cancelAtPeriodEnd
                    ? "bg-amber-100 text-amber-700"
                    : isPremium
                      ? "bg-primary/10 text-primary"
                      : "bg-accent text-accent-foreground"
                }`}>
                  {isSubLoading ? "Checking..." : isPremium && cancelAtPeriodEnd ? "Cancelled" : isPremium ? "✓ Active" : "Free"}
                </span>
              </div>

              {isPremium ? (
                <div className="space-y-3">
                  {cancelAtPeriodEnd ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-xs text-amber-700 font-medium">
                        Your subscription has been cancelled. You'll keep Premium access until {subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "the end of your billing period"}.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <Sparkles className="w-4 h-4 text-primary shrink-0" />
                      <p className="text-xs text-primary font-medium">Your premium subscription is active. All features unlocked!</p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={handleRefreshSubscription}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    {isRefreshing ? "Refreshing..." : "Refresh subscription status"}
                  </Button>

                  {/* Cancel subscription — only show if not already cancelled */}
                  {!cancelAtPeriodEnd && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-muted-foreground hover:text-destructive/70 text-xs"
                        >
                          Cancel Subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
                          <AlertDialogDescription>
                            You'll keep Premium access until{" "}
                            <span className="font-medium text-foreground">
                              {subscriptionEnd
                                ? new Date(subscriptionEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                                : "the end of your billing period"}
                            </span>
                            . After that your account will return to the free plan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-[#528164] text-white hover:bg-[#528164]/90 border-0">
                            Keep My Premium
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              const success = await cancelSubscription();
                              if (success) {
                                toast({
                                  title: "Subscription cancelled",
                                  description: `You'll keep Premium access until ${subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "the end of your billing period"}.`,
                                });
                              }
                            }}
                            disabled={isCancelling}
                            className="bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
                          >
                            {isCancelling ? "Cancelling..." : "Cancel Subscription"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ) : (
                <>
                  <Button className="w-full justify-between gap-2 bg-[#528164] hover:bg-[#528164]/90 text-white" onClick={openPricingModal} disabled={isCheckingOut || isSubLoading}>
                    <span className="flex items-center gap-2 min-w-0 truncate">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span className="truncate">{isCheckingOut ? "Loading..." : "Upgrade to Premium"}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2 text-muted-foreground"
                    onClick={handleRefreshSubscription}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    {isRefreshing ? "Checking..." : "Already paid? Refresh status"}
                  </Button>
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-medium text-foreground">Premium includes:</p>
                    <ul className="space-y-1.5">
                      {["Personalized Healing Protocol", "Nutrition & Meal Plans", "Gut Health Program", "Lifestyle Guidance", "AI Skin Coach", "Weekly Progress Insights"].map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Sparkles className="w-3 h-3 text-primary shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 3: Skin Profile Summary */}
        <motion.div variants={fadeUp}>
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Heart className="w-5 h-5 text-accent-foreground" />
              </div>
              <CardTitle className="text-lg">Skin Profile Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentAnalysis ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Skin Health Score</p>
                      <p className="text-3xl font-serif text-foreground">{scoreValue != null ? `${scoreValue}/100` : "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Last Scan</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(currentAnalysis.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/progress")}>
                    View Progress <ChevronRight className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No analysis yet.</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate("/analysis")}>
                    Start Your First Analysis
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 4: Privacy & Data */}
        <motion.div variants={fadeUp}>
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent-foreground" />
              </div>
              <CardTitle className="text-lg">Privacy & Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/privacy" className="w-full">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> Privacy Policy</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>

              <Link to="/terms" className="w-full">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Terms of Service</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-between text-destructive hover:text-destructive">
                    <span className="flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete Account</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Deleting your account will permanently remove all analyses, progress photos, and chat history. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 5: Support & Feedback */}
        <motion.div variants={fadeUp}>
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-accent-foreground" />
              </div>
              <CardTitle className="text-lg">Support & Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">What can we improve?</label>
                <Textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Share your thoughts, report a bug, or suggest a feature..."
                  className="resize-none h-24"
                />
              </div>
              <Button size="sm" onClick={handleSendFeedback} disabled={sendingFeedback || !feedbackText.trim()}>
                <MessageSquare className="w-4 h-4 mr-1" />
                {sendingFeedback ? "Sending..." : "Send Feedback"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 6: App Information */}
        <motion.div variants={fadeUp}>
          <Card className="card-elevated">
            <CardContent className="py-5 space-y-3">
              <InfoRow label="App Version" value="1.0.0" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 7: Logout */}
        <motion.div variants={fadeUp}>
          <Button
            variant="outline"
            className="w-full justify-center gap-2 text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" /> Log Out
          </Button>
        </motion.div>

        <div className="h-8" />
      </motion.div>
    </Layout>
  );
};

export default Profile;
