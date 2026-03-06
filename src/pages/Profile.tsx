import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, CreditCard, Heart, Bell, Shield, HelpCircle, LogOut, ChevronRight,
  Camera, Save, X, Trash2, Download, MessageSquare, ExternalLink
} from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useCurrentAnalysis } from "@/hooks/useCurrentAnalysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, updateProfile, notifications, updateNotifications, deleteAccount, isLoadingProfile } = useProfile();
  const { currentAnalysis } = useCurrentAnalysis();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editConcern, setEditConcern] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);

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
      toast({ title: "Profile updated" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  const handleToggle = async (key: "weekly_check_reminder" | "daily_plan_reminder" | "meal_reminder", value: boolean) => {
    try {
      await updateNotifications.mutateAsync({ [key]: value });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
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
      toast({ title: "Account data deleted" });
    } catch {
      toast({ title: "Failed to delete account", variant: "destructive" });
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
    toast({ title: "Feedback sent. Thank you!" });
  };

  const skinScore = currentAnalysis?.skin_score as any;
  const scoreValue = skinScore?.overall ?? skinScore?.score ?? null;

  return (
    <Layout>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={fadeUp}>
          <h1 className="text-3xl font-serif text-foreground">Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your account, preferences, and data.</p>
        </motion.div>

        {/* Section 1: User Information */}
        <motion.div variants={fadeUp}>
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                  <User className="w-5 h-5 text-accent-foreground" />
                </div>
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </div>
              {!editing && (
                <Button variant="ghost" size="sm" onClick={startEditing}>
                  Edit
                </Button>
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
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div>
                  <p className="font-medium text-foreground">Free Plan</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Core skin analysis and educational insights</p>
                </div>
                <span className="text-xs font-medium text-primary bg-accent px-3 py-1 rounded-full">Active</span>
              </div>
              <Button variant="outline" className="w-full justify-between" disabled>
                Upgrade to Premium <ChevronRight className="w-4 h-4" />
              </Button>
              <p className="text-xs text-muted-foreground text-center">Premium plan coming soon with weekly tracking, AI coaching, and personalized meal plans.</p>
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
                      <p className="text-3xl font-serif text-foreground">
                        {scoreValue != null ? `${scoreValue}/100` : "—"}
                      </p>
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

        {/* Section 4: Notification Settings */}
        <motion.div variants={fadeUp}>
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Bell className="w-5 h-5 text-accent-foreground" />
              </div>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ToggleRow
                label="Weekly Skin Check Reminder"
                description="Get reminded to upload your weekly progress photo"
                checked={notifications?.weekly_check_reminder ?? true}
                onCheckedChange={(v) => handleToggle("weekly_check_reminder", v)}
              />
              <ToggleRow
                label="Daily Healing Plan Reminder"
                description="Daily reminders for your healing checklist"
                checked={notifications?.daily_plan_reminder ?? true}
                onCheckedChange={(v) => handleToggle("daily_plan_reminder", v)}
              />
              <ToggleRow
                label="Meal Plan Reminder"
                description="Reminders for your nutrition plan"
                checked={notifications?.meal_reminder ?? true}
                onCheckedChange={(v) => handleToggle("meal_reminder", v)}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 5: Privacy & Data */}
        <motion.div variants={fadeUp}>
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent-foreground" />
              </div>
              <CardTitle className="text-lg">Privacy & Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-between" disabled>
                <span className="flex items-center gap-2"><Download className="w-4 h-4" /> Download My Data</span>
                <span className="text-xs text-muted-foreground">Coming soon</span>
              </Button>

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

        {/* Section 6: Support & Feedback */}
        <motion.div variants={fadeUp}>
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-accent-foreground" />
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
              <Button
                size="sm"
                onClick={handleSendFeedback}
                disabled={sendingFeedback || !feedbackText.trim()}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                {sendingFeedback ? "Sending..." : "Send Feedback"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 7: App Information */}
        <motion.div variants={fadeUp}>
          <Card className="card-elevated">
            <CardContent className="py-5 space-y-3">
              <InfoRow label="App Version" value="1.0.0" />
              <InfoRow label="Privacy Policy" value="Coming soon" />
              <InfoRow label="Terms of Service" value="Coming soon" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 8: Logout */}
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

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-foreground">{value}</span>
  </div>
);

const ToggleRow = ({
  label, description, checked, onCheckedChange
}: { label: string; description: string; checked: boolean; onCheckedChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

export default Profile;
