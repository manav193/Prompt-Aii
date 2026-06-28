import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutGrid, Wand2, Store, History, Heart, CreditCard, Settings, LogOut, Sparkles, ArrowUpRight, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid, testid: "side-dashboard" },
  { to: "/generate", label: "Generate", icon: Wand2, testid: "side-generate" },
  { to: "/marketplace", label: "Promptlets", icon: Store, testid: "side-marketplace" },
  { to: "/history", label: "History", icon: History, testid: "side-history" },
  { to: "/saved", label: "Saved", icon: Heart, testid: "side-saved" },
  { to: "/billing", label: "Billing", icon: CreditCard, testid: "side-billing" },
  { to: "/settings", label: "Settings", icon: Settings, testid: "side-settings" },
];

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [resending, setResending] = useState(false);

  useEffect(() => {
    // close mobile sheet on route change (placeholder for future)
  }, [loc.pathname]);

  if (!user) return null;
  const initials = (user.name || user.email || "U").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const resendVerification = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-verification");
      toast.success("Verification link sent. Check your email (and your backend logs).");
    } catch (e) {
      toast.error("Couldn't resend right now. Try again later.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-[1280px] grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 px-4 py-6">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-6 lg:self-start glass rounded-2xl p-4 h-fit" data-testid="dashboard-sidebar">
          <Link to="/" className="flex items-center gap-2 px-2 py-1.5" data-testid="sidebar-logo">
            <span className="h-8 w-8 rounded-lg grid place-items-center"
                  style={{ background: "linear-gradient(180deg, rgba(0,229,255,0.25), rgba(59,130,246,0.15))", border: "1px solid rgba(0,229,255,0.35)" }}>
              <Sparkles className="h-4 w-4 text-cyan" />
            </span>
            <span className="font-display text-lg tracking-tight">Prompt<span className="text-cyan">AI</span></span>
          </Link>

          <nav className="mt-6 space-y-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/dashboard"}
                data-testid={n.testid}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-white/[0.06] border border-white/10 text-white"
                      : "text-[#94A3B8] hover:text-white hover:bg-white/[0.04] border border-transparent"
                  }`
                }
              >
                <n.icon className="h-4 w-4" />
                <span>{n.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 glass-strong rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full grid place-items-center font-display text-xs"
                   style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.25), rgba(59,130,246,0.25))", border: "1px solid rgba(0,229,255,0.35)" }}>
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-sm truncate" data-testid="sidebar-user-name">{user.name || user.email}</div>
                <div className="text-[11px] text-[#94A3B8] uppercase tracking-wider">
                  {user.subscription === "pro" ? "Pro plan" : "Free plan"}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-4 w-full btn-ghost-glass rounded-lg px-3 py-2 text-xs inline-flex items-center justify-center gap-2"
              data-testid="sidebar-logout"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </aside>

        {/* Content */}
        <section className="min-w-0">
          {!user.email_verified && (
            <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3 flex items-center gap-3 text-sm" data-testid="verify-banner">
              <AlertTriangle className="h-4 w-4 text-amber-300 shrink-0" />
              <span className="text-amber-100/90">Verify your email to keep your workspace secure.</span>
              <button onClick={resendVerification} disabled={resending} className="ml-auto text-amber-200 hover:text-white text-xs inline-flex items-center gap-1" data-testid="resend-verify">
                Resend link <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          )}
          {children}
        </section>
      </div>
    </div>
  );
}
