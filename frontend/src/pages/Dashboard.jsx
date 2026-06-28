import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, LogOut, Wand2, Layers, Gauge, CreditCard, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    await logout();
    nav("/", { replace: true });
  };

  if (!user) return null;

  const initials = (user.name || user.email || "U").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="relative min-h-screen bg-[#050816] text-white overflow-hidden" data-testid="dashboard-page">
      <AnimatedBackground />
      <div className="relative mx-auto max-w-6xl px-4 py-10">
        {/* Top bar */}
        <div className="glass rounded-2xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: "linear-gradient(180deg, rgba(0,229,255,0.25), rgba(59,130,246,0.15))", border: "1px solid rgba(0,229,255,0.35)" }}>
              <Sparkles className="h-4 w-4 text-cyan" />
            </span>
            <span className="font-display text-lg tracking-tight">Prompt<span className="text-cyan">AI</span></span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-[#94A3B8]">
              <span className="h-8 w-8 rounded-full grid place-items-center font-display text-xs"
                    style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.25), rgba(59,130,246,0.25))", border: "1px solid rgba(0,229,255,0.35)" }}>
                {initials}
              </span>
              <span className="text-white" data-testid="dashboard-user-email">{user.email}</span>
            </div>
            <button onClick={handleLogout} disabled={signingOut} className="btn-ghost-glass rounded-full px-3 py-2 text-sm inline-flex items-center gap-2" data-testid="dashboard-logout">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>

        {/* Welcome */}
        <div className="mt-10">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan">Welcome back</p>
          <h1 className="font-display mt-2 text-3xl sm:text-5xl font-semibold tracking-tighter" data-testid="dashboard-welcome">
            Hello, {user.name || user.email.split("@")[0]}.
          </h1>
          <p className="mt-3 text-[#94A3B8] max-w-2xl">
            Your prompt workspace is ready. We’ll plug in the full editor next — for now, here’s a preview of what’s coming.
          </p>
        </div>

        {/* Stat cards */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Wand2, label: "Prompts generated", value: "0", hint: "free tier · 50 / mo" },
            { icon: Layers, label: "Saved to library", value: "0", hint: "personal workspace" },
            { icon: Gauge, label: "A/B tests run", value: "0", hint: "available on Pro" },
            { icon: CreditCard, label: "Plan", value: "Free", hint: "upgrade anytime" },
          ].map((s, i) => (
            <div key={i} className="glass card-lift rounded-2xl p-6" data-testid={`dashboard-stat-${i}`}>
              <div className="h-10 w-10 rounded-lg grid place-items-center mb-4"
                   style={{ background: "rgba(0,229,255,0.10)", border: "1px solid rgba(0,229,255,0.25)" }}>
                <s.icon className="h-5 w-5 text-cyan" />
              </div>
              <div className="font-display text-3xl tracking-tighter">{s.value}</div>
              <div className="text-sm text-white/85">{s.label}</div>
              <div className="text-xs text-[#94A3B8] mt-1">{s.hint}</div>
            </div>
          ))}
        </div>

        {/* CTA strip */}
        <div className="mt-10 glass-strong rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glow-cyan">
          <div>
            <h2 className="font-display text-2xl tracking-tight">Unlock unlimited prompts and all models.</h2>
            <p className="text-[#94A3B8] mt-1 text-sm">Pro is $19/mo. Cancel anytime. Stripe checkout coming soon.</p>
          </div>
          <a href="/#pricing" className="btn-primary rounded-full px-5 py-3 text-sm font-semibold inline-flex items-center gap-2" data-testid="dashboard-upgrade">
            See plans <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
