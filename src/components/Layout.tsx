import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, ScanFace, HeartPulse, Apple, Salad, Activity,
  TrendingUp, MessageCircle, Menu, X, UserCircle
} from "lucide-react";
import skinhealLogo from "@/assets/skinheal_logo.png";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: Home },
  { path: "/analysis", label: "Skin Analysis", icon: ScanFace },
  { path: "/protocol", label: "Healing Protocol", icon: HeartPulse },
  { path: "/nutrition", label: "Nutrition", icon: Apple },
  { path: "/gut-health", label: "Gut Health", icon: Salad },
  { path: "/lifestyle", label: "Lifestyle", icon: Activity },
  { path: "/progress", label: "Progress", icon: TrendingUp },
  { path: "/coach", label: "AI Coach", icon: MessageCircle },
  { path: "/profile", label: "Profile", icon: UserCircle },
];

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-[100dvh] bg-background overflow-x-hidden w-full max-w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/50 p-6 gap-2 fixed h-full">
        <Link to="/" className="flex items-center gap-2.5 mb-8 px-2">
          <img src={skinhealLogo} alt="SkinHeal" className="w-9 h-9 rounded-xl" />
          <span className="font-serif text-xl text-foreground">SkinHeal</span>
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="flex gap-3 px-3">
            <Link to="/privacy" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
          </div>
          <div className="px-3 py-4 rounded-xl bg-sage-light text-xs text-muted-foreground leading-relaxed">
            This platform provides educational skin wellness guidance and is not medical advice.
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-lg border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <img src={skinhealLogo} alt="SkinHeal" className="w-8 h-8 rounded-lg" />
          <span className="font-serif text-lg">SkinHeal</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2.5 rounded-xl hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-md pt-20 px-4"
          >
            <nav className="flex flex-col gap-1">
              {navItems.map((item, i) => {
                const isActive = location.pathname === item.path;
                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all min-h-[48px] ${
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 w-full min-w-0 overflow-x-hidden">
        <div className="max-w-5xl mx-auto px-4 py-5 sm:px-5 sm:py-8 lg:px-10 lg:py-12 min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
